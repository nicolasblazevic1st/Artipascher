import { NextRequest, NextResponse } from "next/server";
import { betaClosedJsonResponse, isBetaModeFromRequest } from "@/lib/beta";
import { SAMPLE_AUCTIONS } from "@/lib/data";
import { getClientContact } from "@/lib/client-contacts";
import { evaluateProContactMatch } from "@/lib/contact-match";
import {
  isAcceptSlotsFull,
  resolveMaxContactArtisans,
} from "@/lib/contact-slots";
import { canUnlockContacts } from "@/lib/level1-certification";
import {
  formatUnlockPriceEur,
  resolveUnlockPricing,
} from "@/lib/pricing-tiers";
import { getProSession } from "@/lib/pro-auth";
import {
  createContactUnlockCheckout,
  isDemoPaymentAllowed,
  isStripeConfigured,
} from "@/lib/payments";
import { getSiteOrigin } from "@/lib/share";
import {
  addContactUnlock,
  countContactUnlocksForAuction,
  creditProWallet,
  getApprovedProById,
  getProCreditBalance,
  hasContactUnlock,
  readStore,
  spendProCredit,
} from "@/lib/store";
import { getWorkRequestByAuctionId } from "@/lib/work-request-auctions";

export async function POST(request: NextRequest) {
  if (isBetaModeFromRequest(request)) return betaClosedJsonResponse();

  const session = await getProSession();
  if (!session) {
    return NextResponse.json(
      { error: "Connectez-vous avec votre compte pro approuvé." },
      { status: 401 }
    );
  }

  let auctionId: string;
  let demo = false;

  try {
    const body = await request.json();
    auctionId = body.auctionId ?? "";
    demo = body.demo === true;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const sampleAuction = SAMPLE_AUCTIONS.find((a) => a.id === auctionId);
  const sampleContact = getClientContact(auctionId);
  const workRequest = await getWorkRequestByAuctionId(auctionId);

  if ((!sampleAuction || !sampleContact) && !workRequest) {
    return NextResponse.json({ error: "Chantier introuvable." }, { status: 404 });
  }

  const pro = await getApprovedProById(session.proId);
  if (!pro) {
    return NextResponse.json(
      { error: "Compte pro introuvable ou non approuvé." },
      { status: 403 }
    );
  }

  const level1 = canUnlockContacts(pro);
  if (!level1.ok) {
    return NextResponse.json(
      {
        error:
          "Votre compte n’est pas prêt à contacter un client. Complétez votre dossier.",
        needsAccountSetup: true,
      },
      { status: 403 }
    );
  }

  if (await hasContactUnlock(session.proId, auctionId)) {
    return NextResponse.json({ alreadyUnlocked: true });
  }

  if (workRequest) {
    const store = await readStore();
    const client =
      (workRequest.clientId
        ? store.clientAccounts.find((c) => c.id === workRequest.clientId)
        : undefined) ??
      store.clientAccounts.find(
        (c) => c.email.toLowerCase() === workRequest.email.toLowerCase()
      );
    if (client?.blockedFromContact) {
      return NextResponse.json(
        {
          error:
            "Ce client n’accepte plus de nouveaux contacts (compte restreint).",
        },
        { status: 403 }
      );
    }

    const match = await evaluateProContactMatch(pro, workRequest);
    if (!match.ok) {
      return NextResponse.json(
        {
          error: "Vous ne répondez pas à une des exigences du client.",
          needsMatch: true,
        },
        { status: 403 }
      );
    }
  }

  const unlockCount = await countContactUnlocksForAuction(auctionId);
  const maxUnlocks = resolveMaxContactArtisans(workRequest);
  if (isAcceptSlotsFull(unlockCount, maxUnlocks)) {
    return NextResponse.json(
      {
        error: `Les ${maxUnlocks} places de contact sont déjà prises pour cette demande.`,
        slotsFull: true,
        unlockCount,
        maxUnlocks,
      },
      { status: 409 }
    );
  }

  const pricing = resolveUnlockPricing({
    pricingTier: workRequest?.pricingTier,
    workOptionId: workRequest?.workOptionId,
  });
  const unlockPriceEur = pricing.unlockPriceEur;
  const priceLabel = formatUnlockPriceEur(unlockPriceEur);

  const balance = await getProCreditBalance(session.proId);
  const canPayWithBalance = balance + 0.0001 >= unlockPriceEur;
  const demoUnlock = demo && isDemoPaymentAllowed();

  // Paiement unitaire Stripe si pas assez de solde résiduel (ancien solde).
  if (!canPayWithBalance && !demoUnlock) {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        {
          error:
            "Paiement indisponible. Stripe n’est pas configuré. En développement, utilisez le mode démo.",
          stripeRequired: true,
          unlockPriceEur,
        },
        { status: 503 }
      );
    }

    const auctionTitle =
      workRequest?.category ??
      sampleAuction?.title ??
      "Demande de travaux";
    const origin = getSiteOrigin(request);
    const returnUrl = `${origin}/pro/encheres/${auctionId}`;

    const checkout = await createContactUnlockCheckout({
      proId: session.proId,
      proEmail: session.email,
      auctionId,
      auctionTitle,
      unlockPriceEur,
      pricingTier: pricing.tier,
      workRequestId: workRequest?.id,
      successUrl: returnUrl,
      cancelUrl: returnUrl,
    });

    if (!checkout) {
      return NextResponse.json(
        { error: "Impossible de créer le paiement." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      checkoutUrl: checkout.url,
      unlockPriceEur,
      pricingTier: pricing.tier,
    });
  }

  let spentEur = 0;
  if (canPayWithBalance) {
    const spent = await spendProCredit({
      proId: session.proId,
      type: "spend_unlock",
      amountEur: unlockPriceEur,
      auctionId,
      workRequestId: workRequest?.id,
      note: `Mise en contact client (${pricing.tier} · ${priceLabel})`,
    });
    if ("error" in spent) {
      return NextResponse.json(
        { error: spent.error, balance },
        { status: 402 }
      );
    }
    spentEur = unlockPriceEur;
  }

  const unlock = await addContactUnlock({
    proId: session.proId,
    auctionId,
    amountEur: unlockPriceEur,
    workRequestId: workRequest?.id,
  });

  if ("error" in unlock) {
    if (spentEur > 0) {
      await creditProWallet({
        proId: session.proId,
        type: "refund_unlock",
        amount: spentEur,
        auctionId,
        workRequestId: workRequest?.id,
        note: "Remboursement — places de contact déjà prises",
      });
    }
    return NextResponse.json(
      { error: unlock.error, slotsFull: true },
      { status: 409 }
    );
  }

  const newBalance = await getProCreditBalance(session.proId);
  return NextResponse.json({
    unlocked: true,
    amountSpentEur: spentEur,
    unlockPriceEur,
    pricingTier: pricing.tier,
    balance: newBalance,
    demo: demoUnlock,
  });
}
