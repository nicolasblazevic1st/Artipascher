import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  boostDailyEnrichmentBudget,
  MAX_SINGLE_DAILY_BOOST,
} from "@/lib/places-quota";

/** POST { extra: number } — augmente exceptionnellement le budget Places du jour. */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let extra = 0;
  try {
    const body = await request.json();
    extra = typeof body.extra === "number" ? body.extra : Number(body.extra);
  } catch {
    return NextResponse.json(
      { error: "Corps JSON invalide. Attendu : { extra: number }." },
      { status: 400 }
    );
  }

  try {
    const result = await boostDailyEnrichmentBudget(extra);
    return NextResponse.json({
      ok: true,
      ...result,
      maxSingleBoost: MAX_SINGLE_DAILY_BOOST,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Boost impossible." },
      { status: 400 }
    );
  }
}
