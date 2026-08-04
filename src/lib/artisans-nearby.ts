import { listArtisans } from "./artisans-db";
import type { EnrichedArtisan } from "./artisans-types";
import {
  defaultNearbyRadiusKm,
  filterWithinRadius,
  type LatLon,
} from "./geo-distance";
import { geocodeCity } from "./geo";
import { enrichNearbyForProduction } from "./places-quota";
import type { WorkRequest } from "./store-types";

export async function resolveWorkRequestOrigin(
  request: WorkRequest
): Promise<LatLon | null> {
  const coords = await geocodeCity(request.city, request.department);
  if (!coords) return null;
  return { lat: coords.lat, lon: coords.lon };
}

/**
 * Artisans actifs dans le rayon, avec enrichissement Places production
 * (non bloqué par le quota) pour ceux sans téléphone.
 */
export async function getArtisansNearWorkRequest(
  request: WorkRequest,
  options?: {
    radiusKm?: number;
    enrichProduction?: boolean;
    maxEnrich?: number;
  }
): Promise<{
  origin: LatLon | null;
  artisans: Array<EnrichedArtisan & { distanceKm: number }>;
  enrichment?: { enriched: number; requestsUsed: number; errors: string[] };
}> {
  const origin = await resolveWorkRequestOrigin(request);
  if (!origin) {
    return { origin: null, artisans: [] };
  }

  const radiusKm = options?.radiusKm ?? defaultNearbyRadiusKm();
  const active = (await listArtisans({ status: "active" })).filter(
    (a) =>
      a.department === request.department &&
      !a.optedOut &&
      a.lat != null &&
      a.lon != null
  );

  let nearby = filterWithinRadius(
    origin,
    active as Array<EnrichedArtisan & LatLon>,
    radiusKm
  );

  let enrichment:
    | { enriched: number; requestsUsed: number; errors: string[] }
    | undefined;

  if (options?.enrichProduction !== false) {
    enrichment = await enrichNearbyForProduction(nearby, {
      maxArtisans: options?.maxEnrich ?? 30,
    });
    // Re-read phones after enrichment
    const refreshed = await listArtisans({ status: "active" });
    const bySiret = new Map(refreshed.map((a) => [a.siret, a]));
    nearby = nearby.map((a) => {
      const fresh = bySiret.get(a.siret);
      return fresh
        ? { ...fresh, lat: fresh.lat!, lon: fresh.lon!, distanceKm: a.distanceKm }
        : a;
    });
  }

  return { origin, artisans: nearby, enrichment };
}
