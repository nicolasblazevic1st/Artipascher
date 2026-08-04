import { NextRequest, NextResponse } from "next/server";

/** Auth cron : Bearer CRON_SECRET, ou session admin. */
export function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return token === secret;
}
