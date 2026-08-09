import { NextRequest, NextResponse } from "next/server";
import { UNLOCK_PRICE_EUR } from "@/lib/client-contacts";
import { BID_FEE_EUR, MAX_BIDS_PER_AUCTION } from "@/lib/auctions";
import { getStripe } from "@/lib/payments";
import {
  addBid,
  addContactUnlock,
  countProBidsForAuction,
  creditProWallet,
  getApprovedProById,
} from "@/lib/store";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe non configuré." }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (
      session.metadata?.type === "credit_purchase" &&
      session.metadata.proId &&
      session.metadata.packSize
    ) {
      const packSize = Number(session.metadata.packSize);
      if (Number.isFinite(packSize) && packSize > 0) {
        await creditProWallet({
          proId: session.metadata.proId,
          type: "purchase",
          amount: packSize,
          stripeSessionId: session.id,
          note: `Achat pack ${packSize} crédits`,
        });
      }
    }

    // Legacy: paiements à l'acte (avant crédits) — encore honorés si reçus.
    if (
      session.metadata?.type === "contact_unlock" &&
      session.metadata.proId &&
      session.metadata.auctionId
    ) {
      const unlock = await addContactUnlock({
        proId: session.metadata.proId,
        auctionId: session.metadata.auctionId,
        amountEur: UNLOCK_PRICE_EUR,
        stripeSessionId: session.id,
      });
      if ("error" in unlock) {
        console.error("[stripe] contact_unlock slot full", unlock.error);
      }
    }

    if (
      session.metadata?.type === "auction_bid" &&
      session.metadata.proId &&
      session.metadata.auctionId &&
      session.metadata.bidAmount
    ) {
      const pro = await getApprovedProById(session.metadata.proId);
      if (pro) {
        const bidsUsed = await countProBidsForAuction(
          session.metadata.proId,
          session.metadata.auctionId
        );
        if (bidsUsed < MAX_BIDS_PER_AUCTION) {
          await addBid({
            auctionId: session.metadata.auctionId,
            proId: session.metadata.proId,
            companyName: pro.companyName,
            amount: Number(session.metadata.bidAmount),
            feeEur: BID_FEE_EUR,
            stripeSessionId: session.id,
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
