/** Délai mini après déblocage avant claim anti-churn. */
export const UNLOCK_REFUND_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
/** Délai max après déblocage pour claim. */
export const UNLOCK_REFUND_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** Max recrédits auto / pro / mois calendaire. */
export const UNLOCK_REFUND_MONTHLY_CAP = 5;
/** Seuil de claims validés → blacklist contact client. */
export const CLIENT_GHOST_BLACKLIST_THRESHOLD = 3;

export const UNLOCK_CLAIM_REASON_DEFAULT =
  "Client injoignable / désengagement après déblocage des coordonnées";

export type UnlockClaimEligibility =
  | { ok: true; ageMs: number }
  | { ok: false; reason: string };

export function evaluateUnlockClaimWindow(
  paidAt: string,
  nowMs = Date.now()
): UnlockClaimEligibility {
  const paidMs = new Date(paidAt).getTime();
  if (Number.isNaN(paidMs)) {
    return { ok: false, reason: "Date de déblocage invalide." };
  }
  const ageMs = nowMs - paidMs;
  if (ageMs < UNLOCK_REFUND_GRACE_MS) {
    const daysLeft = Math.ceil(
      (UNLOCK_REFUND_GRACE_MS - ageMs) / (24 * 60 * 60 * 1000)
    );
    return {
      ok: false,
      reason: `Attendez encore ${daysLeft} jour${daysLeft > 1 ? "s" : ""} après le déblocage (délai de 7 jours).`,
    };
  }
  if (ageMs > UNLOCK_REFUND_MAX_AGE_MS) {
    return {
      ok: false,
      reason: "Le délai de signalement (30 jours) est dépassé.",
    };
  }
  return { ok: true, ageMs };
}

export function monthKeyParis(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}
