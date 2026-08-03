import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://artipascher.fr").replace(
    /\/$/,
    ""
  );

  const routes = [
    "",
    "/particulier",
    "/professionnel",
    "/encheres",
    "/comment-ca-marche",
    "/faq",
  ];

  return routes.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/encheres" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.8,
  }));
}
