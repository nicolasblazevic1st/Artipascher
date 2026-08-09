import { randomBytes } from "crypto";
import type { WorkRequest } from "./store-types";

function isUsablePublicOrigin(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (!host || host === "0.0.0.0" || host === "::" || host === "[::]") {
      return false;
    }
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Origine publique (jamais 0.0.0.0 — Next bind souvent sur cette adresse). */
export function getSiteOrigin(request?: {
  headers: Headers;
  nextUrl?: { origin: string };
}): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv && isUsablePublicOrigin(fromEnv)) return fromEnv;

  if (request) {
    const forwardedHost =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto =
      request.headers.get("x-forwarded-proto") ??
      (forwardedHost?.includes("localhost") ? "http" : "https");
    if (forwardedHost) {
      const host = forwardedHost.split(",")[0]?.trim();
      if (host) {
        const candidate = `${proto}://${host}`.replace(/\/$/, "");
        if (isUsablePublicOrigin(candidate)) return candidate;
      }
    }
    const origin = request.nextUrl?.origin;
    if (origin && isUsablePublicOrigin(origin)) return origin.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${getSiteOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function createShareToken(): string {
  return randomBytes(12).toString("base64url");
}

export function getPublicSharePath(shareToken: string): string {
  return `/enchere/partage/${shareToken}`;
}

export function getPublicShareUrl(shareToken: string): string {
  return `${getSiteOrigin()}${getPublicSharePath(shareToken)}`;
}

export function buildShareTitle(request: Pick<WorkRequest, "category" | "city" | "department">): string {
  return `Offre travaux : ${request.category} à ${request.city} (${request.department})`;
}

export function buildShareText(
  request: Pick<WorkRequest, "category" | "city" | "department" | "startPrice">
): string {
  const title = buildShareTitle(request);
  return `${title}. Artisans du Nord-Pas-de-Calais : débloquez le contact sur Artipascher pour joindre le client.`;
}

export function buildFacebookShareUrl(pageUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
}

export function buildLinkedInShareUrl(pageUrl: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
}

export function buildWhatsAppShareUrl(text: string, pageUrl: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${pageUrl}`)}`;
}

export function buildXShareUrl(text: string, pageUrl: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`;
}

export function isAuctionStillActive(endsAt?: string): boolean {
  if (!endsAt) return true;
  return new Date(endsAt).getTime() > Date.now();
}
