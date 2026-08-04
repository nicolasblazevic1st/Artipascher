import { NextRequest, NextResponse } from "next/server";
import { SAMPLE_AUCTIONS } from "@/lib/data";
import { getClientContact, UNLOCK_PRICE_EUR } from "@/lib/client-contacts";
import { canUnlockContacts } from "@/lib/level1-certification";
import { getProSession } from "@/lib/pro-auth";
import { isDemoPaymentAllowed } from "@/lib/payments";
import {
  addContactUnlock,
  getAcceptedContactRequest,
  getApprovedProById,
  getProCreditBalance,
  hasContactUnlock,
  spendProCredit,
} from "@/lib/store";
import { getWorkRequestByAuctionId } from "@/lib/work-request-auctions";

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: "Enchère introuvable." }, { status: 404 });
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

  if (workRequest && !sampleAuction) {
    const accepted = await getAcceptedContactRequest(session.proId, auctionId);
    if (!accepted) {
      return NextResponse.json(
        {
          error:
            "Le client doit d'abord accepter votre demande « Je suis intéressé » avant le déblocage des coordonnées.",
          needsInterestAcceptance: true,
        },
        { status: 403 }
      );
    }
  }

  const balance = await getProCreditBalance(session.proId);
  if (balance < 1) {
    if (demo && isDemoPaymentAllowed()) {
      // Mode démo : on laisse passer sans crédit pour faciliter les tests locaux
      // uniquement si explicitement demandé — sinon demander d'acheter.
    } else {
      return NextResponse.json(
        {
          error:
            "Solde insuffisant. Achetez des crédits (1 crédit = 1 €) dans Mon compte.",
          needsCredits: true,
          balance,
        },
        { status: 402 }
      );
    }
  }

  if (balance >= 1) {
    const spent = await spendProCredit({
      proId: session.proId,
      type: "spend_unlock",
      auctionId,
      workRequestId: workRequest?.id,
      note: "Déblocage coordonnées client",
    });
    if ("error" in spent) {
      return NextResponse.json(
        { error: spent.error, needsCredits: true, balance },
        { status: 402 }
      );
    }
  } else if (!(demo && isDemoPaymentAllowed())) {
    return NextResponse.json(
      {
        error: "Solde insuffisant. Achetez des crédits dans Mon compte.",
        needsCredits: true,
        balance,
      },
      { status: 402 }
    );
  }

  await addContactUnlock({
    proId: session.proId,
    auctionId,
    amountEur: UNLOCK_PRICE_EUR,
  });

  const newBalance = await getProCreditBalance(session.proId);
  return NextResponse.json({
    unlocked: true,
    creditsSpent: balance >= 1 ? 1 : 0,
    balance: newBalance,
    demo: demo && balance < 1,
  });
}
