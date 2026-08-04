import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getArtisansStats } from "@/lib/artisans-db";
import { computeDailyEnrichmentBudget } from "@/lib/places-quota";
import { isGooglePlacesEnabled } from "@/lib/google-places";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const stats = await getArtisansStats();
  const daily = await computeDailyEnrichmentBudget();

  return NextResponse.json({
    ...stats,
    placesEnabled: isGooglePlacesEnabled(),
    dailyBudget: daily,
  });
}
