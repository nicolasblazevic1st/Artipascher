import { companyAgeCohort } from "./artisans-for-chantier";
import { markArtisanPhoneInvalid } from "./places-quota";
import { absoluteUrl } from "./share";
import { formatWorkPrestationLabel } from "./pricing-tiers";
import {
  SMS_GSM_SINGLE_MAX,
  SMS_MARKETING_STOP_RESERVE,
  gsmSeptetCount,
  toGsm7Sms,
} from "./sms-gsm";
import {
  SMS_PER_SELECTED_ARTISAN,
  remainingSmsQuota,
  resolveMaxContactArtisans,
  smsQuotaForRequest,
} from "@/lib/contact-slots";
import {
  selectArtisansToContact,
  type ContactTargetArtisan,
} from "@/lib/select-artisans-to-contact";
import { normalizeFrenchMobile } from "./phone-format";
import { isMarketingSmsWindowOpen, sendSms } from "./sms";
import {
  addSmsCampaign,
  countContactUnlocksForAuction,
  createSmsAcquisitionCampaign,
  getActiveSmsAcquisitionCampaign,
  getMarketingSmsContactedSirets,
  getPendingReviewSmsCampaigns,
  getSmsCampaignsForAcquisition,
  getSmsAcquisitionCampaignById,
  getSmsCampaignById,
  getSmsSettings,
  getWorkRequestById,
  markProspectsContacted,
  parisDayKey,
  parisNextMarketingDayKey,
  setSmsAcquisitionStatus,
  updateSmsAcquisitionCampaign,
  updateSmsCampaign,
} from "./store";
import type {
  SmsAcquisitionCampaign,
  SmsCampaign,
  SmsCampaignRecipient,
  SmsCampaignTrigger,
  SmsCohort,
  WorkRequest,
} from "./store-types";

export interface SmsRecipientDraft {
  siret: string;
  companyName: string;
  phone: string;
  cohort?: SmsCohort;
  proId?: string;
}

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
  googleRating?: number;
  googleUserRatingCount?: number;
  bodaccStatus?: "clear" | "active_procedure" | "unavailable" | "unchecked";
  bodaccNature?: string;
}

export interface SmsCampaignPreviewDetailed {
  workRequestId: string;
  category: string;
  city: string;
  department: "59" | "62";
  auctionUrl: string;
  defaultMessage: string;
  campaignSize: number;
  artisansWanted: number;
  smsPerArtisan: number;
  /** Pref. client : true = 5+, false = 0 à 5 ans, undefined = pas de filtre âge. */
  preferEstablishedCompany?: boolean;
  /** Pref. client : uniquement artisans RGE ADEME. */
  requireRge?: boolean;
  minGoogleRating?: number;
  geoFound: boolean;
  totalNearby: number;
  gouvCount: number;
  platformCount: number;
  /** Déjà contactés par SMS marketing — exclus définitivement. */
  alreadyMarketedCount: number;
  /** Procédure collective BODACC — exclus avant Places. */
  bodaccExcluded?: number;
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
  shortfall?: number;
  radiusKm?: number;
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
  maxPlacesAttempts?: number;
  maxRatingAttempts?: number;
};

function smsJobLabel(request: WorkRequest): string {
  const full = formatWorkPrestationLabel(request);
  if (full.startsWith("Autre") || full.length > 36) return request.category;
  return full;
}

function truncateToSeptets(text: string, max: number): string {
  const gsm = toGsm7Sms(text);
  if ((gsmSeptetCount(gsm) ?? gsm.length) <= max) return gsm;
  let out = gsm;
  while (out.length > 0 && (gsmSeptetCount(`${out}...`) ?? out.length + 3) > max) {
    out = out.slice(0, -1);
  }
  return toGsm7Sms(`${out}...`);
}

/** 1 crédit / destinataire : court, alphabet GSM, sans phrase « critères ». */
export function buildDefaultCampaignMessage(request: WorkRequest): string {
  const auctionPath = request.auctionId
    ? `/offres/${request.auctionId}`
    : "/offres";
  const url = toGsm7Sms(absoluteUrl(auctionPath).replace(/^https:\/\//i, ""));
  const city = toGsm7Sms(request.city);
  const prefix = "NordArtPro : ";
  const suffix = ` a ${city} (${request.department}) ${url}`;
  const budget = Math.max(
    8,
    SMS_GSM_SINGLE_MAX -
      SMS_MARKETING_STOP_RESERVE -
      (gsmSeptetCount(prefix) ?? prefix.length) -
      (gsmSeptetCount(suffix) ?? suffix.length)
  );
  const prestation = truncateToSeptets(smsJobLabel(request), budget);
  return toGsm7Sms(`${prefix}${prestation}${suffix}`);
}

function classifyCohort(companyCreatedAt?: string): SmsCohort {
  return companyAgeCohort(companyCreatedAt) === "young"
    ? "new_young"
    : "new_established";
}

function toSmsCandidate(
  row: ContactTargetArtisan,
  selectedByDefault: boolean
): SmsCandidate {
  return {
    siret: row.siret,
    siren: row.siren,
    companyName: row.companyName,
    city: row.city,
    department: row.department,
    nafCode: row.nafCode,
    phone: row.phoneE164,
    cohort: classifyCohort(row.companyCreatedAt),
    companyCreatedAt: row.companyCreatedAt,
    source: row.source === "import" ? "import" : "gouv",
    selectedByDefault,
    distanceKm: row.distanceKm ?? undefined,
    googleRating: row.googleRating,
    googleUserRatingCount: row.googleUserRatingCount,
    bodaccStatus: row.bodaccStatus,
    bodaccNature: row.bodaccNature,
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
    maxPlacesAttempts: campaignSizeOrOptions?.maxPlacesAttempts,
    maxRatingAttempts: campaignSizeOrOptions?.maxRatingAttempts,
  };
}

export async function previewSmsCampaignDetailed(
  request: WorkRequest,
  campaignSizeOrOptions?: number | PreviewSmsCampaignOptions
): Promise<SmsCampaignPreviewDetailed> {
  const opts = resolvePreviewOptions(campaignSizeOrOptions);
  const campaignSize = opts.campaignSize ?? smsQuotaForRequest(request);
  const preferEstablishedCompany = request.preferEstablishedCompany;
  const requireRge = request.requireRge === true;
  const selected = await selectArtisansToContact(request, {
    targetCount: campaignSize,
    fillPhonesViaPlaces: opts.fillPhonesViaPlaces !== false,
    maxPlacesAttempts: opts.maxPlacesAttempts,
    maxRatingAttempts: opts.maxRatingAttempts,
  });
  const candidates: SmsCandidate[] = [
    ...selected.artisans.map((row) => toSmsCandidate(row, true)),
    ...selected.extras.withPhone.map((row) => toSmsCandidate(row, false)),
  ];
  const withoutPhone = selected.extras.withoutPhone;
  const geoFound = selected.criteria.geoFound;
  const totalNearby = selected.pool.matchingNearby;
  const gouvCount = selected.pool.matchingNearby;
  const platformCount = selected.pool.platformExcluded;
  const alreadyMarketedCount = selected.pool.alreadyMarketed;
  const placesFill = selected.placesFill;

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
      request.auctionId ? `/offres/${request.auctionId}` : "/offres"
    ),
    defaultMessage: buildDefaultCampaignMessage(request),
    campaignSize,
    artisansWanted: resolveMaxContactArtisans(request),
    smsPerArtisan: SMS_PER_SELECTED_ARTISAN,
    preferEstablishedCompany,
    requireRge,
    minGoogleRating: request.minGoogleRating,
    geoFound,
    totalNearby,
    gouvCount,
    platformCount,
    alreadyMarketedCount,
    bodaccExcluded: selected.pool.bodaccExcluded,
    cohortCounts,
    suggestedCounts,
    candidates,
    withoutPhone,
    shortfall: selected.shortfall,
    radiusKm: selected.criteria.radiusKm,
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

function parseRecipientDrafts(rows: unknown): SmsRecipientDraft[] {
  if (!Array.isArray(rows)) return [];
  const out: SmsRecipientDraft[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const siret = String(rec.siret ?? "").replace(/\D/g, "");
    const companyName = String(rec.companyName ?? "").trim();
    const phone = normalizeFrenchMobile(String(rec.phone ?? ""));
    if (siret.length !== 14 || !companyName || !phone) continue;
    if (seen.has(siret)) continue;
    seen.add(siret);
    const cohort =
      rec.cohort === "returning" ||
      rec.cohort === "new_young" ||
      rec.cohort === "new_established"
        ? rec.cohort
        : undefined;
    const proId = String(rec.proId ?? "").trim() || undefined;
    out.push({ siret, companyName, phone, cohort, proId });
  }
  return out;
}

function draftsToPendingRecipients(
  drafts: SmsRecipientDraft[]
): SmsCampaignRecipient[] {
  return drafts.map((row) => ({
    proId: row.proId,
    siret: row.siret,
    companyName: row.companyName,
    phone: row.phone,
    status: "pending" as const,
    cohort: row.cohort,
  }));
}

export { parseRecipientDrafts };

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
    /** Destinataires déjà choisis en prévisu — pas de nouvel appel Places. */
    drafts?: SmsRecipientDraft[];
  }
): Promise<SmsCampaign> {
  let recipients: SmsCampaignRecipient[];
  if (options?.drafts && options.drafts.length > 0) {
    recipients = draftsToPendingRecipients(options.drafts);
  } else {
    const preview = await previewSmsCampaignDetailed(request, {
      campaignSize: recipientSirets.length || smsQuotaForRequest(request),
      fillPhonesViaPlaces: false,
    });
    const bySiret = new Map(preview.candidates.map((c) => [c.siret, c]));
    const selected = recipientSirets
      .map((s) => bySiret.get(s))
      .filter((c): c is SmsCandidate => Boolean(c));
    recipients = draftsToPendingRecipients(
      selected.map((c) => ({
        siret: c.siret,
        companyName: c.companyName,
        phone: c.phone,
        cohort: c.cohort,
        proId: c.proId,
      }))
    );
  }

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
      acquisition =
        (await setSmsAcquisitionStatus(acq.id, "completed")) ?? acquisition;
    }
  }

  return {
    batch: updatedBatch ?? batch,
    acquisition,
    acceptedCount,
  };
}

/** Coche / décoche « prêt à partir » (envoi cron 8h). */
export async function setPendingBatchAutoSend(
  batchId: string,
  autoSend: boolean
): Promise<SmsCampaign> {
  const batch = await getSmsCampaignById(batchId);
  if (!batch) throw new Error("Lot introuvable.");
  if (batch.status !== "pending_review") {
    throw new Error("Ce lot n’est plus en attente.");
  }
  const updated = await updateSmsCampaign(batchId, { autoSend });
  if (!updated) throw new Error("Lot introuvable.");
  return updated;
}

/**
 * Seule tâche cron SMS : envoyer les lots cochés « prêt à partir ».
 * À lancer lun–sam vers 8h (heure de Paris). Hors fenêtre : aucun envoi.
 */
export async function sendReadyPendingBatches(): Promise<{
  windowOpen: boolean;
  readyCount: number;
  sent: number;
  cancelled: number;
  failed: number;
  results: Array<{
    batchId: string;
    status: SmsCampaign["status"];
    sentCount: number;
    skippedReason?: string;
    error?: string;
  }>;
}> {
  if (!isMarketingSmsWindowOpen()) {
    return {
      windowOpen: false,
      readyCount: 0,
      sent: 0,
      cancelled: 0,
      failed: 0,
      results: [],
    };
  }

  const ready = (await getPendingReviewSmsCampaigns()).filter(
    (batch) => batch.autoSend === true
  );
  const results: Array<{
    batchId: string;
    status: SmsCampaign["status"];
    sentCount: number;
    skippedReason?: string;
    error?: string;
  }> = [];
  let sent = 0;
  let cancelled = 0;
  let failed = 0;

  for (const batch of ready) {
    try {
      const result = await approvePendingReviewBatch(batch.id);
      const status = result.batch.status;
      if (status === "cancelled") cancelled += 1;
      else if (status === "failed") failed += 1;
      else sent += 1;
      results.push({
        batchId: batch.id,
        status,
        sentCount: result.batch.sentCount,
        skippedReason: result.skippedReason,
      });
    } catch (err) {
      failed += 1;
      results.push({
        batchId: batch.id,
        status: "pending_review",
        sentCount: 0,
        error: err instanceof Error ? err.message : "Envoi impossible.",
      });
    }
  }

  return {
    windowOpen: true,
    readyCount: ready.length,
    sent,
    cancelled,
    failed,
    results,
  };
}

/** Annule les lots prévus pour aujourd’hui si places pleines ou quota SMS atteint. */
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
    const acq = batch.acquisitionCampaignId
      ? await getSmsAcquisitionCampaignById(batch.acquisitionCampaignId)
      : null;
    const slotsFull = accepted >= resolveMaxContactArtisans(request);
    const quotaDone = remainingSmsQuota(request, acq?.totalSent ?? 0) <= 0;
    if (!slotsFull && !quotaDone) continue;

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

/** Supprime un lot encore en revue : aucun OVH, destinataires non marqués contactés. */
export async function discardPendingReviewBatch(
  batchId: string
): Promise<SmsCampaign> {
  const batch = await getSmsCampaignById(batchId);
  if (!batch) throw new Error("Lot introuvable.");
  if (batch.status !== "pending_review") {
    throw new Error("Ce lot n’est plus en attente de validation.");
  }

  const updated = await updateSmsCampaign(batchId, {
    status: "cancelled",
    sentAt: new Date().toISOString(),
    recipients: batch.recipients.map((r) => ({
      ...r,
      status: "skipped" as const,
      error: r.error ?? "Lot supprimé avant envoi",
    })),
  });
  if (!updated) throw new Error("Lot introuvable.");
  return updated;
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
    drafts?: SmsRecipientDraft[];
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
      drafts: options?.drafts,
    });
  }

  let selected: SmsCandidate[];
  if (options?.drafts && options.drafts.length > 0) {
    selected = options.drafts.map((row) => ({
      siret: row.siret,
      siren: row.siret.slice(0, 9),
      companyName: row.companyName,
      city: request.city,
      department: request.department,
      phone: row.phone,
      cohort: row.cohort ?? classifyCohort(),
      source: "gouv" as const,
      selectedByDefault: true,
      proId: row.proId,
    }));
  } else {
    // Pas de re-enrichissement Places à l’envoi : déjà fait en preview / tick.
    const preview = await previewSmsCampaignDetailed(request, {
      campaignSize: recipientSirets.length || smsQuotaForRequest(request),
      fillPhonesViaPlaces: false,
    });
    const bySiret = new Map(preview.candidates.map((c) => [c.siret, c]));
    selected = recipientSirets
      .map((s) => bySiret.get(s))
      .filter((c): c is SmsCandidate => Boolean(c));
  }

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
 * Prépare ou envoie un seul lot. Pas de vagues suivantes jusqu’à 5/5.
 */
export async function runAcquisitionCampaignTick(
  acquisitionId: string,
  options?: {
    demo?: boolean;
    message?: string;
    /** SIRET du lot (sélection admin). Sinon sélection auto. */
    recipientSirets?: string[];
    /** Taille du lot choisie en admin. Prioritaire sur le quota 5 × artisans. */
    lotSize?: number;
    drafts?: SmsRecipientDraft[];
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
  const existingBatches = await getSmsCampaignsForAcquisition(acquisition.id);
  const existingPending = existingBatches.find(
    (c) => c.status === "pending_review"
  );
  if (existingPending) {
    return {
      acquisition,
      acceptedCount,
      batch: existingPending,
      skippedReason: "pending_review_exists",
    };
  }
  const alreadySent = existingBatches.some(
    (c) =>
      c.status === "sent" || c.status === "demo" || c.status === "failed"
  );
  if (alreadySent) {
    const updated =
      (await setSmsAcquisitionStatus(acquisition.id, "completed")) ??
      acquisition;
    return {
      acquisition: updated,
      acceptedCount,
      skippedReason: "already_sent_once",
    };
  }

  const drafts = options?.drafts ?? [];
  const requested = (
    drafts.length > 0
      ? drafts.map((row) => row.siret)
      : (options?.recipientSirets ?? [])
  )
    .map((s) => s.trim())
    .filter(Boolean);
  const lotSize = Math.min(
    200,
    Math.max(
      1,
      Math.floor(
        requested.length > 0
          ? requested.length
          : options?.lotSize ??
              acquisition.smsPerDay ??
              smsQuotaForRequest(request)
      )
    )
  );

  let sirets = requested;
  let previewMessage = "";
  if (drafts.length === 0) {
    const preview = await previewSmsCampaignDetailed(request, {
      campaignSize: Math.max(lotSize, requested.length, 50),
      fillPhonesViaPlaces: true,
    });
    previewMessage = preview.defaultMessage;
    sirets =
      requested.length > 0
        ? requested.filter((siret) =>
            preview.candidates.some((c) => c.siret === siret)
          )
        : preview.candidates
            .filter((c) => c.selectedByDefault)
            .map((c) => c.siret)
            .slice(0, lotSize);
  }

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
    previewMessage ||
    buildDefaultCampaignMessage(request);

  const batch = await executeSmsCampaignToRecipients(request, message, sirets, {
    demo: options?.demo,
    trigger: acquisition.trigger,
    acquisitionCampaignId: acquisition.id,
    pendingReviewOnly: reviewMode,
    drafts: drafts.length > 0 ? drafts : undefined,
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

  const sentOnTargetDay =
    acquisition.lastSendDate === today ? acquisition.sentOnLastDate : 0;
  let updated = await updateSmsAcquisitionCampaign(acquisition.id, {
    totalSent: acquisition.totalSent + batch.sentCount,
    lastSendDate: today,
    sentOnLastDate: sentOnTargetDay + batch.sentCount,
  });

  const acceptedAfter = await acceptedCountForRequest(request);
  if (batch.sentCount === 0) {
    updated =
      (await setSmsAcquisitionStatus(acquisition.id, "exhausted")) ?? updated;
  } else {
    updated =
      (await setSmsAcquisitionStatus(acquisition.id, "completed")) ?? updated;
  }

  return {
    acquisition: updated ?? acquisition,
    acceptedCount: acceptedAfter,
    batch,
  };
}

/** Démarre un lot unique (plus de relances jusqu’à 5/5). */
export async function startAcquisitionCampaign(
  request: WorkRequest,
  options?: {
    demo?: boolean;
    message?: string;
    trigger?: SmsCampaignTrigger;
    smsPerDay?: number;
    /** SIRET du lot du jour (sélection admin). Sinon sélection auto. */
    recipientSirets?: string[];
    drafts?: SmsRecipientDraft[];
  }
): Promise<AcquisitionTickResult> {
  const lotSize = Math.min(
    200,
    Math.max(
      1,
      Math.floor(
        options?.drafts && options.drafts.length > 0
          ? options.drafts.length
          : options?.recipientSirets && options.recipientSirets.length > 0
            ? options.recipientSirets.length
            : options?.smsPerDay ?? smsQuotaForRequest(request)
      )
    )
  );
  const existing = await getActiveSmsAcquisitionCampaign(request.id);
  if (existing) {
    if (existing.status === "paused") {
      await setSmsAcquisitionStatus(existing.id, "active");
    }
    return runAcquisitionCampaignTick(existing.id, {
      demo: options?.demo,
      message: options?.message,
      recipientSirets: options?.recipientSirets,
      lotSize,
      drafts: options?.drafts,
    });
  }

  if (request.status !== "approved" || !request.auctionId) {
    throw new Error(
      "La demande doit être approuvée avec une enchère pour démarrer une campagne."
    );
  }

  const acquisition = await createSmsAcquisitionCampaign({
    workRequestId: request.id,
    smsPerDay: lotSize,
    trigger: options?.trigger ?? "manual",
  });

  return runAcquisitionCampaignTick(acquisition.id, {
    demo: options?.demo,
    message: options?.message,
    recipientSirets: options?.recipientSirets,
    lotSize,
    drafts: options?.drafts,
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

/** Ancien cron multi-jours : ne prépare plus de lots. */
export async function runAllActiveAcquisitionTicks(): Promise<{
  processed: number;
  results: AcquisitionTickResult[];
}> {
  return { processed: 0, results: [] };
}

/** Plus de campagne auto à l’approbation (pas de spam jusqu’à 5/5). */
export async function maybeAutoNotifyOnApprove(
  _request: WorkRequest
): Promise<void> {
  return;
}
