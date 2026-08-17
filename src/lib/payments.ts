import Stripe from "stripe";
import { BID_FEE_EUR } from "./auctions";
import { UNLOCK_PRICE_EUR } from "./client-contacts";
import {
  CONTACT_UNLOCK_REF_EUR,
  getContactBalancePack,
} from "./store-types";

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
            name: "Mise en contact client",
            description: `Offre : ${params.auctionTitle}`,
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

export async function createCreditPackCheckout(params: {
  proId: string;
  proEmail: string;
  /** Solde crédité en euros (ex. 60, 100, 200). */
  packSize: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const pack = getContactBalancePack(params.packSize);
  if (!pack) return null;
  const discount = Math.round((1 - pack.payEur / pack.creditEur) * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.proEmail,
    billing_address_collection: "auto",
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: pack.payEur * 100,
          product_data: {
            name: `Solde Nord Artisan Pro · ${pack.creditEur} €`,
            description:
              discount > 0
                ? `Tarif dégressif (−${discount} %) · mises en contact ${CONTACT_UNLOCK_REF_EUR - 5}–${CONTACT_UNLOCK_REF_EUR + 5} €`
                : `Solde pour mises en contact (${CONTACT_UNLOCK_REF_EUR - 5}–${CONTACT_UNLOCK_REF_EUR + 5} €)`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "credit_purchase",
      proId: params.proId,
      creditEur: String(pack.creditEur),
      packSize: String(pack.creditEur),
      priceEur: String(pack.payEur),
    },
    success_url: `${params.successUrl}?credits=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: params.cancelUrl,
  });

  if (!session.url) return null;
  return { url: session.url, sessionId: session.id };
}
