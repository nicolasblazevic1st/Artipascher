import { validateBidCoherenceWithQuote } from "@/lib/bid-coherence";
import { getProBidLimitStatus, MAX_BIDS_PER_AUCTION } from "@/lib/auctions";
import { checkDecennaleForWorkCategory } from "@/lib/decennale-verification";
import { countProBidsForAuction, getApprovedProById, getProQuoteByProAndAuction } from "@/lib/store";
import { getWorkRequestByAuctionId } from "@/lib/work-request-auctions";

export interface BidEligibility {
  requiresQuote: boolean;
  canBid: boolean;
  reason?: string;
  maxBidsPerAuction: number;
  bidsUsed: number;
  bidsRemaining: number;
  quote?: {
    id: string;
    status: string;
    amount: number;
    maxBidAmount?: number;
  };
}

export async function checkBidEligibility(
  proId: string,
  auctionId: string,
  bidAmount?: number
): Promise<BidEligibility> {
  const bidsUsed = await countProBidsForAuction(proId, auctionId);
  const bidLimit = getProBidLimitStatus(bidsUsed);
  const limitFields = {
    maxBidsPerAuction: bidLimit.maxBidsPerAuction,
    bidsUsed: bidLimit.bidsUsed,
    bidsRemaining: bidLimit.bidsRemaining,
  };

  if (bidLimit.limitReached) {
    return {
      requiresQuote: true,
      canBid: false,
      reason: `Vous avez utilisé vos ${MAX_BIDS_PER_AUCTION} enchères sur ce chantier.`,
      ...limitFields,
    };
  }

  const workRequest = await getWorkRequestByAuctionId(auctionId);

  if (!workRequest) {
    return { requiresQuote: false, canBid: true, ...limitFields };
  }

  const pro = await getApprovedProById(proId);
  if (pro) {
    const decennaleCheck = checkDecennaleForWorkCategory(pro, workRequest.category);
    if (!decennaleCheck.ok) {
      return {
        requiresQuote: true,
        canBid: false,
        reason: decennaleCheck.reason,
        ...limitFields,
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
      ...limitFields,
    };
  }

  if (quote.status === "pending_moderation") {
    return {
      requiresQuote: true,
      canBid: false,
      reason:
        "Votre devis est en attente de validation par l'administration. Vous pourrez enchérir dès qu'il sera accepté.",
      quote: { id: quote.id, status: quote.status, amount: quote.amount },
      ...limitFields,
    };
  }

  if (quote.status === "rejected") {
    return {
      requiresQuote: true,
      canBid: false,
      reason:
        "Votre devis a été refusé. Corrigez-le et soumettez-le à nouveau avant d'enchérir.",
      quote: { id: quote.id, status: quote.status, amount: quote.amount },
      ...limitFields,
    };
  }

  const maxBidAmount = quote.amount;

  const base: BidEligibility = {
    requiresQuote: true,
    canBid: true,
    ...limitFields,
    quote: {
      id: quote.id,
      status: quote.status,
      amount: quote.amount,
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
