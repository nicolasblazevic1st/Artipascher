/** Géocodage via API Adresse (data.gouv.fr). */

export interface GeoCoordinates {
  lat: number;
  lon: number;
  city: string;
  department: string;
  postcode?: string;
}

interface AdresseApiResponse {
  features?: Array<{
    geometry?: { coordinates?: [number, number] };
    properties?: {
      city?: string;
      postcode?: string;
      context?: string;
    };
  }>;
}

export async function geocodeCity(
  city: string,
  department: "59" | "62"
): Promise<GeoCoordinates | null> {
  const query = encodeURIComponent(city.trim());
  const url = `https://api-adresse.data.gouv.fr/search/?q=${query}&limit=5`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as AdresseApiResponse;
    const feature =
      data.features?.find((f) => f.properties?.context?.includes(department)) ??
      data.features?.[0];

    const coords = feature?.geometry?.coordinates;
    if (!coords) return null;

    return {
      lon: coords[0],
      lat: coords[1],
      city: feature.properties?.city ?? city,
      department,
      postcode: feature.properties?.postcode,
    };
  } catch {
    return null;
  }
}
