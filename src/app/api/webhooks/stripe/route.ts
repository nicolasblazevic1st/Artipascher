import { NextRequest, NextResponse } from "next/server";
import { UNLOCK_PRICE_EUR } from "@/lib/client-contacts";
import { BID_FEE_EUR, MAX_BIDS_PER_AUCTION } from "@/lib/auctions";
import {
  buildKbisVerificationRecord,
  proNeedsKbisPurchaseGate,
  purchaseAndVerifyKbis,
} from "@/lib/kbis-purchase";
import { evaluatePaymentNameCheck } from "@/lib/payment-identity";
import {
  getStripe,
  paymentIntentIdFromCheckoutSession,
  refundCreditPurchaseKeepingVerificationFee,
} from "@/lib/payments";
import { KBIS_VERIFICATION_FEE_CENTS } from "@/lib/store-types";
import {
  addBid,
  addContactUnlock,
  countProBidsForAuction,
  creditProWallet,
  getApprovedProById,
  getProRegistrationById,
  updateProRegistration,
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
      const priceEur = Number(session.metadata.priceEur);
      if (Number.isFinite(packSize) && packSize > 0) {
        const proId = session.metadata.proId;
        const pro = await getProRegistrationById(proId);

        // Idempotence : session déjà traitée en échec Kbis → ne pas re-rembourser / créditer.
        if (
          pro?.kbisPurchaseVerification?.stripeSessionId === session.id &&
          pro.kbisPurchaseVerification.status === "failed"
        ) {
          console.info("[stripe] kbis gate already failed for session", session.id);
          return NextResponse.json({ received: true });
        }

        const needsGate = !pro || proNeedsKbisPurchaseGate(pro);

        if (needsGate && pro) {
          // Session déjà passée OK sur ce même paiement (retry webhook).
          const alreadyPassedThisSession =
            pro.kbisPurchaseVerification?.stripeSessionId === session.id &&
            pro.kbisPurchaseVerification.status === "passed";

          if (!alreadyPassedThisSession) {
            const verify = await purchaseAndVerifyKbis(pro);

            if (!verify.ok) {
              const amountTotalCents =
                session.amount_total ??
                (Number.isFinite(priceEur) ? Math.round(priceEur * 100) : 0);
              const paymentIntentId = paymentIntentIdFromCheckoutSession(session);

              let refundedCents: number | undefined;
              let stripeRefundId: string | undefined;
              let failReason = verify.reason ?? "Vérification d'identité refusée.";

              if (!paymentIntentId || amountTotalCents < KBIS_VERIFICATION_FEE_CENTS) {
                failReason = `${failReason} (remboursement automatique impossible — contacter le support)`;
                console.error(
                  "[stripe] kbis fail without refundable payment",
                  session.id,
                  paymentIntentId,
                  amountTotalCents
                );
              } else {
                const refund = await refundCreditPurchaseKeepingVerificationFee({
                  paymentIntentId,
                  amountTotalCents,
                  feeCents: KBIS_VERIFICATION_FEE_CENTS,
                  stripeSessionId: session.id,
                  proId,
                });
                if ("error" in refund) {
                  failReason = `${failReason} (remboursement Stripe en échec : ${refund.error})`;
                  console.error("[stripe] kbis refund error", session.id, refund.error);
                } else {
                  refundedCents = refund.refundedCents;
                  stripeRefundId = refund.refundId;
                  console.warn(
                    "[stripe] kbis verification failed — partial refund",
                    proId,
                    refundedCents,
                    "cents"
                  );
                }
              }

              await updateProRegistration(proId, {
                kbisPurchaseVerification: buildKbisVerificationRecord({
                  result: { ...verify, reason: failReason },
                  stripeSessionId: session.id,
                  feeRetainedCents: KBIS_VERIFICATION_FEE_CENTS,
                  refundedCents,
                  stripeRefundId,
                }),
              });

              // Pas de crédits.
              return NextResponse.json({ received: true });
            }

            await updateProRegistration(proId, {
              kbisPurchaseVerification: buildKbisVerificationRecord({
                result: verify,
                stripeSessionId: session.id,
              }),
            });
          }
        }

        await creditProWallet({
          proId,
          type: "purchase",
          amount: packSize,
          amountEur:
            Number.isFinite(priceEur) && priceEur > 0
              ? priceEur
              : session.amount_total != null
                ? session.amount_total / 100
                : undefined,
          stripeSessionId: session.id,
          note: `Achat pack ${packSize} crédits`,
        });

        // Suite de la vérif d'inscription : cohérence nom CB ↔ dirigeants / entreprise.
        try {
          const fresh = await getProRegistrationById(proId);
          if (fresh) {
            const cardName = session.customer_details?.name ?? undefined;
            const paymentNameCheck = evaluatePaymentNameCheck({
              cardName: cardName ?? undefined,
              companyName: fresh.companyName,
              legalRepresentatives: fresh.legalRepresentatives,
            });
            paymentNameCheck.stripeSessionId = session.id;
            await updateProRegistration(proId, { paymentNameCheck });
            if (paymentNameCheck.status === "mismatch") {
              console.warn(
                "[stripe] payment name mismatch",
                proId,
                paymentNameCheck.cardName
              );
            }
          }
        } catch (err) {
          console.error("[stripe] payment name check failed", err);
        }
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
