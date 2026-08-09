import { NextRequest, NextResponse } from "next/server";
import { betaClosedJsonResponse, isBetaModeFromRequest } from "@/lib/beta";
import { SAMPLE_AUCTIONS } from "@/lib/data";
import {
  getClientContact,
  UNLOCK_CREDITS_COST,
  UNLOCK_PRICE_EUR,
} from "@/lib/client-contacts";
import { evaluateProContactMatch } from "@/lib/contact-match";
import {
  isAcceptSlotsFull,
  MAX_CONTACT_UNLOCKS_PER_REQUEST,
} from "@/lib/contact-slots";
import { canUnlockContacts } from "@/lib/level1-certification";
import { getProSession } from "@/lib/pro-auth";
import { isDemoPaymentAllowed } from "@/lib/payments";
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
    return NextResponse.json({ error: level1.reason }, { status: 403 });
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
        { error: match.reason, needsMatch: true },
        { status: 403 }
      );
    }
  }

  const unlockCount = await countContactUnlocksForAuction(auctionId);
  if (isAcceptSlotsFull(unlockCount)) {
    return NextResponse.json(
      {
        error: `Les ${MAX_CONTACT_UNLOCKS_PER_REQUEST} places de contact sont déjà prises pour cette demande.`,
        slotsFull: true,
        unlockCount,
        maxUnlocks: MAX_CONTACT_UNLOCKS_PER_REQUEST,
      },
      { status: 409 }
    );
  }

  const balance = await getProCreditBalance(session.proId);
  const needsCredits = balance < UNLOCK_CREDITS_COST;
  if (needsCredits && !(demo && isDemoPaymentAllowed())) {
    return NextResponse.json(
      {
        error: `Solde insuffisant. Il faut ${UNLOCK_CREDITS_COST} crédit (${UNLOCK_PRICE_EUR} €) pour une mise en contact.`,
        needsCredits: true,
        balance,
        requiredCredits: UNLOCK_CREDITS_COST,
      },
      { status: 402 }
    );
  }

  let spentCredits = 0;
  if (!needsCredits) {
    const spent = await spendProCredit({
      proId: session.proId,
      type: "spend_unlock",
      credits: UNLOCK_CREDITS_COST,
      auctionId,
      workRequestId: workRequest?.id,
      note: `Mise en contact client (${UNLOCK_CREDITS_COST} crédit · ${UNLOCK_PRICE_EUR} €)`,
    });
    if ("error" in spent) {
      return NextResponse.json(
        { error: spent.error, needsCredits: true, balance },
        { status: 402 }
      );
    }
    spentCredits = UNLOCK_CREDITS_COST;
  }

  const unlock = await addContactUnlock({
    proId: session.proId,
    auctionId,
    amountEur: UNLOCK_PRICE_EUR,
    workRequestId: workRequest?.id,
  });

  if ("error" in unlock) {
    if (spentCredits > 0) {
      await creditProWallet({
        proId: session.proId,
        type: "refund_unlock",
        amount: spentCredits,
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
    creditsSpent: spentCredits,
    balance: newBalance,
    demo: demo && needsCredits,
  });
}
