import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? BRAND.siteUrl
  ).replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/pro",
          "/pro/",
          "/api",
          "/api/",
          "/particulier/espace",
          "/particulier/espace/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
