export const BID_FEE_EUR = 1;

/** Nombre maximum d'enchères qu'un artisan peut placer sur un même chantier. */
export const MAX_BIDS_PER_AUCTION = 3;

export function getProBidLimitStatus(bidsUsed: number) {
  const used = Math.max(0, bidsUsed);
  const remaining = Math.max(0, MAX_BIDS_PER_AUCTION - used);
  return {
    maxBidsPerAuction: MAX_BIDS_PER_AUCTION,
    bidsUsed: used,
    bidsRemaining: remaining,
    limitReached: used >= MAX_BIDS_PER_AUCTION,
  };
}

/** @deprecated Palier indicatif — les enchères acceptent tout montant entier inférieur au prix actuel. */
export const BID_STEP_EUR = 100;

export function computeCurrentPrice(
  startPrice: number | undefined,
  bidAmounts: number[]
): number | undefined {
  if (startPrice == null) return undefined;
  if (bidAmounts.length === 0) return startPrice;
  return Math.min(...bidAmounts);
}

export function validateBidAmount(
  amount: number,
  currentPrice: number | undefined
): string | null {
  if (currentPrice == null) {
    return "Le prix de départ n'est pas encore fixé (premier devis en attente).";
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return "Montant invalide.";
  }
  if (amount >= currentPrice) {
    return `Votre enchère doit être strictement inférieure au prix actuel (${currentPrice} €).`;
  }
  return null;
}

export function suggestNextBid(currentPrice: number | undefined): number | undefined {
  if (currentPrice == null) return undefined;
  const next = currentPrice - 1;
  return next > 0 ? next : 1;
}
