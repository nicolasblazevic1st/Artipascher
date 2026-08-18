/**
 * Backfill lat/lon via API Adresse (BAN) pour les artisans sans GPS.
 */

import {
  addEnrichmentJob,
  applyArtisanCoordinates,
  listArtisans,
} from "./artisans-db";
import type { EnrichedArtisan } from "./artisans-types";
import { geocodeAddress, geocodeCity } from "./geo";

export interface GeocodeBackfillResult {
  missingBefore: number;
  attempted: number;
  geocoded: number;
  failed: number;
  remaining: number;
  limit: number;
  errors: string[];
}

function hasCoords(a: EnrichedArtisan): boolean {
  return (
    typeof a.lat === "number" &&
    typeof a.lon === "number" &&
    Number.isFinite(a.lat) &&
    Number.isFinite(a.lon)
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocodeArtisan(
  a: EnrichedArtisan
): Promise<{ lat: number; lon: number } | null> {
  if (a.addressLine?.trim() || a.postalCode || a.city) {
    const byAddress = await geocodeAddress(
      a.addressLine ?? "",
      a.postalCode,
      a.city
    );
    if (byAddress) {
      return { lat: byAddress.lat, lon: byAddress.lon };
    }
  }

  if (a.city?.trim()) {
    const byCity = await geocodeCity(a.city, a.department);
    if (byCity) {
      return { lat: byCity.lat, lon: byCity.lon };
    }
  }

  return null;
}

/**
 * Géocode jusqu’à `limit` établissements actifs sans coords.
 * Relancer plusieurs fois jusqu’à remaining = 0.
 */
export async function backfillArtisanGeocodes(options?: {
  limit?: number;
  delayMs?: number;
}): Promise<GeocodeBackfillResult> {
  const limit = Math.min(2000, Math.max(1, options?.limit ?? 200));
  const delayMs = Math.max(0, options?.delayMs ?? 40);

  const active = await listArtisans({ status: "active" });
  const missing = active.filter((a) => !hasCoords(a));
  const missingBefore = missing.length;
  const batch = missing.slice(0, limit);

  let geocoded = 0;
  let failed = 0;
  const errors: string[] = [];
  const pendingWrites: Array<{ siret: string; lat: number; lon: number }> = [];

  async function flush() {
    if (pendingWrites.length === 0) return;
    await applyArtisanCoordinates(pendingWrites.splice(0, pendingWrites.length));
  }

  for (let i = 0; i < batch.length; i++) {
    const a = batch[i];
    try {
      const coords = await geocodeArtisan(a);
      if (coords) {
        pendingWrites.push({ siret: a.siret, ...coords });
        geocoded += 1;
      } else {
        failed += 1;
      }
    } catch (err) {
      failed += 1;
      if (errors.length < 20) {
        errors.push(
          `${a.siret}: ${err instanceof Error ? err.message : "erreur"}`
        );
      }
    }

    if (pendingWrites.length >= 50) {
      await flush();
    }

    if (delayMs > 0 && i < batch.length - 1) {
      await sleep(delayMs);
    }
  }

  await flush();

  const remaining = Math.max(0, missingBefore - geocoded);
  const now = new Date().toISOString();

  await addEnrichmentJob({
    kind: "geocode_backfill",
    ranAt: now,
    requestsSpent: batch.length,
    processed: geocoded,
    skipped: failed,
    errors,
    note: `limit=${limit} missingBefore=${missingBefore} remaining=${remaining}`,
  });

  return {
    missingBefore,
    attempted: batch.length,
    geocoded,
    failed,
    remaining,
    limit,
    errors,
  };
}
