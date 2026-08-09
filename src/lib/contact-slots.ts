import type { WorkRequest } from "@/lib/store-types";

/** Max d’artisans ayant débloqué (payé) les coordonnées pour une même demande. */
export const MAX_CONTACT_UNLOCKS_PER_REQUEST = 5;

/**
 * @deprecated Alias historique — préférer MAX_CONTACT_UNLOCKS_PER_REQUEST.
 * Conservé pour les imports existants (SMS, bannières).
 */
export const MAX_ACCEPTED_ARTISANS_PER_AUCTION = MAX_CONTACT_UNLOCKS_PER_REQUEST;

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
  const n = Math.max(0, Math.min(accepted, max));
  return `${n} / ${max}`;
}

export function remainingAcceptSlots(
  accepted: number,
  max: number = MAX_ACCEPTED_ARTISANS_PER_AUCTION
): number {
  return Math.max(0, max - Math.max(0, accepted));
}

export function isAcceptSlotsFull(
  accepted: number,
  max: number = MAX_ACCEPTED_ARTISANS_PER_AUCTION
): boolean {
  return accepted >= max;
}
