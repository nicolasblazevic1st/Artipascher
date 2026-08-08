/** Durée d'enchère choisie par le particulier (max. 3 mois). */

export const MAX_AUCTION_DURATION_DAYS = 90;

export const AUCTION_DURATION_OPTIONS = [
  { value: 7, label: "7 jours (1 semaine)" },
  { value: 14, label: "14 jours (2 semaines)" },
  { value: 30, label: "30 jours (1 mois)" },
  { value: 60, label: "60 jours (2 mois)" },
  { value: 90, label: "90 jours (3 mois — maximum)" },
] as const;

export const DEFAULT_AUCTION_DURATION_DAYS = 30;

export function validateAuctionDurationDays(days: unknown): string | null {
  const n = typeof days === "string" ? Number(days) : days;
  if (typeof n !== "number" || Number.isNaN(n) || !Number.isInteger(n)) {
    return "Durée d'enchère invalide.";
  }
  if (n < 1) {
    return "La durée minimum est de 1 jour.";
  }
  if (n > MAX_AUCTION_DURATION_DAYS) {
    return `La durée maximum est de ${MAX_AUCTION_DURATION_DAYS} jours (3 mois).`;
  }
  const allowed = AUCTION_DURATION_OPTIONS.some((o) => o.value === n);
  if (!allowed) {
    return "Choisissez une durée parmi les options proposées.";
  }
  return null;
}

export function formatAuctionDurationDays(days: number): string {
  const option = AUCTION_DURATION_OPTIONS.find((o) => o.value === days);
  return option?.label ?? `${days} jours`;
}

export function computeAuctionEndsAt(from: Date, durationDays: number): Date {
  const ends = new Date(from);
  ends.setDate(ends.getDate() + durationDays);
  return ends;
}

/**
 * Date de fin affichée / utilisée pour le compteur.
 * Priorité : auctionEndsAt stockée, sinon createdAt/reviewedAt + durée.
 */
export function resolveAuctionEndsAt(input: {
  auctionEndsAt?: string | null;
  auctionDurationDays?: number | null;
  from?: string | null;
}): string | undefined {
  if (input.auctionEndsAt) {
    const t = new Date(input.auctionEndsAt).getTime();
    if (Number.isFinite(t)) return new Date(t).toISOString();
  }
  const days =
    typeof input.auctionDurationDays === "number" &&
    Number.isFinite(input.auctionDurationDays) &&
    input.auctionDurationDays > 0
      ? Math.floor(input.auctionDurationDays)
      : DEFAULT_AUCTION_DURATION_DAYS;
  if (!input.from) return undefined;
  const from = new Date(input.from);
  if (!Number.isFinite(from.getTime())) return undefined;
  return computeAuctionEndsAt(from, days).toISOString();
}
