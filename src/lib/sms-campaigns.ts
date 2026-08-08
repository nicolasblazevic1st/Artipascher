import { getArtisansNearWorkRequest } from "./artisans-nearby";
import { upsertArtisan } from "./artisans-db";
import {
  findNearbyBusinesses,
  type NearbyBusiness,
} from "./nearby-businesses";
import { isGooglePlacesEnabled } from "./google-places";
import { markArtisanPhoneInvalid } from "./places-quota";
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
}

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
  }>;
}

function isYoungCompany(createdAt?: string): boolean {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < TWO_YEARS_MS;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickUpTo<T>(items: T[], n: number): T[] {
  return shuffle(items).slice(0, Math.max(0, n));
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

async function mergeProspectPool(
  request: WorkRequest
): Promise<{
  withPhone: SmsCandidate[];
  withoutPhone: SmsCampaignPreviewDetailed["withoutPhone"];
  geoFound: boolean;
  totalNearby: number;
  gouvCount: number;
  platformCount: number;
  alreadyMarketedCount: number;
}> {
  // Base locale enrichie (rayon). Places production : seulement si activé explicitement.
  const nearbyDb = await getArtisansNearWorkRequest(request, {
    enrichProduction: isGooglePlacesEnabled(),
    maxEnrich: 20,
  });

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

  const withPhone: SmsCandidate[] = [];
  const withoutPhone: SmsCampaignPreviewDetailed["withoutPhone"] = [];
  const seen = new Set<string>();

  function pushBusiness(b: NearbyBusiness | ArtisanProspect) {
    const siret = "siret" in b ? b.siret : "";
    if (!siret || seen.has(siret)) return;
    seen.add(siret);

    const prospect = prospectBySiret.get(siret);
    if (prospect?.optedOut) return;

    const source =
      ("source" in b ? b.source : undefined) ?? prospect?.source ?? "gouv";
    const proId = "proId" in b ? b.proId : undefined;
    // Campagnes marketing = acquisition hors plateforme (pas les inscrits).
    if (source === "platform" || proId) return;

    const lastContactedAt = prospect?.lastContactedAt;
    // Déjà contactés par SMS campagne → plus jamais de marketing.
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

    if (!phone) {
      withoutPhone.push({
        siret,
        companyName,
        city,
        companyCreatedAt,
        source,
      });
      return;
    }

    withPhone.push({
      siret,
      siren,
      companyName,
      city,
      department,
      nafCode,
      phone,
      cohort: classifyCohort(lastContactedAt, companyCreatedAt),
      companyCreatedAt,
      lastContactedAt,
      source,
      proId,
      selectedByDefault: false,
    });
  }

  // Priorité : artisans géolocalisés + enrichis en base locale.
  for (const a of nearbyDb.artisans) {
    pushBusiness({
      siret: a.siret,
      siren: a.siren,
      name: a.companyName,
      city: a.city,
      department: a.department,
      nafCode: a.nafCode,
      source: a.source === "platform" ? "platform" : "gouv",
      companyCreatedAt: a.companyCreatedAt,
      phone: a.phone,
    });
  }

  for (const b of businesses) pushBusiness(b);

  // Prospects already enriched for this dept even if not in this near_point page.
  for (const p of prospects) {
    if (p.department !== request.department) continue;
    if (!p.phone) continue;
    pushBusiness(p);
  }

  return {
    withPhone,
    withoutPhone,
    geoFound: geoFound || nearbyDb.origin != null,
    totalNearby: Math.max(businesses.length, nearbyDb.artisans.length),
    gouvCount,
    platformCount,
    alreadyMarketedCount,
  };
}

function applyMixSelection(
  candidates: SmsCandidate[],
  campaignSize: number,
  options?: { preferEstablishedCompany?: boolean }
): SmsCandidate[] {
  // Marketing SMS : jamais les « returning » (déjà contactés exclus du pool).
  const young = candidates.filter((c) => c.cohort === "new_young");
  const established = candidates.filter((c) => c.cohort === "new_established");

  // Préférence client « +2 ans » : 1/3 jeunes / 2/3 établis.
  // Sinon : ~50/50 jeunes / établis.
  let nYoung: number;
  let nEstablished: number;
  if (options?.preferEstablishedCompany) {
    nYoung = Math.min(young.length, Math.floor(campaignSize / 3));
    nEstablished = Math.min(established.length, campaignSize - nYoung);
  } else {
    nYoung = Math.min(young.length, Math.ceil(campaignSize / 2));
    nEstablished = Math.min(established.length, campaignSize - nYoung);
  }

  let rem = campaignSize - nYoung - nEstablished;
  while (rem > 0) {
    const preferEst =
      options?.preferEstablishedCompany || nEstablished <= nYoung;
    if (preferEst && nEstablished < established.length) {
      nEstablished += 1;
      rem -= 1;
      continue;
    }
    if (nYoung < young.length) {
      nYoung += 1;
      rem -= 1;
      continue;
    }
    if (nEstablished < established.length) {
      nEstablished += 1;
      rem -= 1;
      continue;
    }
    break;
  }

  const selectedSirets = new Set([
    ...pickUpTo(young, nYoung).map((c) => c.siret),
    ...pickUpTo(established, nEstablished).map((c) => c.siret),
  ]);

  return candidates.map((c) => ({
    ...c,
    selectedByDefault: selectedSirets.has(c.siret),
  }));
}

export async function previewSmsCampaignDetailed(
  request: WorkRequest,
  campaignSizeOverride?: number
): Promise<SmsCampaignPreviewDetailed> {
  const settings = await getSmsSettings();
  const campaignSize = campaignSizeOverride ?? settings.defaultCampaignSize;
  const {
    withPhone,
    withoutPhone,
    geoFound,
    totalNearby,
    gouvCount,
    platformCount,
    alreadyMarketedCount,
  } = await mergeProspectPool(request);

  const preferEstablishedCompany = request.preferEstablishedCompany === true;
  const candidates = applyMixSelection(withPhone, campaignSize, {
    preferEstablishedCompany,
  });

  const cohortCounts: Record<SmsCohort, number> = {
    returning: 0,
    new_young: withPhone.filter((c) => c.cohort === "new_young").length,
    new_established: withPhone.filter((c) => c.cohort === "new_established").length,
  };

  const suggestedCounts: Record<SmsCohort, number> = {
    returning: 0,
    new_young: candidates.filter((c) => c.selectedByDefault && c.cohort === "new_young")
      .length,
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
  const preview = await previewSmsCampaignDetailed(request, recipientSirets.length || undefined);
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
