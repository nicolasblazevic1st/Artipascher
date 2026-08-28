import { BRAND } from "@/lib/brand";
import { CATEGORY_LABELS } from "@/lib/data";
import { publicOfferPath } from "@/lib/public-offers";
import { resolveUnlockPricing } from "@/lib/pricing-tiers";
import {
  getWorkRequestByAuctionId,
  listPublicAuctions,
} from "@/lib/work-request-auctions";

export type IndexedPublicOffer = {
  id: string;
  title: string;
  category: string;
  city: string;
  department: "59" | "62";
  url: string;
  slotsTaken: number;
  slotsMax: number;
  unlockPriceEur: number;
  publishedAt?: string;
  status: "active" | "ended";
};

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? BRAND.siteUrl).replace(/\/$/, "");
}

/** Offres publiques indexables (sans PII : pas de nom, téléphone, adresse). */
export async function listIndexedPublicOffers(): Promise<IndexedPublicOffer[]> {
  const origin = siteOrigin();
  const auctions = (await listPublicAuctions()).filter(
    (auction) => auction.isTest !== true
  );
  const rows: IndexedPublicOffer[] = [];

  for (const auction of auctions) {
    const workRequest = await getWorkRequestByAuctionId(auction.id);
    const pricing = resolveUnlockPricing({
      pricingTier: workRequest?.pricingTier,
      workOptionId: workRequest?.workOptionId,
    });
    rows.push({
      id: auction.id,
      title: auction.title,
      category:
        workRequest?.category ??
        CATEGORY_LABELS[auction.category] ??
        auction.title,
      city: auction.city,
      department: auction.department,
      url: `${origin}${publicOfferPath(auction.id)}`,
      slotsTaken: auction.acceptedArtisansCount,
      slotsMax: auction.maxAcceptedArtisans,
      unlockPriceEur: pricing.unlockPriceEur,
      publishedAt: auction.publishedAt,
      status: auction.status,
    });
  }

  return rows;
}
