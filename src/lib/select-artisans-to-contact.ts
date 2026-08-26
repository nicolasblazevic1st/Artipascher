/**
 * Source unique de sélection SMS :
 * critères du particulier + 5 SMS × artisans choisis.
 * Sortie : liste de mobiles à contacter (du plus proche au plus loin).
 */

import { lookupBodaccForSirens } from "./bodacc-scan-db";
import { addEnrichmentJob, listArtisans } from "./artisans-db";
import {
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
/** Assez large pour remplir 15–25+ SMS dans le 59/62, toujours trié par distance. */
export const SMS_FILL_RADIUS_KM = 150;
export const SMS_SEARCH_POOL_LIMIT = 500;
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
  bodaccStatus?: "clear" | "active_procedure" | "unavailable" | "unchecked";
  bodaccNature?: string;
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
    bodaccExcluded: number;
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

function sirenKey(row: { siren?: string; siret: string }): string {
  return (row.siren || row.siret).replace(/\D/g, "").slice(0, 9);
}

function toTarget(
  row: ChantierArtisanRow,
  phoneE164: string,
  fresh?: EnrichedArtisan,
  bodacc?: { status?: ContactTargetArtisan["bodaccStatus"]; nature?: string }
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
    bodaccStatus: bodacc?.status,
    bodaccNature: bodacc?.nature,
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
  const radiusKm = options?.radiusKm ?? SMS_FILL_RADIUS_KM;
  const ageCohort = "all" as const;
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
    limit: SMS_SEARCH_POOL_LIMIT,
  });

  const artisanBySiret = new Map(
    (await listArtisans({ status: "active" })).map((a) => [a.siret, a])
  );

  const alreadyRated = search.artisans.filter(
    (row) => typeof row.googleRating === "number"
  );
  const notYetRated = search.artisans.filter(
    (row) => typeof row.googleRating !== "number"
  );
  const bodaccMap = await lookupBodaccForSirens(
    [...alreadyRated, ...notYetRated].map((row) => row.siren || row.siret),
    {
      liveCheckUnchecked: true,
      liveLimit: Math.min(200, search.artisans.length),
    }
  );
  const afterFree = search.artisans.filter((row) => {
    const bodacc = bodaccMap.get(sirenKey(row));
    return bodacc?.status !== "active_procedure";
  });
  let bodaccExcluded = search.artisans.length - afterFree.length;

  const prospects = fillPhonesViaPlaces ? await getArtisanProspects() : [];
  const prospectBySiret = new Map(prospects.map((p) => [p.siret, p]));

  let requestsUsed = 0;
  let attempts = 0;
  let phonesFound = 0;
  const placesErrors: string[] = [];
  const defaultMaxAttempts = Math.min(120, Math.max(40, quota * 5));
  const maxAttempts = Math.min(
    120,
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

  function smsReadyCount(): number {
    let n = 0;
    for (const row of afterFree) {
      const fresh = artisanBySiret.get(row.siret);
      const rating = fresh?.googleRating ?? row.googleRating;
      if (
        minGoogleRating != null &&
        (typeof rating !== "number" || rating < minGoogleRating)
      ) {
        continue;
      }
      const phone = fresh?.phone ?? row.phone;
      if (phone && normalizeFrenchMobile(phone)) n += 1;
    }
    return n;
  }

  if (minGoogleRating != null && fillPhonesViaPlaces && placesEnabled) {
    const defaultRatingBudget = Math.min(80, Math.max(quota * 4, 16));
    const ratingBudget = Math.min(
      maxAttempts,
      Math.max(
        0,
        Math.floor(options?.maxRatingAttempts ?? defaultRatingBudget)
      )
    );
    let ratingAttempts = 0;
    for (const row of afterFree) {
      if (smsReadyCount() >= quota) break;
      if (ratingAttempts >= ratingBudget) break;
      const artisan = artisanBySiret.get(row.siret);
      if (!artisan || !artisanNeedsGoogleRating(artisan)) continue;
      ratingAttempts += 1;
      await tryPlaces(row, artisan);
    }
  }

  const eligible = afterFree.filter((row) => {
    if (minGoogleRating == null) return true;
    const rating =
      artisanBySiret.get(row.siret)?.googleRating ?? row.googleRating;
    // Seuil client : note Google obligatoire et ≥ seuil. Pas de note = exclu.
    return typeof rating === "number" && rating >= minGoogleRating;
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
      const bodacc = bodaccMap.get(sirenKey(row));
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
        bodaccStatus: bodacc?.status,
        bodaccNature: bodacc?.nature,
      });
      continue;
    }
    if (seenPhones.has(phoneE164)) continue;
    seenPhones.add(phoneE164);

    const target = toTarget(
      row,
      phoneE164,
      artisanBySiret.get(row.siret),
      bodaccMap.get(sirenKey(row))
    );
    if (selected.length < quota) {
      selected.push(target);
    } else {
      extrasWithPhone.push(target);
    }
  }

  const visibleSirens = [
    ...selected.map((row) => row.siren || row.siret),
    ...extrasWithPhone.map((row) => row.siren || row.siret),
    ...withoutPhone.map((row) => row.siren || row.siret),
  ].filter((siren) => {
    const status = bodaccMap.get(sirenKey({ siret: siren, siren }))?.status;
    return !status || status === "unchecked";
  });
  if (visibleSirens.length > 0) {
    const extraBodacc = await lookupBodaccForSirens(visibleSirens, {
      liveCheckUnchecked: true,
      liveLimit: visibleSirens.length,
    });
    for (const [key, row] of extraBodacc) {
      bodaccMap.set(key, row);
    }
    const applyBodacc = (row: {
      siret: string;
      siren?: string;
      bodaccStatus?: ContactTargetArtisan["bodaccStatus"];
      bodaccNature?: string;
    }) => {
      const bodacc = bodaccMap.get(sirenKey(row));
      if (!bodacc) return;
      row.bodaccStatus = bodacc.status;
      row.bodaccNature = bodacc.nature;
    };
    selected.forEach(applyBodacc);
    extrasWithPhone.forEach(applyBodacc);
    withoutPhone.forEach(applyBodacc);
    const stillOk: ContactTargetArtisan[] = [];
    for (const row of selected) {
      if (row.bodaccStatus === "active_procedure") {
        bodaccExcluded += 1;
        continue;
      }
      stillOk.push(row);
    }
    selected.length = 0;
    selected.push(...stillOk);

    const leftoverExtras: ContactTargetArtisan[] = [];
    const selectedSirets = new Set(selected.map((row) => row.siret));
    for (const extra of extrasWithPhone) {
      if (
        selected.length < quota &&
        extra.bodaccStatus !== "active_procedure" &&
        !selectedSirets.has(extra.siret)
      ) {
        selectedSirets.add(extra.siret);
        selected.push(extra);
      } else if (extra.bodaccStatus !== "active_procedure") {
        leftoverExtras.push(extra);
      } else {
        bodaccExcluded += 1;
      }
    }
    extrasWithPhone.length = 0;
    extrasWithPhone.push(...leftoverExtras);

    if (selected.length < quota && fillPhonesViaPlaces && placesEnabled) {
      const rowBySiret = new Map(afterFree.map((row) => [row.siret, row]));
      const leftoverWithout: ContactTargetExtra[] = [];
      for (const extra of withoutPhone) {
        if (selected.length >= quota || attempts >= maxAttempts) {
          leftoverWithout.push(extra);
          continue;
        }
        const row = rowBySiret.get(extra.siret);
        const artisan = artisanBySiret.get(extra.siret);
        if (!row || !artisan || !isPlacesPhoneTarget(artisan)) {
          leftoverWithout.push(extra);
          continue;
        }
        const updated = await tryPlaces(row, artisan);
        const phoneE164 = normalizeFrenchMobile(
          updated?.phone ?? row.phone ?? ""
        );
        const bodacc = bodaccMap.get(sirenKey(row));
        if (bodacc?.status === "active_procedure") {
          bodaccExcluded += 1;
          continue;
        }
        if (phoneE164 && !seenPhones.has(phoneE164)) {
          seenPhones.add(phoneE164);
          selected.push(toTarget(row, phoneE164, artisanBySiret.get(row.siret), bodacc));
          continue;
        }
        leftoverWithout.push(extra);
      }
      withoutPhone.length = 0;
      withoutPhone.push(...leftoverWithout);
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
      note: `Sélecteur SMS: ${phonesFound} tél. / cible ${quota} (${attempts} tentatives)`,
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
      bodaccExcluded,
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
