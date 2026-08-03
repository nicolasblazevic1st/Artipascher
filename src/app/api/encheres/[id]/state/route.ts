import { NextResponse } from "next/server";
import { computeCurrentPrice } from "@/lib/auctions";
import { resolveAuction } from "@/lib/work-request-auctions";
import { getBidsForAuction } from "@/lib/store";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const auction = await resolveAuction(id);
  if (!auction) {
    return NextResponse.json({ error: "Enchère introuvable." }, { status: 404 });
  }

  const bids = await getBidsForAuction(id);
  const amounts = bids.map((b) => b.amount);
  const currentPrice = computeCurrentPrice(auction.startPrice, amounts);

  return NextResponse.json({
    startPrice: auction.startPrice ?? null,
    currentPrice: currentPrice ?? null,
    bidCount: bids.length,
    bids: bids.map((b) => ({
      id: b.id,
      companyName: b.companyName,
      amount: b.amount,
      createdAt: b.createdAt,
    })),
  });
}
