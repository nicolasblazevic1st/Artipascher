import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://artipascher.fr";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/icon.png", "/favicon-48.png", "/apple-icon.png", "/site.webmanifest"],
    },
    sitemap: `${baseUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
