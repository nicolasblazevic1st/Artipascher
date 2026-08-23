import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";
import { listPublicAuctions } from "@/lib/work-request-auctions";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? BRAND.siteUrl
  ).replace(/\/$/, "");

  const routes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"];
    priority: number;
  }> = [
    { path: "", changeFrequency: "daily", priority: 1 },
    { path: "/particulier", changeFrequency: "weekly", priority: 0.9 },
    { path: "/particulier/demande", changeFrequency: "weekly", priority: 0.95 },
    { path: "/professionnel", changeFrequency: "weekly", priority: 0.9 },
    { path: "/offres", changeFrequency: "daily", priority: 0.85 },
    { path: "/comment-ca-marche", changeFrequency: "monthly", priority: 0.7 },
    { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
    { path: "/mentions-legales", changeFrequency: "yearly", priority: 0.3 },
    { path: "/cgu", changeFrequency: "yearly", priority: 0.3 },
    { path: "/cgv", changeFrequency: "yearly", priority: 0.3 },
    { path: "/confidentialite", changeFrequency: "yearly", priority: 0.3 },
    { path: "/cookies", changeFrequency: "yearly", priority: 0.3 },
  ];

  const staticUrls: MetadataRoute.Sitemap = routes.map(
    ({ path, changeFrequency, priority }) => ({
      url: `${baseUrl}${path}`,
      changeFrequency,
      priority,
    })
  );

  let listingUrls: MetadataRoute.Sitemap = [];
  try {
    const auctions = await listPublicAuctions();
    listingUrls = auctions
      .filter((auction) => auction.isTest !== true)
      .map((auction) => ({
        url: `${baseUrl}/offres/${auction.id}`,
        changeFrequency: "daily" as const,
        priority: 0.6,
      }));
  } catch (err) {
    console.error("[sitemap] public listings omitted", err);
  }

  return [...staticUrls, ...listingUrls];
}
