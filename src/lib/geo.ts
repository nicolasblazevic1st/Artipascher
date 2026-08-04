/** Géocodage via API Adresse (data.gouv.fr). */

export interface GeoCoordinates {
  lat: number;
  lon: number;
  city: string;
  department: string;
  postcode?: string;
  label?: string;
}

interface AdresseApiResponse {
  features?: Array<{
    geometry?: { coordinates?: [number, number] };
    properties?: {
      city?: string;
      postcode?: string;
      context?: string;
      label?: string;
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
      label: feature.properties?.label,
    };
  } catch {
    return null;
  }
}

/** Géocode une adresse postale complète (BAN). */
export async function geocodeAddress(
  addressLine: string,
  postalCode?: string,
  city?: string
): Promise<GeoCoordinates | null> {
  const parts = [addressLine, postalCode, city].filter(Boolean).join(" ").trim();
  if (!parts) return null;

  const url = new URL("https://api-adresse.data.gouv.fr/search/");
  url.searchParams.set("q", parts);
  url.searchParams.set("limit", "1");
  if (postalCode) url.searchParams.set("postcode", postalCode);

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as AdresseApiResponse;
    const feature = data.features?.[0];
    const coords = feature?.geometry?.coordinates;
    if (!coords) return null;
    const context = feature?.properties?.context ?? "";
    const deptMatch = context.match(/\b(59|62)\b/);
    return {
      lon: coords[0],
      lat: coords[1],
      city: feature?.properties?.city ?? city ?? "",
      department: deptMatch?.[1] ?? "",
      postcode: feature?.properties?.postcode ?? postalCode,
      label: feature?.properties?.label,
    };
  } catch {
    return null;
  }
}
