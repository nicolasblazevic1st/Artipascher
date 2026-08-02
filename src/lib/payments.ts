import Stripe from "stripe";
import { BID_FEE_EUR } from "./auctions";
import { UNLOCK_PRICE_EUR } from "./client-contacts";

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

export async function createContactUnlockCheckout(params: {
  proId: string;
  proEmail: string;
  auctionId: string;
  auctionTitle: string;
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
          unit_amount: UNLOCK_PRICE_EUR * 100,
          product_data: {
            name: "Accès coordonnées client",
            description: `Enchère : ${params.auctionTitle}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      proId: params.proId,
      auctionId: params.auctionId,
      type: "contact_unlock",
    },
    success_url: `${params.successUrl}?unlocked=1`,
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
