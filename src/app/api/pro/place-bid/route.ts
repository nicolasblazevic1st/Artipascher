import { NextRequest, NextResponse } from "next/server";
import {
  BID_FEE_EUR,
  computeCurrentPrice,
  validateBidAmount,
} from "@/lib/auctions";
import { checkBidEligibility } from "@/lib/bid-eligibility";
import { resolveAuction } from "@/lib/work-request-auctions";
import { getProSession } from "@/lib/pro-auth";
import {
  createBidCheckout,
  isDemoPaymentAllowed,
  isStripeConfigured,
} from "@/lib/payments";
import { addBid, countProBidsForAuction, getApprovedProById, getBidsForAuction } from "@/lib/store";

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

  async function registerBid(stripeSessionId?: string) {
    const bidsUsed = await countProBidsForAuction(session!.proId, auctionId);
    if (bidsUsed >= eligibility.maxBidsPerAuction) {
      throw new Error("BID_LIMIT_REACHED");
    }
    return addBid({
      auctionId,
      proId: session!.proId,
      companyName: pro!.companyName,
      amount,
      feeEur: BID_FEE_EUR,
      stripeSessionId,
    });
  }

  const origin = request.nextUrl.origin;
  const auctionUrl = `${origin}/encheres/${auctionId}`;

  if (demo && isDemoPaymentAllowed()) {
    try {
      const bid = await registerBid();
      return NextResponse.json({
        success: true,
        demo: true,
        bid,
        currentPrice: amount,
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

  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error: "Paiement Stripe non configuré. En développement, utilisez le mode démo.",
        stripeRequired: true,
      },
      { status: 503 }
    );
  }

  const checkout = await createBidCheckout({
    proId: session.proId,
    proEmail: session.email,
    auctionId,
    auctionTitle: auction.title,
    bidAmount: amount,
    successUrl: auctionUrl,
    cancelUrl: auctionUrl,
  });

  if (!checkout) {
    return NextResponse.json({ error: "Impossible de créer le paiement." }, { status: 500 });
  }

  return NextResponse.json({ checkoutUrl: checkout.url, feeEur: BID_FEE_EUR });
}
