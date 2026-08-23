/**
 * Source unique de sélection SMS :
 * critères du particulier + 5 SMS × artisans choisis.
 * Sortie : liste de mobiles à contacter (du plus proche au plus loin).
 */

import { addEnrichmentJob, listArtisans } from "./artisans-db";
import {
  ageCohortFromClientPreference,
  searchArtisansForChantier,
  type ChantierArtisanRow,
  type CompanyAgeCohort,
} from "./artisans-for-chantier";
import type { EnrichedArtisan } from "./artisans-types";
import {
  SMS_PER_SELECTED_ARTISAN,
  formatSmsQuotaLabel,
  resolveMaxContactArtisans,
  smsQuotaForRequest,
} from "./contact-slots";
import { defaultNearbyRadiusKm } from "./geo-distance";
import { isGooglePlacesEnabled } from "./google-places";
import { parseMinGoogleRating } from "./google-rating";
import { normalizeFrenchMobile } from "./phone-format";
import {
  artisanNeedsGoogleRating,
  enrichArtisanWithPlaces,
  isPlacesPhoneTarget,
} from "./places-quota";
import { getArtisanProspects, getMarketingSmsContactedSirets, upsertArtisanProspect } from "./store";

import type { WorkRequest } from "./store-types";

export interface ContactTargetArtisan {
  siret: string;
  siren: string;
  companyName: string;
  city: string;
  postalCode: string;
  department: "59" | "62";
  nafCode: string;
  matchedNafCode: string;
  ageCohort: CompanyAgeCohort;
  companyCreatedAt?: string;
  distanceKm: number | null;
  phone: string;
  phoneE164: string;
  isRge: boolean;
  source: ChantierArtisanRow["source"];
  googleRating?: number;
  googleUserRatingCount?: number;
}

export interface ContactTargetExtra {
  siret: string;
  companyName: string;
  city: string;
  companyCreatedAt?: string;
  source: string;
  distanceKm?: number;
  siren?: string;
  googleRating?: number;
  googleUserRatingCount?: number;
  bodaccStatus?: "clear" | "active_procedure" | "unavailable" | "unchecked";
  bodaccNature?: string;
}

export interface SelectArtisansToContactResult {
  workRequestId: string;
  artisansWanted: number;
  smsPerArtisan: number;
  quota: number;
  quotaLabel: string;
  selectedCount: number;
  shortfall: number;
  phones: string[];
  artisans: ContactTargetArtisan[];
  extras: {
    withPhone: ContactTargetArtisan[];
    withoutPhone: ContactTargetExtra[];
  };
  criteria: {
    category: string;
    city: string;
    department: "59" | "62";
    nafCodes: string[];
    ageCohort: CompanyAgeCohort | "all";
    requireRge: boolean;
    minGoogleRating?: number;
    radiusKm: number;
    geoFound: boolean;
  };
  pool: {
    matchingNearby: number;
    withPhone: number;
    alreadyMarketed: number;
    invalidOrLandline: number;
    platformExcluded: number;
  };
  placesFill: {
    enabled: boolean;
    targetPhones: number;
    phonesBefore: number;
    phonesAfter: number;
    attempts: number;
    phonesFound: number;
    requestsUsed: number;
  };
}

function toTarget(
  row: ChantierArtisanRow,
  phoneE164: string,
  fresh?: EnrichedArtisan
): ContactTargetArtisan {
  return {
    siret: row.siret,
    siren: row.siren,
    companyName: row.companyName,
    city: row.city,
    postalCode: row.postalCode,
    department: row.department,
    nafCode: row.nafCode,
    matchedNafCode: row.matchedNafCode,
    ageCohort: row.ageCohort,
    companyCreatedAt: row.companyCreatedAt,
    distanceKm: row.distanceKm,
    phone: fresh?.phone ?? row.phone ?? phoneE164,
    phoneE164,
    isRge: row.isRge,
    source: row.source,
    googleRating: fresh?.googleRating ?? row.googleRating,
    googleUserRatingCount:
      fresh?.googleUserRatingCount ?? row.googleUserRatingCount,
  };
}

/**
 * Artisans correspondant aux critères client, du plus proche au plus loin,
 * limités à 5 × maxContactArtisans (ou `targetCount`), mobile FR valide.
 */
export async function selectArtisansToContact(
  request: WorkRequest,
  options?: {
    radiusKm?: number;
    /** Défaut = 5 × artisans choisis. */
    targetCount?: number;
    /** Défaut true : un SIRET déjà SMS marketing n’est plus rappelé. */
    excludeAlreadyMarketed?: boolean;
    /** Si true, Places pour noter / trouver un mobile jusqu’au quota. */
    fillPhonesViaPlaces?: boolean;
    /** Plafond d’appels Places (search+details comptent 1 tentative). */
    maxPlacesAttempts?: number;
    /** Plafond de fiches à noter avant le remplissage tél. */
    maxRatingAttempts?: number;
  }
): Promise<SelectArtisansToContactResult> {
  const artisansWanted = resolveMaxContactArtisans(request);
  const quota = Math.max(
    1,
    Math.floor(options?.targetCount ?? smsQuotaForRequest(request))
  );
  const radiusKm = options?.radiusKm ?? defaultNearbyRadiusKm();
  const ageCohort = ageCohortFromClientPreference(
    request.preferEstablishedCompany
  );
  const requireRge = request.requireRge === true;
  const minGoogleRating = parseMinGoogleRating(request.minGoogleRating);
  const excludeAlreadyMarketed = options?.excludeAlreadyMarketed !== false;
  const fillPhonesViaPlaces = options?.fillPhonesViaPlaces === true;
  const placesEnabled = isGooglePlacesEnabled();

  const alreadyMarketed = excludeAlreadyMarketed
    ? await getMarketingSmsContactedSirets()
    : new Set<string>();

  const search = await searchArtisansForChantier(request, {
    radiusKm,
    ageCohort,
    hasPhone: "all",
    requireRge,
    departmentScope: "hdf",
    ignoreMinGoogleRating: fillPhonesViaPlaces && minGoogleRating != null,
    limit: Math.min(500, Math.max(quota * 8, 80)),
  });

  const artisanBySiret = new Map(
    (await listArtisans({ status: "active" })).map((a) => [a.siret, a])
  );
  const prospects = fillPhonesViaPlaces ? await getArtisanProspects() : [];
  const prospectBySiret = new Map(prospects.map((p) => [p.siret, p]));

  let requestsUsed = 0;
  let attempts = 0;
  let phonesFound = 0;
  const placesErrors: string[] = [];
  const defaultMaxAttempts = Math.min(80, Math.max(24, quota * 6));
  const maxAttempts = Math.min(
    80,
    Math.max(
      0,
      Math.floor(options?.maxPlacesAttempts ?? defaultMaxAttempts)
    )
  );

  async function tryPlaces(
    row: ChantierArtisanRow,
    artisan: EnrichedArtisan
  ): Promise<EnrichedArtisan | undefined> {
    if (!fillPhonesViaPlaces || !placesEnabled) return undefined;
    if (attempts >= maxAttempts) return undefined;
    attempts += 1;
    const res = await enrichArtisanWithPlaces(artisan, "production");
    requestsUsed += res.requestsUsed;
    if (res.error) placesErrors.push(`${row.siret}: ${res.error}`);
    if (!res.artisan) return undefined;
    artisanBySiret.set(row.siret, res.artisan);
    if (typeof res.artisan.googleRating === "number") {
      row.googleRating = res.artisan.googleRating;
      row.googleUserRatingCount = res.artisan.googleUserRatingCount;
    }
    if (res.artisan.phone) {
      row.phone = res.artisan.phone;
      const phone = normalizeFrenchMobile(res.artisan.phone);
      if (phone) {
        phonesFound += 1;
        const prospect = prospectBySiret.get(row.siret);
        if (prospect) {
          await upsertArtisanProspect({ ...prospect, phone: res.artisan.phone });
        }
      }
    }
    return res.artisan;
  }

  if (minGoogleRating != null && fillPhonesViaPlaces && placesEnabled) {
    const defaultRatingBudget = Math.min(40, Math.max(quota * 3, 12));
    const ratingBudget = Math.min(
      maxAttempts,
      Math.max(
        0,
        Math.floor(options?.maxRatingAttempts ?? defaultRatingBudget)
      )
    );
    let ratingAttempts = 0;
    for (const row of search.artisans) {
      if (ratingAttempts >= ratingBudget) break;
      const artisan = artisanBySiret.get(row.siret);
      if (!artisan || !artisanNeedsGoogleRating(artisan)) continue;
      ratingAttempts += 1;
      await tryPlaces(row, artisan);
    }
  }

  const eligible = search.artisans.filter((row) => {
    if (minGoogleRating == null) return true;
    const rating = artisanBySiret.get(row.siret)?.googleRating;
    // Sans note connue : on garde (la BDD n’a souvent pas encore Places).
    // On n’écarte que les notes déjà mesurées et sous le seuil client.
    if (typeof rating !== "number") return true;
    return rating >= minGoogleRating;
  });

  const phonesBefore = eligible.filter((r) =>
    Boolean(r.phone && normalizeFrenchMobile(r.phone))
  ).length;

  const selected: ContactTargetArtisan[] = [];
  const extrasWithPhone: ContactTargetArtisan[] = [];
  const withoutPhone: ContactTargetExtra[] = [];
  const seenPhones = new Set<string>();
  let alreadyMarketedCount = 0;
  let invalidOrLandline = 0;
  let platformExcluded = 0;

  for (const row of eligible) {
    if (row.source === "platform") {
      platformExcluded += 1;
      continue;
    }
    if (alreadyMarketed.has(row.siret)) {
      alreadyMarketedCount += 1;
      continue;
    }

    let phoneE164 = row.phone ? normalizeFrenchMobile(row.phone) : null;
    if (!phoneE164 && selected.length < quota) {
      const artisan = artisanBySiret.get(row.siret);
      if (artisan && isPlacesPhoneTarget(artisan)) {
        const updated = await tryPlaces(row, artisan);
        const raw = updated?.phone ?? row.phone;
        phoneE164 = raw ? normalizeFrenchMobile(raw) : null;
      }
    }

    if (!phoneE164) {
      if (row.phone?.trim()) invalidOrLandline += 1;
      withoutPhone.push({
        siret: row.siret,
        siren: row.siren,
        companyName: row.companyName,
        city: row.city,
        companyCreatedAt: row.companyCreatedAt,
        source: row.source,
        distanceKm: row.distanceKm ?? undefined,
        googleRating: row.googleRating,
        googleUserRatingCount: row.googleUserRatingCount,
      });
      continue;
    }
    if (seenPhones.has(phoneE164)) continue;
    seenPhones.add(phoneE164);

    const target = toTarget(row, phoneE164, artisanBySiret.get(row.siret));
    if (selected.length < quota) {
      selected.push(target);
    } else {
      extrasWithPhone.push(target);
    }
  }

  if (attempts > 0) {
    await addEnrichmentJob({
      kind: "places_production",
      ranAt: new Date().toISOString(),
      requestsSpent: requestsUsed,
      processed: attempts,
      skipped: 0,
      errors: placesErrors,
      note: `Sélecteur 5×N: ${phonesFound} tél. / cible ${quota} (${attempts} tentatives)`,
    });
  }

  return {
    workRequestId: request.id,
    artisansWanted,
    smsPerArtisan: SMS_PER_SELECTED_ARTISAN,
    quota,
    quotaLabel: formatSmsQuotaLabel(request),
    selectedCount: selected.length,
    shortfall: Math.max(0, quota - selected.length),
    phones: selected.map((a) => a.phoneE164),
    artisans: selected,
    extras: { withPhone: extrasWithPhone, withoutPhone },
    criteria: {
      category: request.category,
      city: request.city,
      department: request.department,
      nafCodes: search.nafCodes,
      ageCohort,
      requireRge,
      minGoogleRating: minGoogleRating ?? undefined,
      radiusKm: search.radiusKm,
      geoFound: search.geoFound,
    },
    pool: {
      matchingNearby: search.total,
      withPhone: selected.length + extrasWithPhone.length,
      alreadyMarketed: alreadyMarketedCount,
      invalidOrLandline,
      platformExcluded,
    },
    placesFill: {
      enabled: placesEnabled && fillPhonesViaPlaces,
      targetPhones: quota,
      phonesBefore,
      phonesAfter: selected.length,
      attempts,
      phonesFound,
      requestsUsed,
    },
  };
}
