import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { defaultNearbyRadiusKm } from "@/lib/geo-distance";
import { isGooglePlacesEnabled } from "@/lib/google-places";
import {
  DEFAULT_CHANTIER_PLACES_MAX,
  MAX_CHANTIER_PLACES_MAX,
  enrichArtisansAroundWorkRequest,
} from "@/lib/places-quota";
import { ensureWorkRequestNafCodes } from "@/lib/store";

export const maxDuration = 180;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  if (!isGooglePlacesEnabled()) {
    return NextResponse.json(
      {
        error:
          "Google Places n’est pas activé. Posez GOOGLE_PLACES_ENABLED=true et GOOGLE_PLACES_API_KEY.",
      },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  const workRequest = await ensureWorkRequestNafCodes(id);
  if (!workRequest) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  let body: { radiusKm?: number; maxArtisans?: number } = {};
  try {
    body = (await request.json()) as { radiusKm?: number; maxArtisans?: number };
  } catch {
    body = {};
  }

  const radiusRaw = Number(body.radiusKm ?? defaultNearbyRadiusKm());
  const radiusKm =
    Number.isFinite(radiusRaw) && radiusRaw > 0
      ? Math.min(80, Math.max(1, radiusRaw))
      : defaultNearbyRadiusKm();

  const maxRaw = Number(body.maxArtisans ?? DEFAULT_CHANTIER_PLACES_MAX);
  const maxArtisans = Number.isFinite(maxRaw)
    ? Math.min(MAX_CHANTIER_PLACES_MAX, Math.max(1, Math.floor(maxRaw)))
    : DEFAULT_CHANTIER_PLACES_MAX;

  const result = await enrichArtisansAroundWorkRequest(workRequest, {
    radiusKm,
    maxArtisans,
  });

  return NextResponse.json({
    ok: true,
    requestId: id,
    radiusKm,
    maxArtisans,
    result,
  });
}
