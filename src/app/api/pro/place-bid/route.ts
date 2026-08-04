import { NextRequest, NextResponse } from "next/server";
import {
  BID_FEE_EUR,
  computeCurrentPrice,
  validateBidAmount,
} from "@/lib/auctions";
import { checkBidEligibility } from "@/lib/bid-eligibility";
import { resolveAuction } from "@/lib/work-request-auctions";
import { getProSession } from "@/lib/pro-auth";
import { isDemoPaymentAllowed } from "@/lib/payments";
import {
  addBid,
  countProBidsForAuction,
  getApprovedProById,
  getBidsForAuction,
  getProCreditBalance,
  spendProCredit,
} from "@/lib/store";

export async function POST(request: NextRequest) {
  const session = await getProSession();
  if (!session) {
    return NextResponse.json(
      { error: "Connectez-vous avec votre compte pro approuvé." },
      { status: 401 }
    );
  }

  const pro = await getApprovedProById(session.proId);
  if (!pro) {
    return NextResponse.json(
      { error: "Compte pro non approuvé par l'administration." },
      { status: 403 }
    );
  }

  let auctionId: string;
  let amount: number;
  let demo = false;

  try {
    const body = await request.json();
    auctionId = body.auctionId ?? "";
    amount = Number(body.amount);
    demo = body.demo === true;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const auction = await resolveAuction(auctionId);
  if (!auction || auction.status !== "active") {
    return NextResponse.json({ error: "Enchère introuvable ou terminée." }, { status: 404 });
  }

  if (auction.startPrice == null) {
    return NextResponse.json(
      {
        error:
          "Le prix de départ n'est pas encore fixé. Il sera défini au premier devis validé par l'administration.",
      },
      { status: 403 }
    );
  }

  const existingBids = await getBidsForAuction(auctionId);
  const currentPrice = computeCurrentPrice(
    auction.startPrice,
    existingBids.map((b) => b.amount)
  )!;

  const amountError = validateBidAmount(amount, currentPrice);
  if (amountError) {
    return NextResponse.json({ error: amountError }, { status: 400 });
  }

  const eligibility = await checkBidEligibility(session.proId, auctionId, amount);
  if (!eligibility.canBid) {
    return NextResponse.json(
      {
        error: eligibility.reason ?? "Devis requis avant d'enchérir.",
        requiresQuote: eligibility.requiresQuote,
        quote: eligibility.quote,
        maxBidsPerAuction: eligibility.maxBidsPerAuction,
        bidsUsed: eligibility.bidsUsed,
        bidsRemaining: eligibility.bidsRemaining,
      },
      { status: 403 }
    );
  }

  const balance = await getProCreditBalance(session.proId);
  const canSpend = balance >= 1;
  const allowDemoWithoutCredit = demo && isDemoPaymentAllowed() && !canSpend;

  if (!canSpend && !allowDemoWithoutCredit) {
    return NextResponse.json(
      {
        error:
          "Solde insuffisant. Achetez des crédits (1 crédit = 1 €) dans Mon compte pour enchérir.",
        needsCredits: true,
        balance,
      },
      { status: 402 }
    );
  }

  if (canSpend) {
    const spent = await spendProCredit({
      proId: session.proId,
      type: "spend_bid",
      auctionId,
      note: `Enchère ${amount} €`,
    });
    if ("error" in spent) {
      return NextResponse.json(
        { error: spent.error, needsCredits: true, balance },
        { status: 402 }
      );
    }
  }

  try {
    const bidsUsed = await countProBidsForAuction(session.proId, auctionId);
    if (bidsUsed >= eligibility.maxBidsPerAuction) {
      return NextResponse.json(
        {
          error: `Vous avez utilisé vos ${eligibility.maxBidsPerAuction} enchères sur ce chantier.`,
          bidsUsed: eligibility.maxBidsPerAuction,
          bidsRemaining: 0,
        },
        { status: 403 }
      );
    }

    const bid = await addBid({
      auctionId,
      proId: session.proId,
      companyName: pro.companyName,
      amount,
      feeEur: BID_FEE_EUR,
    });

    const newBalance = await getProCreditBalance(session.proId);
    return NextResponse.json({
      success: true,
      bid,
      currentPrice: amount,
      creditsSpent: canSpend ? 1 : 0,
      balance: newBalance,
      demo: allowDemoWithoutCredit,
      bidsUsed: eligibility.bidsUsed + 1,
      bidsRemaining: Math.max(0, eligibility.bidsRemaining - 1),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "BID_LIMIT_REACHED") {
      return NextResponse.json(
        {
          error: `Vous avez utilisé vos ${eligibility.maxBidsPerAuction} enchères sur ce chantier.`,
          bidsUsed: eligibility.maxBidsPerAuction,
          bidsRemaining: 0,
        },
        { status: 403 }
      );
    }
    throw err;
  }
}
