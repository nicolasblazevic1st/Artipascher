import { NextRequest, NextResponse } from "next/server";
import { SAMPLE_AUCTIONS } from "@/lib/data";
import { getClientContact, UNLOCK_PRICE_EUR } from "@/lib/client-contacts";
import { getProSession } from "@/lib/pro-auth";
import {
  createContactUnlockCheckout,
  isDemoPaymentAllowed,
  isStripeConfigured,
} from "@/lib/payments";
import { addContactUnlock, hasContactUnlock } from "@/lib/store";

export async function POST(request: NextRequest) {
  const session = await getProSession();
  if (!session) {
    return NextResponse.json(
      { error: "Connectez-vous avec votre compte pro approuvé." },
      { status: 401 }
    );
  }

  let auctionId: string;
  let demo = false;

  try {
    const body = await request.json();
    auctionId = body.auctionId ?? "";
    demo = body.demo === true;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const auction = SAMPLE_AUCTIONS.find((a) => a.id === auctionId);
  const contact = getClientContact(auctionId);

  if (!auction || !contact) {
    return NextResponse.json({ error: "Enchère introuvable." }, { status: 404 });
  }

  if (await hasContactUnlock(session.proId, auctionId)) {
    return NextResponse.json({ alreadyUnlocked: true });
  }

  const origin = request.nextUrl.origin;
  const auctionUrl = `${origin}/encheres/${auctionId}`;

  if (demo && isDemoPaymentAllowed()) {
    await addContactUnlock({
      proId: session.proId,
      auctionId,
      amountEur: UNLOCK_PRICE_EUR,
    });
    return NextResponse.json({ unlocked: true, demo: true });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Paiement Stripe non configuré. En développement, utilisez le mode démo.",
        stripeRequired: true,
      },
      { status: 503 }
    );
  }

  const checkout = await createContactUnlockCheckout({
    proId: session.proId,
    proEmail: session.email,
    auctionId,
    auctionTitle: auction.title,
    successUrl: auctionUrl,
    cancelUrl: auctionUrl,
  });

  if (!checkout) {
    return NextResponse.json({ error: "Impossible de créer le paiement." }, { status: 500 });
  }

  return NextResponse.json({ checkoutUrl: checkout.url });
}
