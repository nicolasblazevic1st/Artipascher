import { eurosToCents } from "./money";
import type { WorkRequest } from "./store-types";

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

  if (eurosToCents(bidAmount) > eurosToCents(quoteAmount)) {
    return {
      ok: false,
      error: `Votre enchère (${bidAmount} €) ne peut pas dépasser votre devis (${quoteAmount} €).`,
    };
  }

  return { ok: true };
}
