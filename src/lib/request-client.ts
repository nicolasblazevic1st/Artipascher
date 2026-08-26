import { isIP } from "node:net";
import type { NextRequest } from "next/server";

/** IP client derrière reverse proxy (Nginx / OVH). */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/** IPv4 / IPv6 worth storing. Drops "unknown" and non-IP garbage. */
export function normalizeStoredClientIp(
  value: string | undefined | null
): string | undefined {
  if (!value) return undefined;
  const raw = value.trim();
  if (!raw || raw === "unknown") return undefined;
  const mapped = raw.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  const candidate = mapped?.[1] ?? raw;
  if (candidate.length > 45) return undefined;
  if (isIP(candidate) === 0) return undefined;
  return candidate;
}

export function getClientUserAgent(request: NextRequest): string {
  return (request.headers.get("user-agent") ?? "unknown").slice(0, 512);
}
