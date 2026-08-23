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
          "X-Goog-FieldMask": "places.id,places.displayName",
        },
        body: JSON.stringify({
          textQuery,
          languageCode: "fr",
          regionCode: "FR",
          maxResultCount: 1,
        }),
      }
    );
    requestsUsed += 1;

    const searchBody = await readPlacesJson<{
      places?: Array<{ id?: string }>;
    }>(searchRes);
    if (!searchRes.ok) {
      return {
        ok: false,
        matched: false,
        requestsUsed,
        error: `Places Text Search HTTP ${searchRes.status}: ${searchBody.raw.slice(0, 200)}`,
      };
    }
    if (searchBody.error) {
      return {
        ok: false,
        matched: false,
        requestsUsed,
        error: `Places Text Search: ${searchBody.error}`,
      };
    }

    const placeId = searchBody.data?.places?.[0]?.id;
    if (!placeId) {
      return { ok: true, matched: false, requestsUsed };
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
        error: `Places Details HTTP ${detailsRes.status}: ${detailsBody.raw.slice(0, 200)}`,
      };
    }
    if (detailsBody.error || !detailsBody.data) {
      return {
        ok: false,
        matched: true,
        requestsUsed,
        placeId,
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
