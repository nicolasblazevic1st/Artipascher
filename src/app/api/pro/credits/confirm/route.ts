import { NextRequest, NextResponse } from "next/server";
import { fulfillCreditPurchaseSession } from "@/lib/credit-purchase";
import { getStripe } from "@/lib/payments";
import { getProSession } from "@/lib/pro-auth";

/**
 * Filet de sécurité si le webhook Stripe n'a pas pu joindre le serveur
 * (ex. staging IP-lock). Le client rappelle avec session_id au retour Checkout.
 */
export async function POST(request: NextRequest) {
  const proSession = await getProSession();
  if (!proSession) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe non configuré." }, { status: 503 });
  }

  let sessionId = "";
  try {
    const body = await request.json();
    sessionId = String(body.sessionId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "session_id invalide." }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    return NextResponse.json(
      { error: "Paiement non confirmé.", paymentStatus: session.payment_status },
      { status: 402 }
    );
  }

  if (session.metadata?.proId !== proSession.proId) {
    return NextResponse.json({ error: "Session non associée à ce compte." }, { status: 403 });
  }

  const result = await fulfillCreditPurchaseSession(session);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    balance: result.balance,
    credited: result.credited,
    alreadyApplied: result.alreadyApplied,
  });
}
