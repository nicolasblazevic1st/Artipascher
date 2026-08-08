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
import { normalizeFrenchMobile, sendSms } from "./sms";
import { absoluteUrl } from "./share";
import {
  addSmsCampaign,
  getArtisanProspects,
  getMarketingSmsContactedSirets,
  getSmsCampaignsForWorkRequest,
  getSmsSettings,
  markProspectsContacted,
  upsertArtisanProspect,
} from "./store";
import type {
  ArtisanProspect,
  SmsCampaign,
  SmsCampaignRecipient,
  SmsCohort,
  WorkRequest,
} from "./store-types";

const TWO_YEARS_MS = 2 * 365.25 * 24 * 60 * 60 * 1000;

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
  /** Préférence client : favoriser entreprises ≥ 2 ans (mix SMS 2/3–1/3). */
  preferEstablishedCompany: boolean;
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
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < TWO_YEARS_MS;
}

export function buildDefaultCampaignMessage(request: WorkRequest): string {
  const auctionPath = request.auctionId
    ? `/encheres/${request.auctionId}`
    : "/encheres";
  const url = absoluteUrl(auctionPath);
  return (
    `Artipascher : chantier ${request.category} a ${request.city} (${request.department}). ` +
    `Encherissez : ${url}`
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
  if (preferEstablishedCompany) {
    const young = Math.floor(campaignSize / 3);
    return { young, established: campaignSize - young };
  }
  const young = Math.ceil(campaignSize / 2);
  return { young, established: campaignSize - young };
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
  const preferEstablished = options?.preferEstablishedCompany === true;
  const targets = cohortTargets(targetPhones, preferEstablished);

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

  for (const p of prospects) {
    if (p.department !== request.department) continue;
    pushBusiness(p);
  }

  pool.sort((a, b) => {
    const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return a.companyName.localeCompare(b.companyName, "fr");
  });

  const artisanBySiret = new Map(
    (await listArtisans({ status: "active" })).map((a) => [a.siret, a])
  );
  const placesEnabled = isGooglePlacesEnabled();
  const maxAttempts = Math.min(80, Math.max(24, targetPhones * 6));
  const phonesBefore = pool.filter((r) => Boolean(r.phone)).length;

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

  function trySelect(row: ProspectPoolRow, phone: string, respectMix: boolean): boolean {
    if (selectedSirets.has(row.siret)) return false;
    if (selectedSirets.size >= targetPhones) return false;

    const cohort = classifyCohort(undefined, row.companyCreatedAt);
    if (respectMix) {
      if (cohort === "new_young" && nYoung >= targets.young) return false;
      if (cohort === "new_established" && nEstablished >= targets.established) {
        return false;
      }
    }

    selectedSirets.add(row.siret);
    if (cohort === "new_young") nYoung += 1;
    else nEstablished += 1;
    withPhone.push(toCandidate(row, phone, true));
    return true;
  }

  // 1) Du plus proche au plus loin : obtenir un tél (Places si besoin) et remplir N.
  for (const row of pool) {
    if (selectedSirets.size >= targetPhones) break;

    let phone = row.phone;
    if (!phone) {
      phone = await tryPlacesPhone(row);
    }
    if (!phone) continue;
    trySelect(row, phone, true);
  }

  // 2) Compléter N en ignorant le mix si besoin (toujours plus proche d’abord).
  if (selectedSirets.size < targetPhones) {
    for (const row of pool) {
      if (selectedSirets.size >= targetPhones) break;
      if (selectedSirets.has(row.siret)) continue;
      let phone = row.phone;
      if (!phone) phone = await tryPlacesPhone(row);
      if (!phone) continue;
      trySelect(row, phone, false);
    }
  }

  // 3) Catalogue UI : autres joignables connus (plus loin) + sans tél restants.
  for (const row of pool) {
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
  const campaignSize = opts.campaignSize ?? settings.defaultCampaignSize;
  const preferEstablishedCompany = request.preferEstablishedCompany === true;
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

export async function executeSmsCampaignToRecipients(
  request: WorkRequest,
  message: string,
  recipientSirets: string[],
  options?: { demo?: boolean; trigger?: "manual" | "auto" }
): Promise<SmsCampaign> {
  const settings = await getSmsSettings();
  // Pas de re-enrichissement Places à l’envoi : déjà fait en preview / auto.
  const preview = await previewSmsCampaignDetailed(request, {
    campaignSize: recipientSirets.length || settings.defaultCampaignSize,
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
    sentAt: new Date().toISOString(),
  };

  return addSmsCampaign(payload);
}

/** Ancienne API : envoie aux destinataires sélectionnés par défaut (mix). */
export async function executeSmsCampaign(
  request: WorkRequest,
  message: string,
  options?: { demo?: boolean }
): Promise<Omit<SmsCampaign, "id" | "createdAt">> {
  const preview = await previewSmsCampaignDetailed(request);
  const sirets = preview.candidates
    .filter((c) => c.selectedByDefault)
    .map((c) => c.siret);
  const campaign = await executeSmsCampaignToRecipients(request, message, sirets, {
    ...options,
    trigger: "manual",
  });
  const { id: _id, createdAt: _c, ...rest } = campaign;
  return rest;
}

export async function maybeAutoNotifyOnApprove(
  request: WorkRequest
): Promise<void> {
  const settings = await getSmsSettings();
  if (!settings.autoSendOnApprove) return;

  const existing = await getSmsCampaignsForWorkRequest(request.id);
  if (existing.some((c) => c.trigger === "auto")) return;

  const preview = await previewSmsCampaignDetailed(request);
  const sirets = preview.candidates
    .filter((c) => c.selectedByDefault)
    .map((c) => c.siret);
  if (sirets.length === 0) return;

  await executeSmsCampaignToRecipients(
    request,
    preview.defaultMessage,
    sirets,
    { trigger: "auto" }
  );
}
