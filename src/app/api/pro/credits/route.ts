import { NextRequest, NextResponse } from "next/server";
import { betaClosedJsonResponse, isBetaModeFromRequest } from "@/lib/beta";
import {
  createCreditPackCheckout,
  isDemoPaymentAllowed,
  isStripeConfigured,
} from "@/lib/payments";
import { getProSession } from "@/lib/pro-auth";
import {
  CREDIT_PACKS,
  CREDIT_PRICE_EUR,
  getCreditPack,
  type CreditPackSize,
} from "@/lib/store-types";
import {
  creditProWallet,
  getApprovedProById,
  getProCreditBalance,
  getProCreditTransactions,
} from "@/lib/store";
import { UNLOCK_CREDITS_COST, UNLOCK_PRICE_EUR } from "@/lib/client-contacts";

export async function GET() {
  const session = await getProSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const [balance, transactions] = await Promise.all([
    getProCreditBalance(session.proId),
    getProCreditTransactions(session.proId),
  ]);

  return NextResponse.json({
    balance,
    creditPriceEur: CREDIT_PRICE_EUR,
    unlockCreditsCost: UNLOCK_CREDITS_COST,
    unlockPriceEur: UNLOCK_PRICE_EUR,
    packs: CREDIT_PACKS,
    transactions: transactions.slice(0, 50),
    demoAllowed: isDemoPaymentAllowed(),
    stripeConfigured: isStripeConfigured(),
  });
}

export async function POST(request: NextRequest) {
  if (isBetaModeFromRequest(request)) return betaClosedJsonResponse();

  const session = await getProSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const pro = await getApprovedProById(session.proId);
  if (!pro) {
    return NextResponse.json({ error: "Compte non approuvé." }, { status: 403 });
  }

  let packSize: number;
  let demo = false;

  try {
    const body = await request.json();
    packSize = Number(body.packSize);
    demo = body.demo === true;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const pack = getCreditPack(packSize);
  if (!pack || !CREDIT_PACKS.some((p) => p.credits === (packSize as CreditPackSize))) {
    return NextResponse.json(
      {
        error: `Pack invalide. Choisissez parmi : ${CREDIT_PACKS.map((p) => p.credits).join(", ")}.`,
      },
      { status: 400 }
    );
  }

  if (demo && isDemoPaymentAllowed()) {
    const result = await creditProWallet({
      proId: session.proId,
      type: "demo_grant",
      amount: pack.credits,
      note: `Pack démo ${pack.credits} crédits`,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      demo: true,
      balance: result.balance,
      credited: pack.credits,
    });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error: "Stripe non configuré. En développement, utilisez le mode démo.",
        stripeRequired: true,
      },
      { status: 503 }
    );
  }

  const origin = request.nextUrl.origin;
  const compteUrl = `${origin}/pro/compte`;

  const checkout = await createCreditPackCheckout({
    proId: session.proId,
    proEmail: session.email,
    packSize: pack.credits,
    successUrl: compteUrl,
    cancelUrl: compteUrl,
  });

  if (!checkout) {
    return NextResponse.json({ error: "Impossible de créer le paiement." }, { status: 500 });
  }

  return NextResponse.json({
    checkoutUrl: checkout.url,
    amountEur: pack.priceEur,
    credits: pack.credits,
  });
}
