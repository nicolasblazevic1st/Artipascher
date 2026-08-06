import { NextRequest, NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import { notifyProArtisanSelected } from "@/lib/notify";
import {
  getApprovedProQuotesForAuction,
  getBidsForAuction,
  getProQuotesForAuction,
  getWorkRequestForClient,
  selectBidForWorkRequest,
  selectQuoteForWorkRequest,
} from "@/lib/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await context.params;
  const request = await getWorkRequestForClient(id, session.clientId);
  if (!request) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  const bids = request.auctionId ? await getBidsForAuction(request.auctionId) : [];
  const quotes = request.auctionId
    ? await getApprovedProQuotesForAuction(request.auctionId)
    : [];
  const selectedBid = request.selectedBidId
    ? bids.find((b) => b.id === request.selectedBidId) ?? null
    : null;
  const selectedQuote = request.selectedQuoteId
    ? (quotes.find((q) => q.id === request.selectedQuoteId) ??
      (request.auctionId
        ? (await getProQuotesForAuction(request.auctionId)).find(
            (q) => q.id === request.selectedQuoteId
          ) ?? null
        : null))
    : null;

  return NextResponse.json({
    request,
    bids,
    quotes,
    selectedBid,
    selectedQuote,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await context.params;
  let bidId = "";
  let quoteId = "";

  try {
    const body = await request.json();
    bidId = body.bidId ?? "";
    quoteId = body.quoteId ?? "";
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (quoteId) {
    const result = await selectQuoteForWorkRequest(id, session.clientId, quoteId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const quotes = result.request.auctionId
      ? await getProQuotesForAuction(result.request.auctionId)
      : [];
    const selected = quotes.find((q) => q.id === quoteId);
    if (selected && result.request.auctionId) {
      void notifyProArtisanSelected({
        proId: selected.proId,
        category: result.request.category,
        city: result.request.city,
        auctionId: result.request.auctionId,
        amount: selected.amount,
      }).catch((err) => console.error("[notify] artisan selected", err));
    }
    return NextResponse.json({ success: true, request: result.request });
  }

  if (!bidId) {
    return NextResponse.json({ error: "Devis ou offre requis." }, { status: 400 });
  }

  const result = await selectBidForWorkRequest(id, session.clientId, bidId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const bids = result.request.auctionId
    ? await getBidsForAuction(result.request.auctionId)
    : [];
  const selectedBid = bids.find((b) => b.id === bidId);
  if (selectedBid && result.request.auctionId) {
    void notifyProArtisanSelected({
      proId: selectedBid.proId,
      category: result.request.category,
      city: result.request.city,
      auctionId: result.request.auctionId,
      amount: selectedBid.amount,
    }).catch((err) => console.error("[notify] artisan selected", err));
  }

  return NextResponse.json({ success: true, request: result.request });
}
