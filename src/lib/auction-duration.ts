/** Durée d'annonce / mise en contact (max. 90 jours = 2160 h). */

export const MAX_AUCTION_DURATION_HOURS = 2160; // 90 j
export const MAX_LISTING_DURATION_HOURS = MAX_AUCTION_DURATION_HOURS;

/** @deprecated Prefer HOURS. */
export const MAX_AUCTION_DURATION_DAYS = 90;
export const MAX_LISTING_DURATION_DAYS = MAX_AUCTION_DURATION_DAYS;

export const AUCTION_DURATION_OPTIONS = [
  { value: 6, label: "6 heures" },
  { value: 12, label: "12 heures" },
  { value: 24, label: "24 heures (1 jour)" },
  { value: 48, label: "48 heures (2 jours)" },
  { value: 72, label: "72 heures (3 jours)" },
  { value: 120, label: "5 jours" },
  { value: 168, label: "7 jours (1 semaine)" },
  { value: 336, label: "14 jours (2 semaines)" },
  { value: 720, label: "30 jours (1 mois)" },
  { value: 1440, label: "60 jours (2 mois)" },
  { value: 2160, label: "90 jours (3 mois — maximum)" },
] as const;

export const LISTING_DURATION_OPTIONS = AUCTION_DURATION_OPTIONS;

export const DEFAULT_AUCTION_DURATION_HOURS = 720; // 30 j
export const DEFAULT_LISTING_DURATION_HOURS = DEFAULT_AUCTION_DURATION_HOURS;

/** @deprecated */
export const DEFAULT_AUCTION_DURATION_DAYS = 30;
export const DEFAULT_LISTING_DURATION_DAYS = DEFAULT_AUCTION_DURATION_DAYS;

export function hoursFromLegacyDays(days: number): number {
  return Math.max(1, Math.floor(days) * 24);
}

export function resolveAuctionDurationHours(input: {
  auctionDurationHours?: number | null;
  auctionDurationDays?: number | null;
}): number {
  if (
    typeof input.auctionDurationHours === "number" &&
    Number.isFinite(input.auctionDurationHours) &&
    input.auctionDurationHours > 0
  ) {
    return Math.floor(input.auctionDurationHours);
  }
  if (
    typeof input.auctionDurationDays === "number" &&
    Number.isFinite(input.auctionDurationDays) &&
    input.auctionDurationDays > 0
  ) {
    return hoursFromLegacyDays(input.auctionDurationDays);
  }
  return DEFAULT_AUCTION_DURATION_HOURS;
}

export function validateAuctionDurationHours(hours: unknown): string | null {
  const n = typeof hours === "string" ? Number(hours) : hours;
  if (typeof n !== "number" || Number.isNaN(n) || !Number.isInteger(n)) {
    return "Durée d'annonce invalide.";
  }
  if (n < 1) {
    return "La durée minimum est de 1 heure.";
  }
  if (n > MAX_AUCTION_DURATION_HOURS) {
    return `La durée maximum est de ${MAX_AUCTION_DURATION_DAYS} jours (3 mois).`;
  }
  const allowed = AUCTION_DURATION_OPTIONS.some((o) => o.value === n);
  if (!allowed) {
    return "Choisissez une durée parmi les options proposées.";
  }
  return null;
}

/** @deprecated */
export function validateAuctionDurationDays(days: unknown): string | null {
  const n = typeof days === "string" ? Number(days) : days;
  if (typeof n !== "number" || Number.isNaN(n) || !Number.isInteger(n)) {
    return "Durée d'annonce invalide.";
  }
  return validateAuctionDurationHours(hoursFromLegacyDays(n));
}

export const validateListingDurationHours = validateAuctionDurationHours;
export const validateListingDurationDays = validateAuctionDurationDays;

export function formatAuctionDurationHours(hours: number): string {
  const option = AUCTION_DURATION_OPTIONS.find((o) => o.value === hours);
  if (option) return option.label;
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} jour${days > 1 ? "s" : ""}`;
  }
  return `${hours} heure${hours > 1 ? "s" : ""}`;
}

/** Affiche la durée d'une demande (heures, avec fallback jours legacy). */
export function formatWorkRequestAuctionDuration(input: {
  auctionDurationHours?: number | null;
  auctionDurationDays?: number | null;
}): string {
  return formatAuctionDurationHours(resolveAuctionDurationHours(input));
}

/** @deprecated */
export function formatAuctionDurationDays(daysOrHours: number): string {
  // Si valeur typique en heures (>= 6 et dans options heures), formater comme heures.
  if (AUCTION_DURATION_OPTIONS.some((o) => o.value === daysOrHours)) {
    return formatAuctionDurationHours(daysOrHours);
  }
  // Legacy jours
  if (daysOrHours > 0 && daysOrHours <= 90) {
    return formatAuctionDurationHours(hoursFromLegacyDays(daysOrHours));
  }
  return formatAuctionDurationHours(daysOrHours);
}

export function computeAuctionEndsAt(from: Date, durationHours: number): Date {
  const ends = new Date(from);
  ends.setTime(ends.getTime() + durationHours * 60 * 60 * 1000);
  return ends;
}

/**
 * Date de fin affichée / utilisée pour le compteur.
 * Priorité : auctionEndsAt stockée, sinon from + durée (heures).
 */
export function resolveAuctionEndsAt(input: {
  auctionEndsAt?: string | null;
  auctionDurationHours?: number | null;
  auctionDurationDays?: number | null;
  from?: string | null;
}): string | undefined {
  if (input.auctionEndsAt) {
    const t = new Date(input.auctionEndsAt).getTime();
    if (Number.isFinite(t)) return new Date(t).toISOString();
  }
  const hours = resolveAuctionDurationHours(input);
  if (!input.from) return undefined;
  const from = new Date(input.from);
  if (!Number.isFinite(from.getTime())) return undefined;
  return computeAuctionEndsAt(from, hours).toISOString();
}

/** Nombre de jours calendaires à ajouter pour la borne min. début travaux (ceil). */
export function durationHoursToCalendarDays(hours: number): number {
  return Math.max(0, Math.ceil(hours / 24));
}
