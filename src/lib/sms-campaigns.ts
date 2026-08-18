import { companyAgeCohort } from "./artisans-for-chantier";
import { getArtisansNearWorkRequest } from "./artisans-nearby";
import { addEnrichmentJob, listArtisans, upsertArtisan } from "./artisans-db";
import {
  findNearbyBusinesses,
  type NearbyBusiness,
} from "./nearby-businesses";
import { isGooglePlacesEnabled } from "./google-places";
import {
  enrichArtisanWithPlaces,
  isPlacesPhoneTarget,
  markArtisanPhoneInvalid,
} from "./places-quota";
import { absoluteUrl } from "./share";
import { formatWorkPrestationLabel } from "./pricing-tiers";
import { resolveMaxContactArtisans } from "@/lib/contact-slots";
import { isMarketingSmsWindowOpen, normalizeFrenchMobile, sendSms } from "./sms";
import {
  addSmsCampaign,
  countContactUnlocksForAuction,
  createSmsAcquisitionCampaign,
  getActiveSmsAcquisitionCampaign,
  getArtisanProspects,
  getMarketingSmsContactedSirets,
  getPendingReviewForAcquisition,
  getPendingReviewSmsCampaigns,
  getSmsAcquisitionCampaignById,
  getSmsAcquisitionCampaigns,
  getSmsCampaignById,
  getSmsSettings,
  getWorkRequestById,
  markProspectsContacted,
  parisDayKey,
  parisNextMarketingDayKey,
  setSmsAcquisitionStatus,
  updateSmsAcquisitionCampaign,
  updateSmsCampaign,
  upsertArtisanProspect,
} from "./store";
import type {
  ArtisanProspect,
  SmsAcquisitionCampaign,
  SmsCampaign,
  SmsCampaignRecipient,
  SmsCampaignTrigger,
  SmsCohort,
  WorkRequest,
} from "./store-types";

export interface SmsCandidate {
  siret: string;
  siren: string;
  companyName: string;
  city: string;
  department: "59" | "62";
  nafCode?: string;
  phone: string;
  cohort: SmsCohort;
  companyCreatedAt?: string;
  lastContactedAt?: string;
  source: "gouv" | "platform" | "import";
  proId?: string;
  selectedByDefault: boolean;
  /** Distance chantier → artisan (km), si géolocalisé. */
  distanceKm?: number;
}

type ProspectPoolRow = {
  siret: string;
  siren: string;
  companyName: string;
  city: string;
  department: "59" | "62";
  nafCode?: string;
  source: "gouv" | "platform" | "import";
  companyCreatedAt?: string;
  phone?: string;
  distanceKm?: number;
  proId?: string;
};

export interface SmsCampaignPreviewDetailed {
  workRequestId: string;
  category: string;
  city: string;
  department: "59" | "62";
  auctionUrl: string;
  defaultMessage: string;
  campaignSize: number;
  /** Pref. client : true = 5+, false = 0 à 5 ans, undefined = pas de filtre âge. */
  preferEstablishedCompany?: boolean;
  geoFound: boolean;
  totalNearby: number;
  gouvCount: number;
  platformCount: number;
  /** Déjà contactés par SMS marketing — exclus définitivement. */
  alreadyMarketedCount: number;
  cohortCounts: Record<SmsCohort, number>;
  suggestedCounts: Record<SmsCohort, number>;
  candidates: SmsCandidate[];
  withoutPhone: Array<{
    siret: string;
    companyName: string;
    city: string;
    companyCreatedAt?: string;
    source: string;
    distanceKm?: number;
  }>;
  /** Remplissage Places pour atteindre N joignables. */
  placesFill?: {
    enabled: boolean;
    targetPhones: number;
    phonesBefore: number;
    phonesAfter: number;
    attempts: number;
    phonesFound: number;
    requestsUsed: number;
  };
}

export type PreviewSmsCampaignOptions = {
  campaignSize?: number;
  /** Si true (défaut en preview), Places jusqu’à N joignables. */
  fillPhonesViaPlaces?: boolean;
};

function isYoungCompany(createdAt?: string): boolean {
  return companyAgeCohort(createdAt) === "young";
}

export function buildDefaultCampaignMessage(request: WorkRequest): string {
  const auctionPath = request.auctionId
    ? `/encheres/${request.auctionId}`
    : "/encheres";
  const url = absoluteUrl(auctionPath);
  const prestation = formatWorkPrestationLabel(request);
  return (
    `Nord Artisan Pro : ${prestation} a ${request.city} (${request.department}). ` +
    `Details : ${url}`
  );
}

function classifyCohort(
  lastContactedAt: string | undefined,
  companyCreatedAt: string | undefined
): SmsCohort {
  if (lastContactedAt) return "returning";
  if (isYoungCompany(companyCreatedAt)) return "new_young";
  return "new_established";
}

function cohortTargets(
  campaignSize: number,
  preferEstablishedCompany?: boolean
): { young: number; established: number } {
  // Filtres exclusifs selon le choix client — jamais de mix 0–5 / 5+.
  if (preferEstablishedCompany === true) {
    return { young: 0, established: campaignSize };
  }
  if (preferEstablishedCompany === false) {
    return { young: campaignSize, established: 0 };
  }
  // Historique sans préférence : pas de quota d'âge.
  return { young: campaignSize, established: campaignSize };
}

function toCandidate(
  row: ProspectPoolRow,
  phone: string,
  selectedByDefault: boolean
): SmsCandidate {
  return {
    siret: row.siret,
    siren: row.siren,
    companyName: row.companyName,
    city: row.city,
    department: row.department,
    nafCode: row.nafCode,
    phone,
    cohort: classifyCohort(undefined, row.companyCreatedAt),
    companyCreatedAt: row.companyCreatedAt,
    source: row.source,
    proId: row.proId,
    selectedByDefault,
    distanceKm: row.distanceKm,
  };
}

async function mergeProspectPool(
  request: WorkRequest,
  options?: {
    targetPhones?: number;
    fillPhonesViaPlaces?: boolean;
    preferEstablishedCompany?: boolean;
  }
): Promise<{
  withPhone: SmsCandidate[];
  withoutPhone: SmsCampaignPreviewDetailed["withoutPhone"];
  geoFound: boolean;
  totalNearby: number;
  gouvCount: number;
  platformCount: number;
  alreadyMarketedCount: number;
  placesFill: NonNullable<SmsCampaignPreviewDetailed["placesFill"]>;
}> {
  const targetPhones = Math.max(1, Math.floor(options?.targetPhones ?? 10));
  const fillPhonesViaPlaces = options?.fillPhonesViaPlaces !== false;
  const targets = cohortTargets(
    targetPhones,
    options?.preferEstablishedCompany
  );

  // Pas d’enrichissement aveugle : Places uniquement en marchant du plus proche au plus loin.
  const nearbyDb = await getArtisansNearWorkRequest(request, {
    enrichProduction: false,
  });
  const distanceBySiret = new Map(
    nearbyDb.artisans.map((a) => [a.siret, a.distanceKm])
  );

  const { businesses, geoFound } = await findNearbyBusinesses({
    city: request.city,
    department: request.department,
    category: request.category,
  });

  const gouvCount =
    businesses.filter((b) => b.source === "gouv").length +
    nearbyDb.artisans.filter((a) => a.source === "gouv").length;
  const platformCount = businesses.filter((b) => b.source === "platform").length;

  const prospects = await getArtisanProspects();
  const prospectBySiret = new Map(prospects.map((p) => [p.siret, p]));
  const alreadyMarketed = await getMarketingSmsContactedSirets();
  let alreadyMarketedCount = 0;

  // Sync SIRENE discoveries into prospect carnet + base enrichissement Places.
  for (const b of businesses) {
    if (b.source !== "gouv") continue;
    const existing = prospectBySiret.get(b.siret);
    if (!existing) {
      const created = await upsertArtisanProspect({
        siret: b.siret,
        siren: b.siren,
        companyName: b.name,
        city: b.city,
        department: b.department,
        nafCode: b.nafCode,
        companyCreatedAt: b.companyCreatedAt,
        source: "gouv",
      });
      prospectBySiret.set(b.siret, created);
    } else if (!existing.companyCreatedAt && b.companyCreatedAt) {
      const updated = await upsertArtisanProspect({
        ...existing,
        companyCreatedAt: b.companyCreatedAt,
        nafCode: existing.nafCode ?? b.nafCode,
      });
      prospectBySiret.set(b.siret, updated);
    }

    await upsertArtisan(
      {
        siret: b.siret,
        siren: b.siren,
        companyName: b.name,
        addressLine: b.city,
        postalCode: "",
        city: b.city,
        department: b.department,
        nafCode: b.nafCode,
        companyCreatedAt: b.companyCreatedAt,
        status: "active",
        enrichmentStatus: "pending",
        lastSeenAt: new Date().toISOString(),
        source: "gouv",
      },
      { preserveContact: true }
    );
  }

  const pool: ProspectPoolRow[] = [];
  const seen = new Set<string>();

  function pushBusiness(
    b: NearbyBusiness | ArtisanProspect,
    distanceKm?: number
  ) {
    const siret = "siret" in b ? b.siret : "";
    if (!siret || seen.has(siret)) return;
    seen.add(siret);

    const prospect = prospectBySiret.get(siret);
    if (prospect?.optedOut) return;

    const source =
      ("source" in b ? b.source : undefined) ?? prospect?.source ?? "gouv";
    const proId = "proId" in b ? b.proId : undefined;
    if (source === "platform" || proId) return;

    const lastContactedAt = prospect?.lastContactedAt;
    if (lastContactedAt || alreadyMarketed.has(siret)) {
      alreadyMarketedCount += 1;
      return;
    }

    const phoneRaw =
      ("phone" in b ? b.phone : undefined) ?? prospect?.phone ?? undefined;
    const phone = phoneRaw && normalizeFrenchMobile(phoneRaw) ? phoneRaw : undefined;
    const companyCreatedAt =
      ("companyCreatedAt" in b ? b.companyCreatedAt : undefined) ??
      prospect?.companyCreatedAt;
    const companyName =
      ("name" in b ? b.name : undefined) ??
      ("companyName" in b ? b.companyName : undefined) ??
      "Entreprise";
    const city = b.city;
    const department = b.department;
    const nafCode =
      ("nafCode" in b ? b.nafCode : undefined) ?? prospect?.nafCode;
    const siren =
      ("siren" in b ? b.siren : undefined) ?? prospect?.siren ?? siret.slice(0, 9);
    const dist = distanceKm ?? distanceBySiret.get(siret);

    pool.push({
      siret,
      siren,
      companyName,
      city,
      department,
      nafCode,
      source: source === "import" ? "import" : "gouv",
      companyCreatedAt,
      phone,
      distanceKm: dist,
      proId,
    });
  }

  // Géolocalisés d’abord (distance connue), puis le reste SIRENE / prospects.
  for (const a of nearbyDb.artisans) {
    pushBusiness(
      {
        siret: a.siret,
        siren: a.siren,
        name: a.companyName,
        city: a.city,
        department: a.department,
        nafCode: a.nafCode,
        source: a.source === "platform" ? "platform" : "gouv",
        companyCreatedAt: a.companyCreatedAt,
        phone: a.phone,
      },
      a.distanceKm
    );
  }

  for (const b of businesses) pushBusiness(b);

  // Prospects 59+62 (pas de filtre = dept du chantier).
  for (const p of prospects) {
    if (p.department !== "59" && p.department !== "62") continue;
    pushBusiness(p);
  }

  pool.sort((a, b) => {
    const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return a.companyName.localeCompare(b.companyName, "fr");
  });

  const preferAge = options?.preferEstablishedCompany;
  const ageFilteredPool =
    preferAge === undefined
      ? pool
      : pool.filter((row) => {
          const young = isYoungCompany(row.companyCreatedAt);
          return preferAge === false ? young : !young;
        });

  const artisanBySiret = new Map(
    (await listArtisans({ status: "active" })).map((a) => [a.siret, a])
  );
  const placesEnabled = isGooglePlacesEnabled();
  const maxAttempts = Math.min(80, Math.max(24, targetPhones * 6));
  const phonesBefore = ageFilteredPool.filter((r) => Boolean(r.phone)).length;

  let attempts = 0;
  let phonesFound = 0;
  let requestsUsed = 0;
  const placesErrors: string[] = [];

  const selectedSirets = new Set<string>();
  let nYoung = 0;
  let nEstablished = 0;
  const withPhone: SmsCandidate[] = [];
  const withoutPhone: SmsCampaignPreviewDetailed["withoutPhone"] = [];

  async function tryPlacesPhone(row: ProspectPoolRow): Promise<string | undefined> {
    if (!fillPhonesViaPlaces || !placesEnabled) return undefined;
    if (attempts >= maxAttempts) return undefined;
    const artisan = artisanBySiret.get(row.siret);
    if (!artisan || !isPlacesPhoneTarget(artisan)) return undefined;

    attempts += 1;
    const res = await enrichArtisanWithPlaces(artisan, "production");
    requestsUsed += res.requestsUsed;
    if (res.error) placesErrors.push(`${row.siret}: ${res.error}`);
    const phone = res.artisan?.phone?.trim();
    if (!phone || !normalizeFrenchMobile(phone)) return undefined;

    phonesFound += 1;
    row.phone = phone;
    artisanBySiret.set(row.siret, { ...artisan, ...res.artisan!, phone });
    const prospect = prospectBySiret.get(row.siret);
    if (prospect) {
      await upsertArtisanProspect({ ...prospect, phone });
      prospectBySiret.set(row.siret, { ...prospect, phone });
    }
    return phone;
  }

  function trySelect(row: ProspectPoolRow, phone: string): boolean {
    if (selectedSirets.has(row.siret)) return false;
    if (selectedSirets.size >= targetPhones) return false;

    const cohort = classifyCohort(undefined, row.companyCreatedAt);
    if (cohort === "new_young" && nYoung >= targets.young) return false;
    if (cohort === "new_established" && nEstablished >= targets.established) {
      return false;
    }

    selectedSirets.add(row.siret);
    if (cohort === "new_young") nYoung += 1;
    else nEstablished += 1;
    withPhone.push(toCandidate(row, phone, true));
    return true;
  }

  // Du plus proche au plus loin : obtenir un tél (Places si besoin) et remplir N.
  // Pas de mix : la préférence client filtre déjà le pool / les quotas.
  for (const row of ageFilteredPool) {
    if (selectedSirets.size >= targetPhones) break;

    let phone = row.phone;
    if (!phone) {
      phone = await tryPlacesPhone(row);
    }
    if (!phone) continue;
    trySelect(row, phone);
  }

  // Catalogue UI : autres joignables connus (plus loin) + sans tél restants.
  for (const row of ageFilteredPool) {
    if (selectedSirets.has(row.siret)) continue;
    if (row.phone) {
      withPhone.push(toCandidate(row, row.phone, false));
    } else {
      withoutPhone.push({
        siret: row.siret,
        companyName: row.companyName,
        city: row.city,
        companyCreatedAt: row.companyCreatedAt,
        source: row.source,
        distanceKm: row.distanceKm,
      });
    }
  }

  withPhone.sort((a, b) => {
    const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    if (a.selectedByDefault !== b.selectedByDefault) {
      return a.selectedByDefault ? -1 : 1;
    }
    return a.companyName.localeCompare(b.companyName, "fr");
  });

  if (attempts > 0) {
    await addEnrichmentJob({
      kind: "places_production",
      ranAt: new Date().toISOString(),
      requestsSpent: requestsUsed,
      processed: attempts,
      skipped: 0,
      errors: placesErrors,
      note: `Campagne proche→loin: ${phonesFound} tél. / cible ${targetPhones} (${attempts} tentatives)`,
    });
  }

  const placesFill: NonNullable<SmsCampaignPreviewDetailed["placesFill"]> = {
    enabled: placesEnabled && fillPhonesViaPlaces,
    targetPhones,
    phonesBefore,
    phonesAfter: withPhone.filter((c) => c.selectedByDefault).length,
    attempts,
    phonesFound,
    requestsUsed,
  };

  return {
    withPhone,
    withoutPhone,
    geoFound: geoFound || nearbyDb.origin != null,
    totalNearby: Math.max(businesses.length, nearbyDb.artisans.length),
    gouvCount,
    platformCount,
    alreadyMarketedCount,
    placesFill,
  };
}

function resolvePreviewOptions(
  campaignSizeOrOptions?: number | PreviewSmsCampaignOptions
): PreviewSmsCampaignOptions {
  if (typeof campaignSizeOrOptions === "number") {
    return {
      campaignSize: campaignSizeOrOptions,
      fillPhonesViaPlaces: true,
    };
  }
  return {
    campaignSize: campaignSizeOrOptions?.campaignSize,
    fillPhonesViaPlaces: campaignSizeOrOptions?.fillPhonesViaPlaces !== false,
  };
}

export async function previewSmsCampaignDetailed(
  request: WorkRequest,
  campaignSizeOrOptions?: number | PreviewSmsCampaignOptions
): Promise<SmsCampaignPreviewDetailed> {
  const settings = await getSmsSettings();
  const opts = resolvePreviewOptions(campaignSizeOrOptions);
  const campaignSize = opts.campaignSize ?? settings.smsPerDay;
  const preferEstablishedCompany = request.preferEstablishedCompany;
  const {
    withPhone: candidates,
    withoutPhone,
    geoFound,
    totalNearby,
    gouvCount,
    platformCount,
    alreadyMarketedCount,
    placesFill,
  } = await mergeProspectPool(request, {
    targetPhones: campaignSize,
    fillPhonesViaPlaces: opts.fillPhonesViaPlaces,
    preferEstablishedCompany,
  });

  const cohortCounts: Record<SmsCohort, number> = {
    returning: 0,
    new_young: candidates.filter((c) => c.cohort === "new_young").length,
    new_established: candidates.filter((c) => c.cohort === "new_established")
      .length,
  };

  const suggestedCounts: Record<SmsCohort, number> = {
    returning: 0,
    new_young: candidates.filter(
      (c) => c.selectedByDefault && c.cohort === "new_young"
    ).length,
    new_established: candidates.filter(
      (c) => c.selectedByDefault && c.cohort === "new_established"
    ).length,
  };

  return {
    workRequestId: request.id,
    category: request.category,
    city: request.city,
    department: request.department,
    auctionUrl: absoluteUrl(
      request.auctionId ? `/encheres/${request.auctionId}` : "/encheres"
    ),
    defaultMessage: buildDefaultCampaignMessage(request),
    campaignSize,
    preferEstablishedCompany,
    geoFound,
    totalNearby,
    gouvCount,
    platformCount,
    alreadyMarketedCount,
    cohortCounts,
    suggestedCounts,
    candidates,
    withoutPhone,
    placesFill,
  };
}

/** @deprecated Compat — utilise preview détaillé. */
export async function previewSmsCampaign(request: WorkRequest) {
  const detailed = await previewSmsCampaignDetailed(request);
  return {
    workRequestId: detailed.workRequestId,
    category: detailed.category,
    city: detailed.city,
    department: detailed.department,
    clientLabel: `${request.firstName} ${request.lastName.charAt(0)}.`,
    auctionUrl: detailed.auctionUrl,
    defaultMessage: detailed.defaultMessage,
    recipients: detailed.candidates
      .filter((c) => c.selectedByDefault)
      .map((c) => ({
        proId: c.proId,
        companyName: c.companyName,
        phone: c.phone,
        city: c.city,
      })),
    geoFound: detailed.geoFound,
    totalNearby: detailed.totalNearby,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Prépare un lot sans aucun appel OVH (relecture admin), prévu pour un jour donné. */
export async function preparePendingReviewBatch(
  request: WorkRequest,
  message: string,
  recipientSirets: string[],
  options?: {
    trigger?: SmsCampaignTrigger;
    acquisitionCampaignId?: string;
    /** Défaut : prochain jour marketing (préparation la veille). */
    scheduledForDate?: string;
  }
): Promise<SmsCampaign> {
  const settings = await getSmsSettings();
  const preview = await previewSmsCampaignDetailed(request, {
    campaignSize: recipientSirets.length || settings.smsPerDay,
    fillPhonesViaPlaces: false,
  });
  const bySiret = new Map(preview.candidates.map((c) => [c.siret, c]));
  const selected = recipientSirets
    .map((s) => bySiret.get(s))
    .filter((c): c is SmsCandidate => Boolean(c));

  const recipients: SmsCampaignRecipient[] = selected.map((candidate) => ({
    proId: candidate.proId,
    siret: candidate.siret,
    companyName: candidate.companyName,
    phone: candidate.phone,
    status: "pending" as const,
    cohort: candidate.cohort,
  }));

  return addSmsCampaign({
    workRequestId: request.id,
    category: request.category,
    city: request.city,
    department: request.department,
    message: message.trim(),
    status: "pending_review",
    recipientCount: recipients.length,
    sentCount: 0,
    failedCount: 0,
    recipients,
    trigger: options?.trigger ?? "manual",
    acquisitionCampaignId: options?.acquisitionCampaignId,
    scheduledForDate:
      options?.scheduledForDate ?? parisNextMarketingDayKey(),
  });
}

export type ApprovePendingResult = {
  batch: SmsCampaign;
  acquisition?: SmsAcquisitionCampaign | null;
  skippedReason?: string;
  acceptedCount?: number;
};

/**
 * Juste avant envoi : re-check 5/5, puis envoi OVH (ou démo) si objectif non atteint.
 */
export async function approvePendingReviewBatch(
  batchId: string,
  options?: { demo?: boolean }
): Promise<ApprovePendingResult> {
  const batch = await getSmsCampaignById(batchId);
  if (!batch) throw new Error("Lot introuvable.");
  if (batch.status !== "pending_review") {
    throw new Error("Ce lot n’est pas en attente de validation.");
  }

  const request = await getWorkRequestById(batch.workRequestId);
  if (!request) throw new Error("Demande introuvable.");

  const acceptedCount = request.auctionId
    ? await countContactUnlocksForAuction(request.auctionId)
    : 0;

  // Objectif atteint entre la veille et maintenant → annuler, pas d’OVH.
  if (acceptedCount >= resolveMaxContactArtisans(request)) {
    const cancelled = await updateSmsCampaign(batchId, {
      status: "cancelled",
      sentAt: new Date().toISOString(),
    });
    let acquisition: SmsAcquisitionCampaign | null = null;
    if (batch.acquisitionCampaignId) {
      acquisition = await setSmsAcquisitionStatus(
        batch.acquisitionCampaignId,
        "completed"
      );
    }
    return {
      batch: cancelled ?? batch,
      acquisition,
      skippedReason: "slots_full",
      acceptedCount,
    };
  }

  const settings = await getSmsSettings();
  if (!options?.demo && !isMarketingSmsWindowOpen()) {
    throw new Error(
      "SMS marketing hors horaires (lun–sam 8h–20h, heure de Paris)."
    );
  }

  // Exclure les SIRET marketés entre-temps (maj juste avant envoi).
  const alreadyMarketed = await getMarketingSmsContactedSirets();
  const toSend = batch.recipients.filter(
    (r) => r.siret && !alreadyMarketed.has(r.siret)
  );

  if (toSend.length === 0) {
    const cancelled = await updateSmsCampaign(batchId, {
      status: "cancelled",
      recipients: batch.recipients.map((r) => ({
        ...r,
        status: "skipped" as const,
        error: "Déjà contacté ou plus éligible",
      })),
      sentAt: new Date().toISOString(),
    });
    return {
      batch: cancelled ?? batch,
      skippedReason: "no_eligible_recipients",
      acceptedCount,
    };
  }

  const recipients: SmsCampaignRecipient[] = [];
  let sentCount = 0;
  let failedCount = 0;
  let demo = false;
  let status: SmsCampaign["status"] = "sent";

  // Destinataires exclus restent en skipped dans le lot final.
  for (const row of batch.recipients) {
    if (!row.siret || alreadyMarketed.has(row.siret)) {
      recipients.push({
        ...row,
        status: "skipped",
        error: "Exclu à la maj pré-envoi",
      });
    }
  }

  for (let i = 0; i < toSend.length; i++) {
    const row = toSend[i];
    const recipient: SmsCampaignRecipient = { ...row, status: "skipped" };

    const result = options?.demo
      ? { ok: true, demo: true }
      : await sendSms(row.phone, batch.message, "marketing");

    if (result.demo) demo = true;
    if (result.ok) {
      recipient.status = "sent";
      sentCount += 1;
    } else {
      recipient.status = "failed";
      recipient.error =
        !result.ok && "error" in result ? result.error : "Échec envoi";
      failedCount += 1;
      status = "failed";
      if (row.siret) await markArtisanPhoneInvalid(row.siret);
    }
    recipients.push(recipient);

    if (i < toSend.length - 1 && settings.throttleMs > 0 && !options?.demo) {
      await sleep(settings.throttleMs);
    }
  }

  if (sentCount === 0) status = "failed";
  else if (demo) status = "demo";

  const contacted = recipients
    .filter((r) => r.status === "sent" && r.siret)
    .map((r) => ({
      siret: r.siret!,
      companyName: r.companyName,
      phone: r.phone,
    }));
  await markProspectsContacted(contacted);

  const updatedBatch = await updateSmsCampaign(batchId, {
    status,
    sentCount,
    failedCount,
    recipientCount: recipients.length,
    recipients,
    sentAt: new Date().toISOString(),
  });

  let acquisition: SmsAcquisitionCampaign | null = null;
  if (batch.acquisitionCampaignId && sentCount > 0) {
    const acq = await getSmsAcquisitionCampaignById(batch.acquisitionCampaignId);
    if (acq) {
      const day = parisDayKey();
      const sentToday = acq.lastSendDate === day ? acq.sentOnLastDate : 0;
      acquisition = await updateSmsAcquisitionCampaign(acq.id, {
        totalSent: acq.totalSent + sentCount,
        lastSendDate: day,
        sentOnLastDate: sentToday + sentCount,
      });
      const acceptedAfter = await acceptedCountForRequest(request);
      if (acceptedAfter >= resolveMaxContactArtisans(request)) {
        acquisition =
          (await setSmsAcquisitionStatus(acq.id, "completed")) ?? acquisition;
      }
    }
  }

  return {
    batch: updatedBatch ?? batch,
    acquisition,
    acceptedCount,
  };
}

/** Annule les lots prévus pour aujourd’hui si 5/5 déjà atteint (cron matin). */
export async function cancelPendingBatchesIfObjectivesMet(): Promise<{
  cancelled: number;
}> {
  const pending = await getPendingReviewSmsCampaigns();
  const today = parisDayKey();
  let cancelled = 0;

  for (const batch of pending) {
    const scheduled =
      batch.scheduledForDate ?? parisDayKey(new Date(batch.createdAt));
    if (scheduled !== today) continue;

    const request = await getWorkRequestById(batch.workRequestId);
    if (!request?.auctionId) continue;
    const accepted = await countContactUnlocksForAuction(request.auctionId);
    if (accepted < resolveMaxContactArtisans(request)) continue;

    await updateSmsCampaign(batch.id, {
      status: "cancelled",
      sentAt: new Date().toISOString(),
    });
    if (batch.acquisitionCampaignId) {
      await setSmsAcquisitionStatus(batch.acquisitionCampaignId, "completed");
    }
    cancelled += 1;
  }

  return { cancelled };
}

export async function executeSmsCampaignToRecipients(
  request: WorkRequest,
  message: string,
  recipientSirets: string[],
  options?: {
    demo?: boolean;
    trigger?: SmsCampaignTrigger;
    acquisitionCampaignId?: string;
    /** Force préparation sans OVH (ignore le réglage). */
    pendingReviewOnly?: boolean;
  }
): Promise<SmsCampaign> {
  const settings = await getSmsSettings();
  const reviewOnly =
    options?.pendingReviewOnly === true ||
    (settings.requireReviewBeforeSend && !options?.demo);

  if (reviewOnly) {
    return preparePendingReviewBatch(request, message, recipientSirets, {
      trigger: options?.trigger,
      acquisitionCampaignId: options?.acquisitionCampaignId,
      scheduledForDate: parisNextMarketingDayKey(),
    });
  }

  // Pas de re-enrichissement Places à l’envoi : déjà fait en preview / tick.
  const preview = await previewSmsCampaignDetailed(request, {
    campaignSize: recipientSirets.length || settings.smsPerDay,
    fillPhonesViaPlaces: false,
  });
  const bySiret = new Map(preview.candidates.map((c) => [c.siret, c]));

  const selected = recipientSirets
    .map((s) => bySiret.get(s))
    .filter((c): c is SmsCandidate => Boolean(c));

  const recipients: SmsCampaignRecipient[] = [];
  let sentCount = 0;
  let failedCount = 0;
  let demo = false;
  let status: SmsCampaign["status"] = "sent";

  for (let i = 0; i < selected.length; i++) {
    const candidate = selected[i];
    const recipient: SmsCampaignRecipient = {
      proId: candidate.proId,
      siret: candidate.siret,
      companyName: candidate.companyName,
      phone: candidate.phone,
      status: "skipped",
      cohort: candidate.cohort,
    };

    const result = options?.demo
      ? { ok: true, demo: true }
      : await sendSms(candidate.phone, message, "marketing");

    if (result.demo) demo = true;

    if (result.ok) {
      recipient.status = "sent";
      sentCount += 1;
    } else {
      recipient.status = "failed";
      recipient.error = result.error;
      failedCount += 1;
      status = "failed";
      if (candidate.siret) {
        await markArtisanPhoneInvalid(candidate.siret);
      }
    }

    recipients.push(recipient);

    if (i < selected.length - 1 && settings.throttleMs > 0 && !options?.demo) {
      await sleep(settings.throttleMs);
    }
  }

  if (recipients.length === 0 || sentCount === 0) {
    status = "failed";
  } else if (demo) {
    status = "demo";
  }

  const contacted = recipients
    .filter((r) => r.status === "sent" && r.siret)
    .map((r) => {
      const candidate = selected.find((c) => c.siret === r.siret);
      return {
        siret: r.siret!,
        siren: candidate?.siren,
        companyName: r.companyName,
        phone: r.phone,
        city: candidate?.city,
        department: candidate?.department,
        nafCode: candidate?.nafCode,
        source: candidate?.source,
      };
    });
  await markProspectsContacted(contacted);

  const payload: Omit<SmsCampaign, "id" | "createdAt"> = {
    workRequestId: request.id,
    category: request.category,
    city: request.city,
    department: request.department,
    message: message.trim(),
    status,
    recipientCount: recipients.length,
    sentCount,
    failedCount,
    recipients,
    trigger: options?.trigger ?? "manual",
    acquisitionCampaignId: options?.acquisitionCampaignId,
    sentAt: new Date().toISOString(),
  };

  return addSmsCampaign(payload);
}

export type AcquisitionTickResult = {
  acquisition: SmsAcquisitionCampaign;
  acceptedCount: number;
  batch?: SmsCampaign;
  skippedReason?: string;
};

async function acceptedCountForRequest(request: WorkRequest): Promise<number> {
  if (!request.auctionId) return 0;
  return countContactUnlocksForAuction(request.auctionId);
}

/**
 * Envoie le lot du jour (jusqu’à smsPerDay) pour une campagne active.
 * Stop si 5/5 contacts acceptés, budget jour déjà consommé, ou pool vide.
 */
export async function runAcquisitionCampaignTick(
  acquisitionId: string,
  options?: {
    demo?: boolean;
    message?: string;
    /** SIRET du lot (sélection admin). Sinon sélection auto. */
    recipientSirets?: string[];
  }
): Promise<AcquisitionTickResult> {
  const acquisition = await getSmsAcquisitionCampaignById(acquisitionId);
  if (!acquisition) {
    throw new Error("Campagne d’acquisition introuvable.");
  }

  if (acquisition.status === "paused") {
    return { acquisition, acceptedCount: 0, skippedReason: "paused" };
  }
  if (acquisition.status === "completed" || acquisition.status === "exhausted") {
    return {
      acquisition,
      acceptedCount: 0,
      skippedReason: acquisition.status,
    };
  }

  const request = await getWorkRequestById(acquisition.workRequestId);
  if (!request) {
    const updated =
      (await setSmsAcquisitionStatus(acquisition.id, "exhausted")) ??
      acquisition;
    return {
      acquisition: updated,
      acceptedCount: 0,
      skippedReason: "work_request_missing",
    };
  }

  if (request.status !== "approved" || !request.auctionId) {
    const updated =
      (await setSmsAcquisitionStatus(acquisition.id, "exhausted")) ??
      acquisition;
    return {
      acquisition: updated,
      acceptedCount: 0,
      skippedReason: "request_not_approved",
    };
  }

  const acceptedCount = await acceptedCountForRequest(request);
  if (acceptedCount >= resolveMaxContactArtisans(request)) {
    const updated =
      (await setSmsAcquisitionStatus(acquisition.id, "completed")) ??
      acquisition;
    return { acquisition: updated, acceptedCount, skippedReason: "slots_full" };
  }

  const settings = await getSmsSettings();
  const reviewMode = settings.requireReviewBeforeSend && !options?.demo;

  // Préparation revue : OK avant la fenêtre marketing. Envoi live : lun–sam 8h–20h.
  if (!reviewMode && !options?.demo && !isMarketingSmsWindowOpen()) {
    return {
      acquisition,
      acceptedCount,
      skippedReason: "outside_marketing_window",
    };
  }

  const today = parisDayKey();
  // Mode revue : on prépare le lot pour le *prochain* jour marketing (la veille).
  const targetDay = reviewMode ? parisNextMarketingDayKey() : today;

  const existingPending = await getPendingReviewForAcquisition(
    acquisition.id,
    targetDay
  );
  if (existingPending) {
    return {
      acquisition,
      acceptedCount,
      batch: existingPending,
      skippedReason: "pending_review_exists",
    };
  }

  const sentOnTargetDay =
    acquisition.lastSendDate === targetDay ? acquisition.sentOnLastDate : 0;
  const remaining = acquisition.smsPerDay - sentOnTargetDay;
  if (remaining <= 0) {
    return {
      acquisition,
      acceptedCount,
      skippedReason: "daily_budget_reached",
    };
  }

  const requested = (options?.recipientSirets ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
  const preview = await previewSmsCampaignDetailed(request, {
    // Pool assez large pour retrouver les SIRET cochés en admin.
    campaignSize:
      requested.length > 0
        ? Math.max(remaining, requested.length, 50)
        : remaining,
    fillPhonesViaPlaces: true,
  });
  const sirets = (
    requested.length > 0
      ? requested.filter((siret) =>
          preview.candidates.some((c) => c.siret === siret)
        )
      : preview.candidates
          .filter((c) => c.selectedByDefault)
          .map((c) => c.siret)
  ).slice(0, remaining);

  if (sirets.length === 0) {
    const updated =
      (await setSmsAcquisitionStatus(acquisition.id, "exhausted")) ??
      acquisition;
    return {
      acquisition: updated,
      acceptedCount,
      skippedReason: "no_recipients",
    };
  }

  const message =
    options?.message?.trim() ||
    preview.defaultMessage ||
    buildDefaultCampaignMessage(request);

  const batch = await executeSmsCampaignToRecipients(request, message, sirets, {
    demo: options?.demo,
    trigger: acquisition.trigger,
    acquisitionCampaignId: acquisition.id,
    pendingReviewOnly: reviewMode,
  });

  // Lot en revue : pas encore compté dans totalSent (compte à la validation OVH).
  if (batch.status === "pending_review") {
    return {
      acquisition,
      acceptedCount,
      batch,
      skippedReason: "pending_review",
    };
  }

  const nextSentToday = sentOnTargetDay + batch.sentCount;
  let updated = await updateSmsAcquisitionCampaign(acquisition.id, {
    totalSent: acquisition.totalSent + batch.sentCount,
    lastSendDate: today,
    sentOnLastDate: nextSentToday,
  });

  const acceptedAfter = await acceptedCountForRequest(request);
  if (acceptedAfter >= resolveMaxContactArtisans(request)) {
    updated =
      (await setSmsAcquisitionStatus(acquisition.id, "completed")) ?? updated;
  } else if (batch.sentCount === 0) {
    updated =
      (await setSmsAcquisitionStatus(acquisition.id, "exhausted")) ?? updated;
  }

  return {
    acquisition: updated ?? acquisition,
    acceptedCount: acceptedAfter,
    batch,
  };
}

/** Démarre une campagne multi-jours et envoie immédiatement le premier lot. */
export async function startAcquisitionCampaign(
  request: WorkRequest,
  options?: {
    demo?: boolean;
    message?: string;
    trigger?: SmsCampaignTrigger;
    smsPerDay?: number;
    /** SIRET du lot du jour (sélection admin). Sinon sélection auto. */
    recipientSirets?: string[];
  }
): Promise<AcquisitionTickResult> {
  const existing = await getActiveSmsAcquisitionCampaign(request.id);
  if (existing) {
    if (existing.status === "paused") {
      await setSmsAcquisitionStatus(existing.id, "active");
    }
    return runAcquisitionCampaignTick(existing.id, {
      demo: options?.demo,
      message: options?.message,
      recipientSirets: options?.recipientSirets,
    });
  }

  if (request.status !== "approved" || !request.auctionId) {
    throw new Error(
      "La demande doit être approuvée avec une enchère pour démarrer une campagne."
    );
  }

  const settings = await getSmsSettings();
  const smsPerDay = options?.smsPerDay ?? settings.smsPerDay;
  const acquisition = await createSmsAcquisitionCampaign({
    workRequestId: request.id,
    smsPerDay,
    trigger: options?.trigger ?? "manual",
  });

  return runAcquisitionCampaignTick(acquisition.id, {
    demo: options?.demo,
    message: options?.message,
    recipientSirets: options?.recipientSirets,
  });
}

export async function pauseAcquisitionCampaign(
  acquisitionId: string
): Promise<SmsAcquisitionCampaign | null> {
  const current = await getSmsAcquisitionCampaignById(acquisitionId);
  if (!current || current.status !== "active") return current;
  return setSmsAcquisitionStatus(acquisitionId, "paused");
}

export async function resumeAcquisitionCampaign(
  acquisitionId: string
): Promise<SmsAcquisitionCampaign | null> {
  const current = await getSmsAcquisitionCampaignById(acquisitionId);
  if (!current || current.status !== "paused") return current;
  return setSmsAcquisitionStatus(acquisitionId, "active");
}

/** Tick toutes les campagnes actives (cron quotidien). */
export async function runAllActiveAcquisitionTicks(): Promise<{
  processed: number;
  results: AcquisitionTickResult[];
}> {
  const all = await getSmsAcquisitionCampaigns();
  const active = all.filter((c) => c.status === "active");
  const results: AcquisitionTickResult[] = [];
  for (const campaign of active) {
    try {
      results.push(await runAcquisitionCampaignTick(campaign.id));
    } catch (err) {
      console.error("[sms-acquisition] tick", campaign.id, err);
    }
  }
  return { processed: results.length, results };
}

export async function maybeAutoNotifyOnApprove(
  request: WorkRequest
): Promise<void> {
  const settings = await getSmsSettings();
  if (!settings.autoSendOnApprove) return;

  const existing = await getActiveSmsAcquisitionCampaign(request.id);
  if (existing) return;

  const alreadyFinished = (await getSmsAcquisitionCampaigns()).some(
    (c) =>
      c.workRequestId === request.id &&
      (c.status === "completed" || c.status === "exhausted")
  );
  if (alreadyFinished) return;

  await startAcquisitionCampaign(request, { trigger: "auto" });
}
