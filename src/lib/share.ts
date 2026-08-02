import { randomBytes } from "crypto";
import type { WorkRequest } from "./store-types";
import { formatPrice } from "./data";

export function getSiteOrigin(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (url) return url.replace(/\/$/, "");
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
  return `Enchère inversée : ${request.category} à ${request.city} (${request.department})`;
}

export function buildShareText(
  request: Pick<WorkRequest, "category" | "city" | "department" | "budget">
): string {
  return `${buildShareTitle(request)} — budget max ${formatPrice(request.budget)}. Artisans du Nord, enchérissez sur Artipascher !`;
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
