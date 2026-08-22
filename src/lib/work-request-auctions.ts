import { resolveAuctionEndsAt } from "./auction-duration";
import { computeCurrentPrice } from "./auctions";
import {
  MAX_ACCEPTED_ARTISANS_PER_AUCTION,
  resolveMaxContactArtisans,
} from "./contact-slots";
import {
  SAMPLE_AUCTIONS,
  coordinatesForCity,
  type Auction,
  type TradeCategory,
} from "./data";
import { stripTestLabel } from "./demo-banners";
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
  isCopropriete?: boolean;
  workScope?: "privatif" | "commun";
}

export function getWorkRequestStartPrice(request: WorkRequest): number | undefined {
  return request.startPrice;
}

export function isWorkRequestPubliclyListed(request: WorkRequest): boolean {
  return (
    request.status === "approved" &&
    Boolean(request.auctionId) &&
    !request.unpublishedAt
  );
}

function fromWorkRequest(request: WorkRequest): ResolvedAuction | null {
  if (!isWorkRequestPubliclyListed(request) || !request.auctionId) return null;

  const endsAt = endsAtForRequest(request);
  const active = isAuctionStillActive(endsAt);
  return {
    id: request.auctionId,
    title: `${request.category} · ${request.city}`,
    description: stripTestLabel(request.description),
    city: request.city,
    department: request.department,
    startPrice: request.startPrice,
    status: active ? "active" : "ended",
    endsAt,
    shareToken: request.shareToken,
    source: "workRequest",
    isTest: request.isTest === true,
    isCopropriete: request.clientKind === "copropriete",
    workScope: request.workScope,
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
    isCopropriete: auction.isCopropriete === true,
    workScope: auction.workScope,
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
  if (!isWorkRequestPubliclyListed(request) || !request.auctionId) return null;
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
    description: stripTestLabel(request.description),
    category: tradeCategoryForRequest(request),
    city: request.city,
    department: request.department,
    startPrice,
    currentPrice,
    bidCount: bids.length,
    acceptedArtisansCount,
    maxAcceptedArtisans: resolveMaxContactArtisans(request),
    status: active ? "active" : "ended",
    endsAt: endsAt ?? new Date().toISOString(),
    isTest: request.isTest === true,
    isCopropriete: request.clientKind === "copropriete",
    workScope: request.workScope,
    coverPhotoUrl: request.photos?.[0],
    latitude,
    longitude,
  };
}

function pickPublicDemoAuction(
  demos: Auction[],
  createdAtByAuctionId: Map<string, string>
): Auction | null {
  if (demos.length === 0) return null;
  const ranked = [...demos].sort((a, b) => {
    const photo = Number(Boolean(b.coverPhotoUrl)) - Number(Boolean(a.coverPhotoUrl));
    if (photo !== 0) return photo;
    return (createdAtByAuctionId.get(b.id) ?? "").localeCompare(
      createdAtByAuctionId.get(a.id) ?? ""
    );
  });
  return ranked[0] ?? null;
}

/** Liste publique : demandes réelles actives + une seule démo. */
export async function listPublicAuctions(options?: {
  includeTest?: boolean;
}): Promise<Auction[]> {
  const store = await readStore();
  const fromStore = (
    await Promise.all(
      store.workRequests.map((request) =>
        workRequestToAuctionCard(request, { activeOnly: true })
      )
    )
  ).filter((a): a is Auction => a != null);

  const real = fromStore.filter((auction) => !auction.isTest);
  const demos = fromStore.filter((auction) => auction.isTest === true);

  if (options?.includeTest) {
    return [...real, ...demos];
  }

  const createdAtByAuctionId = new Map(
    store.workRequests
      .filter((request) => request.auctionId)
      .map((request) => [request.auctionId as string, request.createdAt ?? ""])
  );
  const demo = pickPublicDemoAuction(demos, createdAtByAuctionId);
  return demo ? [...real, demo] : real;
}

export async function isPubliclyListedDemo(auctionId: string): Promise<boolean> {
  const listed = await listPublicAuctions();
  return listed.some((auction) => auction.isTest === true && auction.id === auctionId);
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
  status: "active" | "ended" | "unpublished";
  endsAt?: string;
  createdAt?: string;
  bidCount: number;
  acceptedArtisansCount: number;
  maxAcceptedArtisans: number;
  feesCollected: number;
  source: "workRequest" | "sample";
  isTest: boolean;
  isCopropriete?: boolean;
  workScope?: "privatif" | "commun";
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
    const unpublished = Boolean(request.unpublishedAt);
    const active = !unpublished && isAuctionStillActive(endsAt);
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
      description: stripTestLabel(request.description),
      categoryLabel: request.category,
      city: request.city,
      department: request.department,
      startPrice,
      currentPrice,
      status: unpublished ? "unpublished" : active ? "active" : "ended",
      endsAt,
      createdAt: request.createdAt,
      bidCount: bids.length,
      acceptedArtisansCount,
      maxAcceptedArtisans: resolveMaxContactArtisans(request),
      feesCollected: bids.reduce((sum, b) => sum + b.feeEur, 0),
      source: "workRequest",
      isTest: request.isTest === true,
      isCopropriete: request.clientKind === "copropriete",
      workScope: request.workScope,
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
    (r) =>
      r.shareToken === shareToken && isWorkRequestPubliclyListed(r)
  );
  return request ?? null;
}

export async function getWorkRequestByAuctionId(
  auctionId: string
): Promise<WorkRequest | null> {
  const store = await readStore();
  return store.workRequests.find((r) => r.auctionId === auctionId) ?? null;
}

/** Catégories de travaux avec au moins une enchère publique active. */
export async function getActiveWorkCategories(): Promise<Set<string>> {
  const active = new Set<string>();
  for (const auction of await listPublicAuctions()) {
    const label = TRADE_CATEGORY_TO_WORK[auction.category];
    if (label) active.add(label);
  }
  return active;
}
