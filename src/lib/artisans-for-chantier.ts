/**
 * Recherche artisans autour d’un chantier (base acquisition locale).
 * Filtres obligatoires : status active + NAF de l’annonce.
 * Tri : distance croissante. Cohortes âge entreprise < / ≥ 5 ans.
 */

import { listArtisans } from "./artisans-db";
import type { EnrichedArtisan } from "./artisans-types";
import { artisanIsRge } from "./rge-verification";
import {
  defaultNearbyRadiusKm,
  haversineKm,
  type LatLon,
} from "./geo-distance";
import { geocodeCity } from "./geo";
import { parseMinGoogleRating } from "./google-rating";
import { resolveWorkRequestNafCodes } from "./naf-codes";
import {
  artisanMatchesNafCodes,
  collectArtisanNafCodes,
  normalizeNafCode,
} from "./naf-trade-groups";
import type { WorkRequest } from "./store-types";

/** Seuil client / campagnes : « 0 à 5 » (< 5 ans) vs « 5+ » (≥ 5 ans). */
export const COMPANY_AGE_THRESHOLD_YEARS = 5;
export const COMPANY_AGE_THRESHOLD_MS =
  COMPANY_AGE_THRESHOLD_YEARS * 365.25 * 24 * 60 * 60 * 1000;

export type CompanyAgeCohort = "young" | "established";

export interface ChantierArtisanRow {
  siret: string;
  siren: string;
  companyName: string;
  city: string;
  postalCode: string;
  department: "59" | "62";
  nafCode: string;
  nafSecondaryCodes?: string[];
  /** NAF qui a déclenché le match (principal ou secondaire). */
  matchedNafCode: string;
  companyCreatedAt?: string;
  ageCohort: CompanyAgeCohort;
  distanceKm: number | null;
  phone?: string;
  website?: string;
  hasPhone: boolean;
  googleRating?: number;
  googleUserRatingCount?: number;
  lat?: number;
  lon?: number;
  source: EnrichedArtisan["source"];
  isRge: boolean;
}

export interface SearchArtisansForChantierResult {
  origin: LatLon | null;
  geoFound: boolean;
  nafCodes: string[];
  radiusKm: number;
  total: number;
  withCoords: number;
  withoutCoords: number;
  young: number;
  established: number;
  withPhone: number;
  withRating: number;
  artisans: ChantierArtisanRow[];
}

/** SIRENE fournit presque toujours la date ; si absente → traité comme 5+ (≥ seuil). */
export function companyAgeCohort(companyCreatedAt?: string): CompanyAgeCohort {
  if (!companyCreatedAt) return "established";
  const t = new Date(companyCreatedAt).getTime();
  if (Number.isNaN(t)) return "established";
  return Date.now() - t < COMPANY_AGE_THRESHOLD_MS ? "young" : "established";
}

async function resolveChantierOrigin(
  request: WorkRequest
): Promise<LatLon | null> {
  if (
    typeof request.latitude === "number" &&
    typeof request.longitude === "number" &&
    Number.isFinite(request.latitude) &&
    Number.isFinite(request.longitude)
  ) {
    return { lat: request.latitude, lon: request.longitude };
  }
  const geo = await geocodeCity(request.city, request.department);
  if (!geo) return null;
  return { lat: geo.lat, lon: geo.lon };
}

/** Préférence d’ancienneté du particulier → filtre de recherche. */
export function ageCohortFromClientPreference(
  preferEstablishedCompany?: boolean
): CompanyAgeCohort | "all" {
  if (preferEstablishedCompany === true) return "established";
  if (preferEstablishedCompany === false) return "young";
  return "all";
}

export async function searchArtisansForChantier(
  request: WorkRequest,
  options?: {
    radiusKm?: number;
    /** young | established — all = tous. Défaut : préférence client. */
    ageCohort?: CompanyAgeCohort | "all";
    hasPhone?: "all" | "yes" | "no";
    requireRge?: boolean;
    /** Si true, ne filtre pas encore la note Google (Places peut la remplir après). */
    ignoreMinGoogleRating?: boolean;
    limit?: number;
    /**
     * request = département du chantier (liste admin).
     * hdf = 59+62 dans le rayon (sélection SMS, chantiers limitrophes).
     */
    departmentScope?: "request" | "hdf";
  }
): Promise<SearchArtisansForChantierResult> {
  const nafCodes = resolveWorkRequestNafCodes(request).map(normalizeNafCode);
  const nafSet = new Set(nafCodes);
  if (nafSet.size === 0) {
    return {
      origin: null,
      geoFound: false,
      nafCodes: [],
      radiusKm: options?.radiusKm ?? defaultNearbyRadiusKm(),
      total: 0,
      withCoords: 0,
      withoutCoords: 0,
      young: 0,
      established: 0,
      withPhone: 0,
      withRating: 0,
      artisans: [],
    };
  }

  const radiusKm = options?.radiusKm ?? defaultNearbyRadiusKm();
  const origin = await resolveChantierOrigin(request);
  const ageFilter =
    options?.ageCohort ??
    ageCohortFromClientPreference(request.preferEstablishedCompany);
  const phoneFilter = options?.hasPhone ?? "all";
  const requireRge = options?.requireRge ?? request.requireRge === true;
  const minRating = options?.ignoreMinGoogleRating
    ? null
    : parseMinGoogleRating(request.minGoogleRating);
  const limit = Math.min(500, Math.max(1, options?.limit ?? 100));
  const departmentScope = options?.departmentScope ?? "request";

  const active = await listArtisans({ status: "active" });
  const matched: ChantierArtisanRow[] = [];

  for (const a of active) {
    if (a.optedOut) continue;
    if (departmentScope === "request") {
      if (a.department !== request.department) continue;
    } else if (a.department !== "59" && a.department !== "62") {
      continue;
    }
    if (!artisanMatchesNafCodes(a, nafCodes)) continue;

    const matchedNafCode =
      collectArtisanNafCodes(a).find((code) => nafSet.has(code)) ??
      normalizeNafCode(a.nafCode);

    const ageCohort = companyAgeCohort(a.companyCreatedAt);
    if (ageFilter !== "all" && ageCohort !== ageFilter) continue;

    const hasPhone = Boolean(a.phone?.trim());
    if (phoneFilter === "yes" && !hasPhone) continue;
    if (phoneFilter === "no" && hasPhone) continue;

    const isRge = artisanIsRge(a);
    if (requireRge && !isRge) continue;
    if (minRating != null) {
      if (typeof a.googleRating !== "number" || a.googleRating < minRating) {
        continue;
      }
    }

    let distanceKm: number | null = null;
    if (
      origin &&
      typeof a.lat === "number" &&
      typeof a.lon === "number" &&
      Number.isFinite(a.lat) &&
      Number.isFinite(a.lon)
    ) {
      distanceKm = haversineKm(origin, { lat: a.lat, lon: a.lon });
      if (distanceKm > radiusKm) continue;
    } else if (origin) {
      // Sans coords : exclus du classement distance (on peut les lister à part via radius illimité)
      continue;
    }

    matched.push({
      siret: a.siret,
      siren: a.siren,
      companyName: a.companyName,
      city: a.city,
      postalCode: a.postalCode,
      department: a.department,
      nafCode: normalizeNafCode(a.nafCode),
      nafSecondaryCodes: a.nafSecondaryCodes,
      matchedNafCode,
      companyCreatedAt: a.companyCreatedAt,
      ageCohort,
      distanceKm,
      phone: a.phone,
      website: a.website,
      hasPhone,
      googleRating: a.googleRating,
      googleUserRatingCount: a.googleUserRatingCount,
      lat: a.lat,
      lon: a.lon,
      source: a.source,
      isRge,
    });
  }

  matched.sort((a, b) => {
    const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return a.companyName.localeCompare(b.companyName, "fr");
  });

  const young = matched.filter((m) => m.ageCohort === "young").length;
  const established = matched.filter((m) => m.ageCohort === "established").length;

  return {
    origin,
    geoFound: origin != null,
    nafCodes,
    radiusKm,
    total: matched.length,
    withCoords: matched.filter((m) => m.distanceKm != null).length,
    withoutCoords: 0,
    young,
    established,
    withPhone: matched.filter((m) => m.hasPhone).length,
    withRating: matched.filter((m) => typeof m.googleRating === "number").length,
    artisans: matched.slice(0, limit),
  };
}
