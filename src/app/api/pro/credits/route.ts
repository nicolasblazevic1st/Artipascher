import { NextRequest, NextResponse } from "next/server";
import { betaClosedJsonResponse, isBetaModeFromRequest } from "@/lib/beta";
import {
  createCreditPackCheckout,
  isDemoPaymentAllowed,
  isStripeConfigured,
} from "@/lib/payments";
import { getProSession } from "@/lib/pro-auth";
import {
  CONTACT_BALANCE_PACKS,
  CONTACT_UNLOCK_REF_EUR,
  getContactBalancePack,
  type ContactBalancePackSize,
} from "@/lib/store-types";
import {
  creditProWallet,
  getApprovedProById,
  getProCreditBalance,
  getProCreditTransactions,
} from "@/lib/store";
import { UNLOCK_PRICE_EUR } from "@/lib/client-contacts";
import { getSiteOrigin } from "@/lib/share";

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
    currency: "eur",
    unlockRefEur: CONTACT_UNLOCK_REF_EUR,
    unlockPriceEur: UNLOCK_PRICE_EUR,
    packs: CONTACT_BALANCE_PACKS,
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
    packSize = Number(body.packSize ?? body.creditEur);
    demo = body.demo === true;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const pack = getContactBalancePack(packSize);
  if (
    !pack ||
    !CONTACT_BALANCE_PACKS.some(
      (p) => p.creditEur === (packSize as ContactBalancePackSize)
    )
  ) {
    return NextResponse.json(
      {
        error: `Pack invalide. Choisissez parmi : ${CONTACT_BALANCE_PACKS.map((p) => p.creditEur).join(", ")} €.`,
      },
      { status: 400 }
    );
  }

  if (demo && isDemoPaymentAllowed()) {
    const result = await creditProWallet({
      proId: session.proId,
      type: "demo_grant",
      amount: pack.creditEur,
      note: `Pack démo solde ${pack.creditEur} €`,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      demo: true,
      balance: result.balance,
      credited: pack.creditEur,
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

  const compteUrl = `${getSiteOrigin(request)}/pro/compte`;

  const checkout = await createCreditPackCheckout({
    proId: session.proId,
    proEmail: session.email,
    packSize: pack.creditEur,
    successUrl: compteUrl,
    cancelUrl: compteUrl,
  });

  if (!checkout) {
    return NextResponse.json({ error: "Impossible de créer le paiement." }, { status: 500 });
  }

  return NextResponse.json({
    checkoutUrl: checkout.url,
    amountEur: pack.payEur,
    creditedEur: pack.creditEur,
    credits: pack.creditEur,
  });
}
