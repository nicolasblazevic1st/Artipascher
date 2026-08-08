import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { backfillArtisanGeocodes } from "@/lib/artisans-geocode-backfill";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let limit = 200;
  let delayMs = 40;
  try {
    const body = await request.json();
    if (typeof body.limit === "number") {
      limit = Math.max(1, Math.min(2000, Math.floor(body.limit)));
    }
    if (typeof body.delayMs === "number") {
      delayMs = Math.max(0, Math.min(500, Math.floor(body.delayMs)));
    }
  } catch {
    // defaults
  }

  const result = await backfillArtisanGeocodes({ limit, delayMs });
  return NextResponse.json({ ok: true, result });
}
