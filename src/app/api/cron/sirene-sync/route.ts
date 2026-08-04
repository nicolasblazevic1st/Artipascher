import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isCronAuthorized } from "@/lib/cron-auth";
import { syncSireneWeekly } from "@/lib/sirene-extract";

export async function POST(request: NextRequest) {
  const admin = await isAdminAuthenticated();
  if (!admin && !isCronAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let maxPagesPerNaf = 4;
  let markMissingClosed = false;
  try {
    const body = await request.json();
    if (typeof body.maxPagesPerNaf === "number") {
      maxPagesPerNaf = Math.max(1, Math.min(20, Math.floor(body.maxPagesPerNaf)));
    }
    if (body.markMissingClosed === true) markMissingClosed = true;
  } catch {
    // empty body ok
  }

  const result = await syncSireneWeekly({
    maxPagesPerNaf,
    markMissingClosed,
    geocodeMissing: true,
  });

  return NextResponse.json({ ok: true, result });
}
