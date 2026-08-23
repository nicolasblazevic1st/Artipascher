import { normalizeFrenchMobile } from "./sms";

export interface PlacesLookupResult {
  ok: boolean;
  phone?: string;
  website?: string;
  /** Note Google Maps (1.0–5.0). */
  rating?: number;
  /** Nombre d’avis Google. */
  userRatingCount?: number;
  matched: boolean;
  /** Nombre d'appels HTTP Google facturés (Search + Details). */
  requestsUsed: number;
  textSearchUsed?: number;
  placeDetailsUsed?: number;
  error?: string;
  placeId?: string;
}

function placesApiKey(): string | undefined {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || undefined;
}

async function readPlacesJson<T>(res: Response): Promise<{
  data?: T;
  raw: string;
  error?: string;
}> {
  const raw = await res.text();
  if (!raw.trim()) {
    return { raw, error: "réponse vide" };
  }
  try {
    return { data: JSON.parse(raw) as T, raw };
  } catch {
    return { raw, error: `JSON invalide (${raw.slice(0, 80)})` };
  }
}

function foldName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(sarl|sas|sasu|eurl|ei|eirl|sa|sci|snc|ste|societe)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameTokens(value: string): string[] {
  return foldName(value)
    .split(" ")
    .filter((token) => token.length > 0);
}

/** Refuse un homonyme Google trop éloigné du nom SIRENE. */
export function placesNameMatchesCompany(
  companyName: string,
  googleName?: string
): boolean {
  if (!googleName?.trim()) return false;
  const company = foldName(companyName);
  const google = foldName(googleName);
  if (!company || !google) return false;
  if (company === google) return true;
  // Jamais l’inverse : « PETIT(X) » contient « petit » et collerait une autre fiche.
  if (company.length >= 4 && google.includes(company)) return true;

  const companyTokens = new Set(nameTokens(companyName));
  const googleTokens = new Set(nameTokens(googleName));
  const overlap = [...companyTokens].filter((token) => googleTokens.has(token));
  if (overlap.length === 0) return false;
  if (companyTokens.size <= 2) return overlap.length === companyTokens.size;
  return overlap.length / companyTokens.size >= 0.6;
}

function addressContainsLocality(
  formattedAddress: string | undefined,
  postalCode?: string,
  city?: string
): boolean {
  if (!formattedAddress?.trim()) return !city && !postalCode;
  const hay = foldName(formattedAddress);
  const zip = postalCode?.replace(/\D/g, "") ?? "";
  if (zip && formattedAddress.replace(/\D/g, "").includes(zip)) return true;
  const cityFold = city ? foldName(city) : "";
  return Boolean(cityFold && hay.includes(cityFold));
}

export function isGooglePlacesEnabled(): boolean {
  // Opt-in strict : jamais d'appel sans GOOGLE_PLACES_ENABLED=true
  // (les requêtes Places sont précieuses — à activer seulement en prod pour tester).
  return (
    process.env.GOOGLE_PLACES_ENABLED === "true" && Boolean(placesApiKey())
  );
}

/**
 * Text Search + Place Details avec FieldMask minimal (téléphone + site).
 * Places API (New).
 */
export async function lookupPlacePhone(query: {
  companyName: string;
  addressLine?: string;
  postalCode?: string;
  city?: string;
}): Promise<PlacesLookupResult> {
  const key = placesApiKey();
  if (!key) {
    return {
      ok: false,
      matched: false,
      requestsUsed: 0,
      error: "GOOGLE_PLACES_API_KEY manquant.",
    };
  }

  const textQuery = [query.companyName, query.addressLine, query.postalCode, query.city]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!textQuery) {
    return {
      ok: false,
      matched: false,
      requestsUsed: 0,
      error: "Requête Places vide.",
    };
  }

  let requestsUsed = 0;

  try {
    const searchRes = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress",
        },
        body: JSON.stringify({
          textQuery,
          languageCode: "fr",
          regionCode: "FR",
          maxResultCount: 5,
        }),
      }
    );
    requestsUsed += 1;

    const searchBody = await readPlacesJson<{
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
      }>;
    }>(searchRes);
    if (!searchRes.ok) {
      return {
        ok: false,
        matched: false,
        requestsUsed,
        textSearchUsed: 1,
        placeDetailsUsed: 0,
        error: `Places Text Search HTTP ${searchRes.status}: ${searchBody.raw.slice(0, 200)}`,
      };
    }
    if (searchBody.error) {
      return {
        ok: false,
        matched: false,
        requestsUsed,
        textSearchUsed: 1,
        placeDetailsUsed: 0,
        error: `Places Text Search: ${searchBody.error}`,
      };
    }

    const candidates = searchBody.data?.places ?? [];
    const chosen = candidates.find((place) => {
      const googleName = place.displayName?.text;
      if (!placesNameMatchesCompany(query.companyName, googleName)) {
        return false;
      }
      return addressContainsLocality(
        place.formattedAddress,
        query.postalCode,
        query.city
      );
    });
    const placeId = chosen?.id;
    if (!placeId) {
      return {
        ok: true,
        matched: false,
        requestsUsed,
        textSearchUsed: 1,
        placeDetailsUsed: 0,
      };
    }

    const detailsRes = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask":
            "id,nationalPhoneNumber,internationalPhoneNumber,websiteUri,rating,userRatingCount",
        },
      }
    );
    requestsUsed += 1;

    const detailsBody = await readPlacesJson<{
      nationalPhoneNumber?: string;
      internationalPhoneNumber?: string;
      websiteUri?: string;
      rating?: number;
      userRatingCount?: number;
    }>(detailsRes);
    if (!detailsRes.ok) {
      return {
        ok: false,
        matched: true,
        requestsUsed,
        placeId,
        textSearchUsed: 1,
        placeDetailsUsed: 1,
        error: `Places Details HTTP ${detailsRes.status}: ${detailsBody.raw.slice(0, 200)}`,
      };
    }
    if (detailsBody.error || !detailsBody.data) {
      return {
        ok: false,
        matched: true,
        requestsUsed,
        placeId,
        textSearchUsed: 1,
        placeDetailsUsed: 1,
        error: `Places Details: ${detailsBody.error ?? "réponse vide"}`,
      };
    }

    const details = detailsBody.data;

    const rawPhone =
      details.nationalPhoneNumber ?? details.internationalPhoneNumber ?? "";
    const phone =
      (rawPhone && normalizeFrenchMobile(rawPhone) ? rawPhone.trim() : undefined) ??
      (rawPhone.trim() || undefined);

    return {
      ok: true,
      matched: true,
      requestsUsed,
      textSearchUsed: 1,
      placeDetailsUsed: 1,
      placeId,
      phone,
      website: details.websiteUri?.trim() || undefined,
      rating:
        typeof details.rating === "number" && Number.isFinite(details.rating)
          ? details.rating
          : undefined,
      userRatingCount:
        typeof details.userRatingCount === "number" &&
        Number.isFinite(details.userRatingCount)
          ? details.userRatingCount
          : undefined,
    };
  } catch (e) {
    return {
      ok: false,
      matched: false,
      requestsUsed,
      error: e instanceof Error ? e.message : "Erreur Places inconnue.",
    };
  }
}
