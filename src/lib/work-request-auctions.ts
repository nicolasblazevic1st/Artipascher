import { resolveAuctionEndsAt } from "./auction-duration";
import { computeCurrentPrice } from "./auctions";
import {
  MAX_ACCEPTED_ARTISANS_PER_AUCTION,
} from "./contact-slots";
import {
  SAMPLE_AUCTIONS,
  coordinatesForCity,
  type Auction,
  type TradeCategory,
} from "./data";
import { isAuctionStillActive } from "./share";
import {
  countContactUnlocksForAuction,
  getBidsForAuction,
  readStore,
} from "./store";
import type { WorkRequest } from "./store-types";
import { TRADE_CATEGORY_TO_WORK, WORK_TO_TRADE_CATEGORY } from "./work-categories";

function endsAtForRequest(request: WorkRequest): string | undefined {
  return resolveAuctionEndsAt({
    auctionEndsAt: request.auctionEndsAt,
    auctionDurationHours: request.auctionDurationHours,
    auctionDurationDays: request.auctionDurationDays,
    from: request.reviewedAt ?? request.createdAt,
  });
}

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
  isTest?: boolean;
}

export function getWorkRequestStartPrice(request: WorkRequest): number | undefined {
  return request.startPrice;
}

function fromWorkRequest(request: WorkRequest): ResolvedAuction | null {
  if (request.status !== "approved" || !request.auctionId) return null;

  const endsAt = endsAtForRequest(request);
  const active = isAuctionStillActive(endsAt);
  return {
    id: request.auctionId,
    title: `${request.category} · ${request.city}`,
    description: request.description,
    city: request.city,
    department: request.department,
    startPrice: request.startPrice,
    status: active ? "active" : "ended",
    endsAt,
    shareToken: request.shareToken,
    source: "workRequest",
    isTest: request.isTest === true,
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
    isTest: auction.isTest === true,
  };
}

function tradeCategoryForRequest(request: WorkRequest): TradeCategory {
  const mapped = WORK_TO_TRADE_CATEGORY[request.category];
  if (mapped) return mapped as TradeCategory;
  return "peinture";
}

/** Convertit une demande approuvée en carte enchère (active ou terminée). */
export async function workRequestToAuctionCard(
  request: WorkRequest,
  options?: { activeOnly?: boolean }
): Promise<Auction | null> {
  if (request.status !== "approved" || !request.auctionId) return null;
  const endsAt = endsAtForRequest(request);
  const active = isAuctionStillActive(endsAt);
  if (options?.activeOnly !== false && !active) return null;

  const startPrice = request.startPrice ?? request.previousQuoteAmount ?? 0;
  const bids = await getBidsForAuction(request.auctionId);
  const acceptedArtisansCount = await countContactUnlocksForAuction(
    request.auctionId
  );
  const currentPrice =
    computeCurrentPrice(
      startPrice || undefined,
      bids.map((b) => b.amount)
    ) ?? startPrice;

  const cityCoords = coordinatesForCity(request.city);
  const latitude = request.latitude ?? cityCoords?.lat;
  const longitude = request.longitude ?? cityCoords?.lon;

  return {
    id: request.auctionId,
    title: `${request.category} · ${request.city}`,
    description: request.description,
    category: tradeCategoryForRequest(request),
    city: request.city,
    department: request.department,
    startPrice,
    currentPrice,
    bidCount: bids.length,
    acceptedArtisansCount,
    maxAcceptedArtisans: MAX_ACCEPTED_ARTISANS_PER_AUCTION,
    status: active ? "active" : "ended",
    endsAt: endsAt ?? new Date().toISOString(),
    isTest: request.isTest === true,
    coverPhotoUrl: request.photos?.[0],
    latitude,
    longitude,
  };
}

/** Liste publique : demandes store actives avec photo (ou TEST). */
export async function listPublicAuctions(): Promise<Auction[]> {
  const store = await readStore();
  const fromStore = (
    await Promise.all(
      store.workRequests.map((request) =>
        workRequestToAuctionCard(request, { activeOnly: true })
      )
    )
  ).filter((a): a is Auction => a != null);

  // Exclut les fausses enchères sans photo et hors TEST.
  return fromStore.filter(
    (auction) => auction.isTest === true || Boolean(auction.coverPhotoUrl)
  );
}

/** Admin : toutes les enchères store (y compris terminées). */
export async function listAdminAuctions(): Promise<Auction[]> {
  const store = await readStore();
  const fromStore = (
    await Promise.all(
      store.workRequests.map((request) =>
        workRequestToAuctionCard(request, { activeOnly: false })
      )
    )
  ).filter((a): a is Auction => a != null);

  return fromStore;
}

export interface AdminAuctionView {
  id: string;
  title: string;
  description: string;
  categoryLabel: string;
  city: string;
  department: "59" | "62";
  startPrice?: number;
  currentPrice?: number;
  status: "active" | "ended";
  endsAt?: string;
  createdAt?: string;
  bidCount: number;
  acceptedArtisansCount: number;
  maxAcceptedArtisans: number;
  feesCollected: number;
  source: "workRequest" | "sample";
  isTest: boolean;
  workRequestId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  shareToken?: string;
}

/** Vue admin enrichie : enchères issues des demandes publiques en premier. */
export async function listAdminAuctionViews(): Promise<AdminAuctionView[]> {
  const store = await readStore();
  const views: AdminAuctionView[] = [];

  for (const request of store.workRequests) {
    if (request.status !== "approved" || !request.auctionId) continue;

    const endsAt = endsAtForRequest(request);
    const active = isAuctionStillActive(endsAt);
    const bids = await getBidsForAuction(request.auctionId);
    const acceptedArtisansCount = await countContactUnlocksForAuction(
      request.auctionId
    );
    const startPrice = request.startPrice ?? request.previousQuoteAmount;
    const currentPrice =
      startPrice != null
        ? computeCurrentPrice(
            startPrice,
            bids.map((b) => b.amount)
          ) ?? startPrice
        : undefined;

    views.push({
      id: request.auctionId,
      title: `${request.category} · ${request.city}`,
      description: request.description,
      categoryLabel: request.category,
      city: request.city,
      department: request.department,
      startPrice,
      currentPrice,
      status: active ? "active" : "ended",
      endsAt,
      createdAt: request.createdAt,
      bidCount: bids.length,
      acceptedArtisansCount,
      maxAcceptedArtisans: MAX_ACCEPTED_ARTISANS_PER_AUCTION,
      feesCollected: bids.reduce((sum, b) => sum + b.feeEur, 0),
      source: "workRequest",
      isTest: request.isTest === true,
      workRequestId: request.id,
      clientName: `${request.firstName} ${request.lastName}`.trim(),
      clientEmail: request.email,
      clientPhone: request.phone,
      shareToken: request.shareToken,
    });
  }

  views.sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });

  const storeIds = new Set(views.map((v) => v.id));
  for (const auction of SAMPLE_AUCTIONS) {
    if (storeIds.has(auction.id)) continue;
    const bids = await getBidsForAuction(auction.id);
    const acceptedArtisansCount = await countContactUnlocksForAuction(auction.id);
    views.push({
      id: auction.id,
      title: auction.title,
      description: auction.description,
      categoryLabel: TRADE_CATEGORY_TO_WORK[auction.category] ?? auction.category,
      city: auction.city,
      department: auction.department,
      startPrice: auction.startPrice,
      currentPrice:
        computeCurrentPrice(
          auction.startPrice,
          bids.map((b) => b.amount)
        ) ?? auction.startPrice,
      status: auction.status,
      endsAt: auction.endsAt,
      bidCount: bids.length,
      acceptedArtisansCount,
      maxAcceptedArtisans: MAX_ACCEPTED_ARTISANS_PER_AUCTION,
      feesCollected: bids.reduce((sum, b) => sum + b.feeEur, 0),
      source: "sample",
      isTest: auction.isTest === true,
    });
  }

  return views;
}

export async function getAdminAuctionView(
  auctionId: string
): Promise<AdminAuctionView | null> {
  const views = await listAdminAuctionViews();
  return views.find((v) => v.id === auctionId) ?? null;
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

/** Catégories de travaux avec au moins une enchère active (réelles ou démo). */
export async function getActiveWorkCategories(): Promise<Set<string>> {
  const active = new Set<string>();
  const store = await readStore();

  for (const request of store.workRequests) {
    if (
      request.status === "approved" &&
      request.auctionId &&
      isAuctionStillActive(endsAtForRequest(request))
    ) {
      active.add(request.category);
    }
  }

  return active;
}
