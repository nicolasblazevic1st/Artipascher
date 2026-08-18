import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { purgeArtisansOutsidePlatformNaf } from "@/lib/artisans-db";
import { listPlatformCategoryNafCodes } from "@/lib/naf-codes";

/**
 * POST { mode?: "close" | "delete" }
 * Garde uniquement les artisans dont le NAF est l’un des 22 codes des 16 métiers.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let mode: "close" | "delete" = "close";
  try {
    const body = await request.json();
    if (body?.mode === "delete") mode = "delete";
  } catch {
    // ok — défaut close
  }

  const result = await purgeArtisansOutsidePlatformNaf({ mode });
  return NextResponse.json({
    ok: true,
    platformNafCount: listPlatformCategoryNafCodes().length,
    platformNafCodes: listPlatformCategoryNafCodes(),
    result,
  });
}
