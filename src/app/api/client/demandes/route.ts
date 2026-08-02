import { NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import { getBidsForAuction, getWorkRequestsByClientId } from "@/lib/store";

export async function GET() {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const requests = await getWorkRequestsByClientId(session.clientId);
  const enriched = await Promise.all(
    requests.map(async (request) => {
      const bids = request.auctionId
        ? await getBidsForAuction(request.auctionId)
        : [];
      return {
        ...request,
        bidCount: bids.length,
        lowestBid: bids.length > 0 ? Math.min(...bids.map((b) => b.amount)) : null,
      };
    })
  );

  return NextResponse.json({ requests: enriched });
}
