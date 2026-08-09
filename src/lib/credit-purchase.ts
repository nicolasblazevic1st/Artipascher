import { evaluatePaymentNameCheck } from "@/lib/payment-identity";
import {
  creditProWallet,
  getProRegistrationById,
  updateProRegistration,
} from "@/lib/store";

/** Crédite le wallet après un Checkout Stripe réussi (webhook ou retour client). */
export async function fulfillCreditPurchaseSession(session: {
  id: string;
  metadata?: Record<string, string> | null;
  amount_total?: number | null;
  customer_details?: { name?: string | null } | null;
}): Promise<
  | { ok: true; credited: number; balance: number; alreadyApplied: boolean }
  | { ok: false; error: string }
> {
  if (
    session.metadata?.type !== "credit_purchase" ||
    !session.metadata.proId ||
    !session.metadata.packSize
  ) {
    return { ok: false, error: "Session hors achat crédits." };
  }

  const packSize = Number(session.metadata.packSize);
  const priceEur = Number(session.metadata.priceEur);
  if (!Number.isFinite(packSize) || packSize <= 0) {
    return { ok: false, error: "Pack invalide." };
  }

  const proId = session.metadata.proId;
  const result = await creditProWallet({
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

  if ("error" in result) {
    return { ok: false, error: result.error };
  }

  if (!result.alreadyApplied) {
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
            "[credits] payment name mismatch",
            proId,
            paymentNameCheck.cardName
          );
        }
      }
    } catch (err) {
      console.error("[credits] payment name check failed", err);
    }
  }

  return {
    ok: true,
    credited: packSize,
    balance: result.balance,
    alreadyApplied: result.alreadyApplied,
  };
}
