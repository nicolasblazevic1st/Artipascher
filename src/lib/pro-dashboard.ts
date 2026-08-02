import { computeCurrentPrice } from "./auctions";
import { SAMPLE_AUCTIONS, type Auction } from "./data";
import { getBidsForAuction, getBidsForPro, type Bid } from "./store";

export interface EnrichedAuction extends Auction {
  liveCurrentPrice: number;
  liveBidCount: number;
  myBestBid: number | null;
  isWinning: boolean;
}

export async function getEnrichedAuctions(proId?: string): Promise<EnrichedAuction[]> {
  const myBids = proId ? await getBidsForPro(proId) : [];

  return Promise.all(
    SAMPLE_AUCTIONS.filter((a) => a.status === "active").map(async (auction) => {
      const bids = await getBidsForAuction(auction.id);
      const amounts = bids.map((b) => b.amount);
      const liveCurrentPrice = computeCurrentPrice(auction.startPrice, amounts);
      const myAuctionBids = myBids.filter((b) => b.auctionId === auction.id);
      const myBestBid =
        myAuctionBids.length > 0
          ? Math.min(...myAuctionBids.map((b) => b.amount))
          : null;

      return {
        ...auction,
        liveCurrentPrice,
        liveBidCount: bids.length,
        myBestBid,
        isWinning: myBestBid !== null && myBestBid === liveCurrentPrice,
      };
    })
  );
}

export function groupBidsByAuction(bids: Bid[]) {
  const map = new Map<
    string,
    { auctionId: string; bids: Bid[]; bestAmount: number }
  >();

  for (const bid of bids) {
    const existing = map.get(bid.auctionId);
    if (!existing) {
      map.set(bid.auctionId, {
        auctionId: bid.auctionId,
        bids: [bid],
        bestAmount: bid.amount,
      });
    } else {
      existing.bids.push(bid);
      existing.bestAmount = Math.min(existing.bestAmount, bid.amount);
    }
  }

  return [...map.values()].sort(
    (a, b) =>
      new Date(b.bids[0].createdAt).getTime() -
      new Date(a.bids[0].createdAt).getTime()
  );
}
