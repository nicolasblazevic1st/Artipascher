import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

/**
 * Zones privées / techniques : non indexables.
 * Préfixe sans slash final = bloque aussi /admin, /admin/foo, etc. (robots Google).
 */
const PRIVATE_PREFIXES = [
  "/admin",
  "/pro",
  "/api",
  "/particulier/espace",
] as const;

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? BRAND.siteUrl
  ).replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...PRIVATE_PREFIXES],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
