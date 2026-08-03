import type { WorkRequest } from "./store-types";

/** Écart max entre enchère et devis (ex. 0,25 = l'enchère peut être 25 % plus basse). */
export const MAX_BID_BELOW_QUOTE_RATIO = 0.25;

export interface BidCoherenceInput {
  bidAmount: number;
  quoteAmount: number;
  workRequest?: WorkRequest;
}

export interface BidCoherenceResult {
  ok: boolean;
  error?: string;
}

export function validateBidCoherenceWithQuote(
  input: BidCoherenceInput
): BidCoherenceResult {
  const { bidAmount, quoteAmount } = input;

  if (bidAmount > quoteAmount) {
    return {
      ok: false,
      error: `Votre enchère (${bidAmount} €) ne peut pas dépasser votre devis (${quoteAmount} €).`,
    };
  }

  const minAllowed = Math.floor(quoteAmount * (1 - MAX_BID_BELOW_QUOTE_RATIO));
  if (bidAmount < minAllowed) {
    return {
      ok: false,
      error: `Écart trop important entre enchère et devis. Minimum cohérent : ${minAllowed.toLocaleString("fr-FR")} € (devis : ${quoteAmount.toLocaleString("fr-FR")} €).`,
    };
  }

  return { ok: true };
}
