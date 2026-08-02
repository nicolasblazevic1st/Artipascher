export const BID_STEP_EUR = 100;
export const BID_FEE_EUR = 1;

export function computeCurrentPrice(
  startPrice: number,
  bidAmounts: number[]
): number {
  if (bidAmounts.length === 0) return startPrice;
  return Math.min(...bidAmounts);
}

export function validateBidAmount(
  amount: number,
  currentPrice: number
): string | null {
  if (!Number.isInteger(amount) || amount <= 0) {
    return "Montant invalide.";
  }
  if (amount >= currentPrice) {
    return `Votre enchère doit être strictement inférieure au prix actuel (${currentPrice} €).`;
  }
  if (amount % BID_STEP_EUR !== 0) {
    return `Les enchères se font par paliers de ${BID_STEP_EUR} €.`;
  }
  return null;
}

export function suggestNextBid(currentPrice: number): number {
  const next = currentPrice - BID_STEP_EUR;
  return next > 0 ? next : BID_STEP_EUR;
}
