import { SAMPLE_AUCTIONS, type Auction } from "./data";
import { isAuctionStillActive } from "./share";
import { readStore } from "./store";
import type { WorkRequest } from "./store-types";

export interface ResolvedAuction {
  id: string;
  title: string;
  description: string;
  city: string;
  department: "59" | "62";
  startPrice?: number;
  status: "active" | "ended";
  endsAt?: string;
  shareToken?: string;
  source: "sample" | "workRequest";
}

export function getWorkRequestStartPrice(request: WorkRequest): number | undefined {
  return request.startPrice;
}

function fromWorkRequest(request: WorkRequest): ResolvedAuction | null {
  if (request.status !== "approved" || !request.auctionId) return null;

  const active = isAuctionStillActive(request.auctionEndsAt);
  return {
    id: request.auctionId,
    title: `${request.category} · ${request.city}`,
    description: request.description,
    city: request.city,
    department: request.department,
    startPrice: request.startPrice,
    status: active ? "active" : "ended",
    endsAt: request.auctionEndsAt,
    shareToken: request.shareToken,
    source: "workRequest",
  };
}

function fromSample(auction: Auction): ResolvedAuction {
  return {
    id: auction.id,
    title: auction.title,
    description: auction.description,
    city: auction.city,
    department: auction.department,
    startPrice: auction.startPrice,
    status: auction.status,
    endsAt: auction.endsAt,
    source: "sample",
  };
}

export async function resolveAuction(auctionId: string): Promise<ResolvedAuction | null> {
  const sample = SAMPLE_AUCTIONS.find((a) => a.id === auctionId);
  if (sample) return fromSample(sample);

  const store = await readStore();
  const request = store.workRequests.find((r) => r.auctionId === auctionId);
  if (request) return fromWorkRequest(request);

  return null;
}

export async function getWorkRequestByShareToken(
  shareToken: string
): Promise<WorkRequest | null> {
  const store = await readStore();
  const request = store.workRequests.find(
    (r) => r.shareToken === shareToken && r.status === "approved"
  );
  return request ?? null;
}

export async function getWorkRequestByAuctionId(
  auctionId: string
): Promise<WorkRequest | null> {
  const store = await readStore();
  return store.workRequests.find((r) => r.auctionId === auctionId) ?? null;
}
