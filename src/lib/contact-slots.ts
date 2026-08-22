import type { PricingTierId } from "@/lib/pricing-tiers";
import type { WorkRequest } from "@/lib/store-types";

/** Plancher / plafond absolus. */
export const MIN_CONTACT_ARTISANS = 1;
/** Max d’artisans pouvant débloquer les coordonnées pour une même demande. */
export const MAX_CONTACT_UNLOCKS_PER_REQUEST = 5;
/** Petites interventions (ticket bas) : 3 artisans max, le client peut en choisir moins. */
export const MAX_CONTACT_UNLOCKS_SMALL_JOB = 3;

/** Plafond selon le ticket : le particulier choisit de 1 jusqu’à ce max. */
export function maxContactArtisansForTier(
  tier?: PricingTierId | string | null
): number {
  return tier === "bas"
    ? MAX_CONTACT_UNLOCKS_SMALL_JOB
    : MAX_CONTACT_UNLOCKS_PER_REQUEST;
}

/**
 * @deprecated Alias historique — préférer MAX_CONTACT_UNLOCKS_PER_REQUEST.
 * Conservé pour les imports existants (SMS, bannières).
 */
export const MAX_ACCEPTED_ARTISANS_PER_AUCTION = MAX_CONTACT_UNLOCKS_PER_REQUEST;

/** Plafond effectif pour une demande (défaut = max plateforme si absent). */
export function resolveMaxContactArtisans(
  request?: Pick<WorkRequest, "maxContactArtisans"> | null
): number {
  const n = request?.maxContactArtisans;
  if (
    typeof n === "number" &&
    Number.isInteger(n) &&
    n >= MIN_CONTACT_ARTISANS &&
    n <= MAX_CONTACT_UNLOCKS_PER_REQUEST
  ) {
    return n;
  }
  return MAX_CONTACT_UNLOCKS_PER_REQUEST;
}

/** Parse formulaire / API → 1..5 ou null si invalide. */
export function parseMaxContactArtisans(raw: unknown): number | null {
  const n =
    typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
  if (
    !Number.isFinite(n) ||
    !Number.isInteger(n) ||
    n < MIN_CONTACT_ARTISANS ||
    n > MAX_CONTACT_UNLOCKS_PER_REQUEST
  ) {
    return null;
  }
  return n;
}

/**
 * Autorisation de mise en contact (issue de l’acceptation des CG).
 * Contact-only : toujours actif — les artisans matching peuvent débloquer
 * dans la limite des places.
 */
export function isSmsContactAlertsEnabled(_request: WorkRequest): boolean {
  return true;
}

/**
 * Interrupteur code du bandeau / pastilles « places de contact ».
 * Mettre à `false` pour masquer l’UI si le modèle change
 * (le plafond d’acceptation côté API reste actif tant qu’on ne le retire pas).
 *
 * Priorité : `NEXT_PUBLIC_CONTACT_SLOTS_BANNER=false|0|off|no` désactive aussi.
 */
export const CONTACT_SLOTS_BANNER_ENABLED = true;

function envFlagFalse(value: string | undefined): boolean {
  if (value == null) return false;
  const v = value.trim().toLowerCase();
  return v === "false" || v === "0" || v === "off" || v === "no";
}

/** Afficher le bandeau / pastilles places de contact. */
export function isContactSlotsBannerEnabled(): boolean {
  if (!CONTACT_SLOTS_BANNER_ENABLED) return false;
  if (envFlagFalse(process.env.NEXT_PUBLIC_CONTACT_SLOTS_BANNER)) return false;
  return true;
}

export function formatAcceptedArtisanSlots(
  accepted: number,
  max: number = MAX_ACCEPTED_ARTISANS_PER_AUCTION
): string {
  const safeMax = max > 0 ? max : MAX_ACCEPTED_ARTISANS_PER_AUCTION;
  const n = Math.max(0, Math.min(accepted, safeMax));
  return `${n} / ${safeMax}`;
}

export function remainingAcceptSlots(
  accepted: number,
  max: number = MAX_ACCEPTED_ARTISANS_PER_AUCTION
): number {
  const safeMax = max > 0 ? max : MAX_ACCEPTED_ARTISANS_PER_AUCTION;
  return Math.max(0, safeMax - Math.max(0, accepted));
}

export function isAcceptSlotsFull(
  accepted: number,
  max: number = MAX_ACCEPTED_ARTISANS_PER_AUCTION
): boolean {
  const safeMax = max > 0 ? max : MAX_ACCEPTED_ARTISANS_PER_AUCTION;
  return accepted >= safeMax;
}
