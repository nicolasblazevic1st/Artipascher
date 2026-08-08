import type { WorkRequest } from "@/lib/store-types";

/** Nombre max d’artisans acceptés par le client pour une même enchère. */
export const MAX_ACCEPTED_ARTISANS_PER_AUCTION = 5;

/**
 * Option « M'alerter par SMS » (défaut ON).
 * Si active : un artisan qui manifeste son intérêt est accepté automatiquement
 * et occupe une place de contact (sur 5).
 */
export function isSmsContactAlertsEnabled(request: WorkRequest): boolean {
  return request.smsContactAlertsEnabled !== false;
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
