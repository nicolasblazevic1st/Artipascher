import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

/**
 * Zones privées / techniques : non indexables.
 * Préfixe sans slash final = bloque aussi /admin, /admin/foo, etc. (robots Google).
 * `/pro` bloquerait aussi `/professionnel` (préfixe) : Allow plus long gagne.
 * `/api` bloquerait le flux public : Allow `/api/public` plus long gagne.
 */
const PRIVATE_PREFIXES = [
  "/admin",
  "/pro",
  "/api",
  "/particulier/espace",
] as const;

const PUBLIC_ALLOWS = ["/", "/professionnel", "/api/public"] as const;

const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot",
  "Amazonbot",
] as const;

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? BRAND.siteUrl
  ).replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: [...PUBLIC_ALLOWS],
        disallow: [...PRIVATE_PREFIXES],
      },
      {
        userAgent: [...AI_CRAWLERS],
        allow: [...PUBLIC_ALLOWS],
        disallow: [...PRIVATE_PREFIXES],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
