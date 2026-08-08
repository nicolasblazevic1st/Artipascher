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

export function getClientUserAgent(request: NextRequest): string {
  return (request.headers.get("user-agent") ?? "unknown").slice(0, 512);
}
