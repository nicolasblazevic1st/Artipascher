import { NextResponse } from "next/server";
import { isDemoPaymentAllowed, isStripeConfigured } from "@/lib/payments";
import { getProSession } from "@/lib/pro-auth";
import { CONTACT_UNLOCK_REF_EUR } from "@/lib/store-types";
import {
  getProCreditBalance,
  getProCreditTransactions,
} from "@/lib/store";
import { PRICING_TIERS } from "@/lib/pricing-tiers";
import { UNLOCK_PRICE_EUR } from "@/lib/client-contacts";

/** Consultation du solde résiduel (parrainage / ancien solde) — plus d’achat de packs. */
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
    unlockTickets: PRICING_TIERS.map((t) => ({
      id: t.id,
      label: t.label,
      unlockPriceEur: t.unlockPriceEur,
    })),
    packs: [],
    packPurchaseEnabled: false,
    transactions: transactions.slice(0, 50),
    demoAllowed: isDemoPaymentAllowed(),
    stripeConfigured: isStripeConfigured(),
  });
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        "L’achat de packs de solde n’est plus proposé. Payez la mise en contact au ticket du chantier lors du déblocage.",
      packPurchaseEnabled: false,
    },
    { status: 410 }
  );
}
