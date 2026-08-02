import { NextRequest, NextResponse } from "next/server";
import {
  BID_FEE_EUR,
  computeCurrentPrice,
  validateBidAmount,
} from "@/lib/auctions";
import { resolveAuction } from "@/lib/work-request-auctions";
import { getProSession } from "@/lib/pro-auth";
import {
  createBidCheckout,
  isDemoPaymentAllowed,
  isStripeConfigured,
} from "@/lib/payments";
import { addBid, getApprovedProById, getBidsForAuction } from "@/lib/store";

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

  const existingBids = await getBidsForAuction(auctionId);
  const currentPrice = computeCurrentPrice(
    auction.startPrice,
    existingBids.map((b) => b.amount)
  );

  const amountError = validateBidAmount(amount, currentPrice);
  if (amountError) {
    return NextResponse.json({ error: amountError }, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  const auctionUrl = `${origin}/encheres/${auctionId}`;

  async function registerBid(stripeSessionId?: string) {
    return addBid({
      auctionId,
      proId: session!.proId,
      companyName: pro!.companyName,
      amount,
      feeEur: BID_FEE_EUR,
      stripeSessionId,
    });
  }

  if (demo && isDemoPaymentAllowed()) {
    const bid = await registerBid();
    return NextResponse.json({
      success: true,
      demo: true,
      bid,
      currentPrice: amount,
    });
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
