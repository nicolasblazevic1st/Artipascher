import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://artipascher.fr";

  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/favicon.ico",
        "/favicon-48.png",
        "/favicon-96.png",
        "/icon.png",
        "/apple-icon.png",
        "/brand-icon.svg",
        "/site.webmanifest",
      ],
    },
    sitemap: `${baseUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
