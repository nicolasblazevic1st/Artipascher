/**
 * Base Adresse Nationale (BAN) — API État data.gouv.fr
 * https://adresse.data.gouv.fr/api-doc/adresse
 */

import { departmentFromPostalCode } from "./client-address";

const BAN_SEARCH_URL = "https://api-adresse.data.gouv.fr/search/";

export interface BanAddressFeature {
  id: string;
  label: string;
  name: string;
  postcode: string;
  city: string;
  citycode: string;
  department: string;
  type: string;
  score: number;
  lat: number;
  lon: number;
}

interface BanApiFeature {
  type: string;
  geometry?: { type: string; coordinates?: [number, number] };
  properties?: {
    id?: string;
    label?: string;
    name?: string;
    postcode?: string;
    city?: string;
    citycode?: string;
    context?: string;
    type?: string;
    score?: number;
  };
}

interface BanApiResponse {
  features?: BanApiFeature[];
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function mapFeature(feature: BanApiFeature): BanAddressFeature | null {
  const props = feature.properties;
  const coords = feature.geometry?.coordinates;
  if (!props?.label || !props.name || !props.postcode || !props.city || !coords) return null;

  const department = props.postcode.slice(0, 2);
  if (department !== "59" && department !== "62") return null;

  return {
    id: props.id ?? `${props.postcode}-${props.name}-${coords.join(",")}`,
    label: props.label,
    name: props.name,
    postcode: props.postcode,
    city: props.city,
    citycode: props.citycode ?? "",
    department,
    type: props.type ?? "unknown",
    score: props.score ?? 0,
    lon: coords[0],
    lat: coords[1],
  };
}

export async function searchBanAddresses(
  query: string,
  limit = 6,
  options?: { type?: "housenumber" | "street" | "locality" | "municipality" }
): Promise<BanAddressFeature[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const params = new URLSearchParams({
    q: trimmed,
    limit: String(limit),
    autocomplete: "1",
  });
  if (options?.type) {
    params.set("type", options.type);
  }

  try {
    const response = await fetch(`${BAN_SEARCH_URL}?${params}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];

    const data = (await response.json()) as BanApiResponse;
    return (data.features ?? [])
      .map(mapFeature)
      .filter((f): f is BanAddressFeature => f !== null);
  } catch {
    return [];
  }
}

/** Recherche de communes 59/62 (pour filtre géographique). */
export async function searchBanMunicipalities(
  query: string,
  limit = 8
): Promise<BanAddressFeature[]> {
  return searchBanAddresses(query, limit, { type: "municipality" });
}

export interface BanAddressVerificationInput {
  addressLine: string;
  postalCode: string;
  city: string;
  banAddressId?: string;
}

export interface BanAddressVerificationResult {
  valid: boolean;
  feature?: BanAddressFeature;
  error?: string;
}

const MIN_BAN_SCORE = 0.55;

function featuresMatchSelection(
  feature: BanAddressFeature,
  input: BanAddressVerificationInput
): boolean {
  if (input.banAddressId && feature.id === input.banAddressId) return true;

  const postcodeOk = feature.postcode === input.postalCode.trim();
  const cityOk =
    normalizeText(feature.city) === normalizeText(input.city) ||
    feature.label.toLowerCase().includes(normalizeText(input.city));

  const inputStreet = normalizeText(input.addressLine);
  const featureStreet = normalizeText(feature.name);
  const streetOk =
    featureStreet.includes(inputStreet) ||
    inputStreet.includes(featureStreet) ||
    normalizeText(feature.label).includes(inputStreet);

  return postcodeOk && cityOk && streetOk && feature.score >= MIN_BAN_SCORE;
}

export async function verifyBanAddress(
  input: BanAddressVerificationInput
): Promise<BanAddressVerificationResult> {
  const addressLine = input.addressLine.trim();
  const postalCode = input.postalCode.trim();
  const city = input.city.trim();

  const department = departmentFromPostalCode(postalCode);
  if (!department) {
    return {
      valid: false,
      error: "Code postal hors zone Nord Artisan Pro (59 ou 62 uniquement).",
    };
  }

  const query = `${addressLine} ${postalCode} ${city}`;
  const candidates = await searchBanAddresses(query, 8);

  if (candidates.length === 0) {
    return {
      valid: false,
      error:
        "Adresse introuvable au registre officiel (BAN). Sélectionnez une suggestion ou vérifiez l'orthographe.",
    };
  }

  const match =
    (input.banAddressId
      ? candidates.find((f) => f.id === input.banAddressId)
      : undefined) ?? candidates.find((f) => featuresMatchSelection(f, input));

  if (!match) {
    return {
      valid: false,
      error:
        "Adresse non confirmée par la Base Adresse Nationale. Choisissez une adresse dans la liste proposée.",
    };
  }

  if (match.score < MIN_BAN_SCORE) {
    return {
      valid: false,
      error:
        "Adresse trop imprécise. Précisez le numéro de voie et sélectionnez la suggestion officielle.",
    };
  }

  return { valid: true, feature: match };
}

export function banFeatureToStoredAddress(feature: BanAddressFeature) {
  return {
    addressLine: feature.name,
    postalCode: feature.postcode,
    city: feature.city,
    department: feature.department as "59" | "62",
    banAddressId: feature.id,
    latitude: feature.lat,
    longitude: feature.lon,
  };
}
