import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function sitemap(): MetadataRoute.Sitemap {
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
    { path: "/professionnel", changeFrequency: "weekly", priority: 0.9 },
    { path: "/encheres", changeFrequency: "daily", priority: 0.85 },
    { path: "/comment-ca-marche", changeFrequency: "monthly", priority: 0.7 },
    { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
    { path: "/mentions-legales", changeFrequency: "yearly", priority: 0.3 },
    { path: "/cgu", changeFrequency: "yearly", priority: 0.3 },
    { path: "/cgv", changeFrequency: "yearly", priority: 0.3 },
    { path: "/confidentialite", changeFrequency: "yearly", priority: 0.3 },
    { path: "/cookies", changeFrequency: "yearly", priority: 0.3 },
  ];

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
