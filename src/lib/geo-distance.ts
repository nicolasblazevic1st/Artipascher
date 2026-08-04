export interface LatLon {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distance orthodromique en kilomètres (Haversine). */
export function haversineKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function filterWithinRadius<T extends LatLon>(
  origin: LatLon,
  items: T[],
  radiusKm: number
): Array<T & { distanceKm: number }> {
  const out: Array<T & { distanceKm: number }> = [];
  for (const item of items) {
    if (!Number.isFinite(item.lat) || !Number.isFinite(item.lon)) continue;
    const distanceKm = haversineKm(origin, item);
    if (distanceKm <= radiusKm) {
      out.push({ ...item, distanceKm });
    }
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm);
}

export function defaultNearbyRadiusKm(): number {
  const n = Number(process.env.NEARBY_BUSINESS_RADIUS_KM ?? 20);
  return Number.isFinite(n) && n > 0 ? n : 20;
}
