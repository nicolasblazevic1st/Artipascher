import { validateBidCoherenceWithQuote } from "@/lib/bid-coherence";
import { checkDecennaleForWorkCategory } from "@/lib/decennale-verification";
import { getApprovedProById, getProQuoteByProAndAuction } from "@/lib/store";
import { getWorkRequestByAuctionId } from "@/lib/work-request-auctions";

export interface BidEligibility {
  requiresQuote: boolean;
  canBid: boolean;
  reason?: string;
  quote?: {
    id: string;
    status: string;
    amount: number;
    minBidAmount?: number;
    maxBidAmount?: number;
  };
}

export async function checkBidEligibility(
  proId: string,
  auctionId: string,
  bidAmount?: number
): Promise<BidEligibility> {
  const workRequest = await getWorkRequestByAuctionId(auctionId);

  if (!workRequest) {
    return { requiresQuote: false, canBid: true };
  }

  const pro = await getApprovedProById(proId);
  if (pro) {
    const decennaleCheck = checkDecennaleForWorkCategory(pro, workRequest.category);
    if (!decennaleCheck.ok) {
      return {
        requiresQuote: true,
        canBid: false,
        reason: decennaleCheck.reason,
      };
    }
  }

  const quote = await getProQuoteByProAndAuction(proId, auctionId);

  if (!quote) {
    return {
      requiresQuote: true,
      canBid: false,
      reason:
        "Déposez d'abord votre devis après visite sur le chantier (coordonnées client → visite → devis).",
    };
  }

  if (quote.status === "pending_moderation") {
    return {
      requiresQuote: true,
      canBid: false,
      reason:
        "Votre devis est en attente de validation par l'administration. Vous pourrez enchérir dès qu'il sera accepté.",
      quote: { id: quote.id, status: quote.status, amount: quote.amount },
    };
  }

  if (quote.status === "rejected") {
    return {
      requiresQuote: true,
      canBid: false,
      reason:
        "Votre devis a été refusé. Corrigez-le et soumettez-le à nouveau avant d'enchérir.",
      quote: { id: quote.id, status: quote.status, amount: quote.amount },
    };
  }

  const minBidAmount = Math.floor(quote.amount * 0.75);
  const maxBidAmount = quote.amount;

  const base: BidEligibility = {
    requiresQuote: true,
    canBid: true,
    quote: {
      id: quote.id,
      status: quote.status,
      amount: quote.amount,
      minBidAmount,
      maxBidAmount,
    },
  };

  if (bidAmount === undefined) return base;

  const ruleCheck = validateBidCoherenceWithQuote({
    bidAmount,
    quoteAmount: quote.amount,
    workRequest,
  });

  if (!ruleCheck.ok) {
    return {
      ...base,
      canBid: false,
      reason: ruleCheck.error,
    };
  }

  return base;
}
