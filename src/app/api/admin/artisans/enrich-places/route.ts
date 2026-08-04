import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { runDailyPlacesEnrichment } from "@/lib/places-quota";

export async function POST(_request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const result = await runDailyPlacesEnrichment();
  return NextResponse.json({ ok: true, result });
}
