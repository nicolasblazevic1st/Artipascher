import { NextRequest, NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import {
  getBidsForAuction,
  getWorkRequestForClient,
  selectBidForWorkRequest,
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
  const selectedBid = request.selectedBidId
    ? bids.find((b) => b.id === request.selectedBidId) ?? null
    : null;

  return NextResponse.json({ request, bids, selectedBid });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await context.params;
  let bidId: string;

  try {
    const body = await request.json();
    bidId = body.bidId ?? "";
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!bidId) {
    return NextResponse.json({ error: "Offre requise." }, { status: 400 });
  }

  const result = await selectBidForWorkRequest(id, session.clientId, bidId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, request: result.request });
}
