import Stripe from "stripe";
import { BID_FEE_EUR } from "./auctions";
import { formatUnlockPriceEur } from "./pricing-tiers";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isDemoPaymentAllowed(): boolean {
  return process.env.PAYMENT_MODE === "demo" || process.env.NODE_ENV === "development";
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

/** Paiement unitaire d’une mise en contact (ticket du chantier). */
export async function createContactUnlockCheckout(params: {
  proId: string;
  proEmail: string;
  auctionId: string;
  auctionTitle: string;
  unlockPriceEur: number;
  pricingTier?: string;
  workRequestId?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const amountCents = Math.round(params.unlockPriceEur * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) return null;

  const priceLabel = formatUnlockPriceEur(params.unlockPriceEur);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.proEmail,
    billing_address_collection: "auto",
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: amountCents,
          product_data: {
            name: `Mise en contact client · ${priceLabel}`,
            description: `Offre : ${params.auctionTitle}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "contact_unlock",
      proId: params.proId,
      auctionId: params.auctionId,
      amountEur: String(params.unlockPriceEur),
      ...(params.pricingTier ? { pricingTier: params.pricingTier } : {}),
      ...(params.workRequestId
        ? { workRequestId: params.workRequestId }
        : {}),
    },
    success_url: `${params.successUrl}?unlocked=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: params.cancelUrl,
  });

  if (!session.url) return null;
  return { url: session.url, sessionId: session.id };
}

export async function createBidCheckout(params: {
  proId: string;
  proEmail: string;
  auctionId: string;
  auctionTitle: string;
  bidAmount: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.proEmail,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: BID_FEE_EUR * 100,
          product_data: {
            name: "Frais de mise d'enchère",
            description: `${params.bidAmount} € — ${params.auctionTitle}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "auction_bid",
      proId: params.proId,
      auctionId: params.auctionId,
      bidAmount: String(params.bidAmount),
    },
    success_url: `${params.successUrl}?bid=success`,
    cancel_url: params.cancelUrl,
  });

  if (!session.url) return null;
  return { url: session.url, sessionId: session.id };
}
