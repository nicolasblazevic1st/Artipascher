/** Nombre max d’artisans acceptés par le client pour une même enchère. */
export const MAX_ACCEPTED_ARTISANS_PER_AUCTION = 5;

export function formatAcceptedArtisanSlots(
  accepted: number,
  max: number = MAX_ACCEPTED_ARTISANS_PER_AUCTION
): string {
  const n = Math.max(0, Math.min(accepted, max));
  return `${n} / ${max}`;
}

export function isAcceptSlotsFull(
  accepted: number,
  max: number = MAX_ACCEPTED_ARTISANS_PER_AUCTION
): boolean {
  return accepted >= max;
}
