import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  searchArtisansForChantier,
  type CompanyAgeCohort,
} from "@/lib/artisans-for-chantier";
import { defaultNearbyRadiusKm } from "@/lib/geo-distance";
import { isGooglePlacesEnabled } from "@/lib/google-places";
import { resolveWorkRequestNafCodes } from "@/lib/naf-codes";
import { ensureWorkRequestNafCodes } from "@/lib/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await context.params;
  const workRequest = await ensureWorkRequestNafCodes(id);

  if (!workRequest) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  const { searchParams } = request.nextUrl;
  const radiusRaw = Number(searchParams.get("radiusKm") ?? defaultNearbyRadiusKm());
  const radiusKm =
    Number.isFinite(radiusRaw) && radiusRaw > 0
      ? Math.min(80, Math.max(1, radiusRaw))
      : defaultNearbyRadiusKm();

  const ageParam = searchParams.get("ageCohort") ?? "all";
  const ageCohort = (
    ["all", "young", "established"].includes(ageParam) ? ageParam : "all"
  ) as CompanyAgeCohort | "all";

  const phoneParam = searchParams.get("hasPhone") ?? "all";
  const hasPhone = (
    ["all", "yes", "no"].includes(phoneParam) ? phoneParam : "all"
  ) as "all" | "yes" | "no";

  const limitRaw = Number(searchParams.get("limit") ?? 100);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(500, Math.max(1, Math.floor(limitRaw)))
    : 100;

  const result = await searchArtisansForChantier(workRequest, {
    radiusKm,
    ageCohort,
    hasPhone,
    limit,
    // Liste admin = vivier réel. La note Google client ne doit pas vider la table.
    ignoreMinGoogleRating: true,
  });

  return NextResponse.json({
    requestId: id,
    city: workRequest.city,
    department: workRequest.department,
    category: workRequest.category,
    clientMinGoogleRating: workRequest.minGoogleRating ?? null,
    nafCodes: result.nafCodes.length
      ? result.nafCodes
      : resolveWorkRequestNafCodes(workRequest),
    origin: result.origin,
    geoFound: result.geoFound,
    radiusKm: result.radiusKm,
    placesEnabled: isGooglePlacesEnabled(),
    stats: {
      total: result.total,
      withCoords: result.withCoords,
      young: result.young,
      established: result.established,
      withPhone: result.withPhone,
      withRating: result.withRating,
      returned: result.artisans.length,
    },
    artisans: result.artisans,
    filters: { ageCohort, hasPhone, radiusKm, limit },
  });
}
