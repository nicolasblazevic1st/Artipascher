import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isCronAuthorized } from "@/lib/cron-auth";
import { runDailyPlacesEnrichment } from "@/lib/places-quota";

export async function POST(request: NextRequest) {
  const admin = await isAdminAuthenticated();
  if (!admin && !isCronAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const result = await runDailyPlacesEnrichment();
  return NextResponse.json({ ok: true, result });
}
