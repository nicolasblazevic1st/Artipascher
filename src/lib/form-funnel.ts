import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import {
  ANALYTICS_EVENT,
  formNameFromAnalytics,
  isAnalyticsEventName,
  sanitizeAnalyticsParams,
  sanitizeWorkCategoryParam,
  type GtagParamValue,
} from "@/lib/analytics-events";
import { cleanTrackingParam, keywordGroupKey } from "@/lib/utm";
import { listKnownAdminIps } from "@/lib/admin-known-ips";
import { isMetaCrawlerIp } from "@/lib/analytics-bots";
import { resolveWorkCategoryFromAdsQuery } from "@/lib/work-categories";
import { normalizeStoredClientIp } from "@/lib/request-client";

const DB_PATH = path.join(process.cwd(), "data", "form-funnel.json");
const MAX_EVENTS = 25_000;
const MAX_DRAFTS = 3_000;
const RETENTION_DAYS = 90;
const MAX_SESSION_ID_LEN = 64;
const MAX_DRAFT_OTHER_LEN = 200;
const MAX_DRAFT_DESCRIPTION_LEN = 2_000;

export type FormFunnelFormName = "work_request" | "pro_registration";

export interface FormFunnelEvent {
  id: string;
  at: string;
  sessionId: string;
  name: string;
  params: Record<string, GtagParamValue>;
  gaSent: boolean;
  /** True when the visitor had a valid admin session cookie. */
  internal?: boolean;
  /** Client IP (server-side). Security / abuse / diagnosis. Never sent to GA. */
  ip?: string;
}

export interface FormFunnelDraft {
  sessionId: string;
  updatedAt: string;
  workCategory?: string;
  otherWork?: string;
  description?: string;
  ip?: string;
}

interface FormFunnelDb {
  events: FormFunnelEvent[];
  drafts: FormFunnelDraft[];
}

export interface FunnelStepStat {
  id: string;
  label: string;
  sessions: number;
  percentOfStart: number;
  dropOffFromPrevious: number | null;
}

export interface CountRow {
  key: string;
  label: string;
  sessions: number;
  events: number;
}

export interface IntentRow {
  key: string;
  label: string;
  sessions: number;
  submitted: number;
  conversionPercent: number;
}

export interface StepTimeRow {
  key: string;
  label: string;
  samples: number;
  medianSeconds: number;
}

export interface FunnelSessionRow {
  sessionShort: string;
  startedAt: string;
  lastAt: string;
  durationMs: number;
  outcome: string;
  lastLabel: string;
  variant?: string;
  guestMode?: boolean;
  utmContent?: string;
  utmSource?: string;
  utmCampaign?: string;
  utmTerm?: string;
  device?: string;
  adsClick?: boolean;
  workCategory?: string;
  adsCategory?: string;
  keywordCategory?: string;
  gaSent: boolean;
  otherWork?: string;
  descriptionDraft?: string;
  internal?: boolean;
  ip?: string;
}

export interface FunnelSavedTextRow {
  sessionShort: string;
  updatedAt: string;
  workCategory?: string;
  otherWork?: string;
  description?: string;
  submitted: boolean;
  internal?: boolean;
  ip?: string;
}

export interface FormFunnelSide {
  sessions: number;
  submitted: number;
  conversionPercent: number;
  funnel: FunnelStepStat[];
  lastStep: CountRow[];
  abandons: CountRow[];
  validationErrors: CountRow[];
  byVariant: CountRow[];
  byUtmContent: CountRow[];
  byUtmSource: CountRow[];
  byUtmCampaign: IntentRow[];
  byUtmTerm: IntentRow[];
  byWorkCategory: IntentRow[];
  byDevice: IntentRow[];
  byAdsMismatch: IntentRow[];
  stepTimes: StepTimeRow[];
  recent: FunnelSessionRow[];
  savedTexts: FunnelSavedTextRow[];
}

export interface FormFunnelReport {
  rangeDays: number;
  since: string;
  until: string;
  totalEvents: number;
  internalLeadSessions: number;
  internalProSessions: number;
  lead: FormFunnelSide;
  pro: FormFunnelSide;
}

const EMPTY_DB: FormFunnelDb = { events: [], drafts: [] };

const LEAD_STEP_LABELS: Record<number, string> = {
  1: "Étape 1 — Travaux",
  2: "Étape 2 — Bien",
  3: "Étape 3 — Projet",
  4: "Étape 4 — Contact",
};

const PRO_SECTION_LABELS: Record<string, string> = {
  siret_verify: "Vérification SIRET",
  identity: "Identité",
  trades_groups: "Métiers",
  trades_qualibat: "Spécialités Qualibat",
  documents: "Documents",
  password: "Mot de passe",
  submit: "Envoi",
};

const ERROR_LABELS: Record<string, string> = {
  invalid_category: "Catégorie invalide",
  naf_required: "Spécialité NAF requise",
  naf_invalid: "NAF invalide",
  other_work_too_short: "« Autre travail » trop court",
  other_work_too_long: "« Autre travail » trop long",
  work_option_invalid: "Prestation invalide",
  work_option_naf_mismatch: "Prestation / NAF",
  pricing_tier_required: "Fourchette de prix manquante",
  description_required: "Description obligatoire",
  description_too_short: "Description trop courte",
  too_many_photos: "Trop de photos",
  photo_missing: "Photo manquante",
  photo_format: "Format photo",
  photo_too_large: "Photo trop lourde",
  photos_invalid: "Photos invalides",
  rcs_not_verified: "SIRET non vérifié",
  password_mismatch: "Mots de passe différents",
  no_trade_group: "Aucun métier coché",
  missing_qualibat_job: "Spécialité Qualibat manquante",
  invalid_trade_selection: "Sélection métiers invalide",
  missing_document: "Document manquant",
  invalid_document: "Document invalide",
};

const VARIANT_LABELS: Record<string, string> = {
  default: "Formulaire métier",
  general: "Je ne sais pas / plusieurs métiers",
};

let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function asString(value: GtagParamValue | undefined): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function asNumber(value: GtagParamValue | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function asBoolean(value: GtagParamValue | undefined): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

function storedIp(value: unknown): string | undefined {
  return typeof value === "string" ? normalizeStoredClientIp(value) : undefined;
}

function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function isValidFunnelSessionId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{8,64}$/.test(value) && value.length <= MAX_SESSION_ID_LEN;
}

async function ensureDb(): Promise<void> {
  const dir = path.dirname(DB_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(EMPTY_DB), "utf-8");
  }
}

function clipDraftText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, max);
  return cleaned || undefined;
}

function isFormFunnelDraft(value: unknown): value is FormFunnelDraft {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.sessionId === "string" &&
    isValidFunnelSessionId(rec.sessionId) &&
    typeof rec.updatedAt === "string"
  );
}

function normalizeDraft(draft: FormFunnelDraft): FormFunnelDraft {
  const ip = storedIp(draft.ip);
  if (ip === draft.ip) return draft;
  const next = { ...draft };
  if (ip) next.ip = ip;
  else delete next.ip;
  return next;
}

function normalizeEvent(event: FormFunnelEvent): FormFunnelEvent {
  const ip = storedIp(event.ip);
  if (ip === event.ip) return event;
  const next = { ...event };
  if (ip) next.ip = ip;
  else delete next.ip;
  return next;
}

async function readDb(): Promise<FormFunnelDb> {
  await ensureDb();
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<FormFunnelDb>;
    return {
      events: Array.isArray(parsed.events)
        ? (parsed.events as FormFunnelEvent[]).map(normalizeEvent)
        : [],
      drafts: Array.isArray(parsed.drafts)
        ? parsed.drafts.filter(isFormFunnelDraft).map(normalizeDraft)
        : [],
    };
  } catch {
    return { events: [], drafts: [] };
  }
}

async function writeDb(db: FormFunnelDb): Promise<void> {
  await ensureDb();
  await fs.writeFile(DB_PATH, JSON.stringify(db), "utf-8");
}

function pruneEvents(events: FormFunnelEvent[], now = Date.now()): FormFunnelEvent[] {
  const cutoff = now - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const kept = events.filter((e) => {
    const t = Date.parse(e.at);
    if (!Number.isFinite(t) || t < cutoff) return false;
    if (isMetaCrawlerIp(e.ip)) return false;
    return true;
  });
  if (kept.length > MAX_EVENTS) {
    return kept.slice(kept.length - MAX_EVENTS);
  }
  return kept;
}

function pruneDrafts(drafts: FormFunnelDraft[], now = Date.now()): FormFunnelDraft[] {
  const cutoff = now - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const kept = drafts.filter((draft) => {
    const t = Date.parse(draft.updatedAt);
    return Number.isFinite(t) && t >= cutoff;
  });
  if (kept.length > MAX_DRAFTS) {
    return kept
      .slice()
      .sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt))
      .slice(kept.length - MAX_DRAFTS);
  }
  return kept;
}

export async function appendFormFunnelEvent(input: {
  sessionId: string;
  name: string;
  params?: Record<string, unknown>;
  gaSent?: boolean;
  internal?: boolean;
  ip?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidFunnelSessionId(input.sessionId)) {
    return { ok: false, error: "session invalide" };
  }
  if (!isAnalyticsEventName(input.name)) {
    return { ok: false, error: "événement inconnu" };
  }

  const params = sanitizeAnalyticsParams(input.params);
  const formName = formNameFromAnalytics(input.name, params);
  params.form_name = formName;
  const ip = storedIp(input.ip);

  const event: FormFunnelEvent = {
    id: randomBytes(8).toString("hex"),
    at: new Date().toISOString(),
    sessionId: input.sessionId,
    name: input.name,
    params,
    gaSent: input.gaSent === true,
    ...(input.internal ? { internal: true } : {}),
    ...(ip ? { ip } : {}),
  };

  await enqueueWrite(async () => {
    const db = await readDb();
    const knownAdminIp =
      ip != null &&
      (db.events.some(
        (row) => row.internal === true && storedIp(row.ip) === ip
      ) ||
        (await listKnownAdminIps()).has(ip));
    if (input.internal || knownAdminIp) event.internal = true;
    db.events = pruneEvents([...db.events, event]);
    db.drafts = pruneDrafts(db.drafts);
    await writeDb(db);
  });

  return { ok: true };
}

export async function upsertFormFunnelDraft(input: {
  sessionId: string;
  workCategory?: string;
  otherWork?: string;
  description?: string;
  ip?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidFunnelSessionId(input.sessionId)) {
    return { ok: false, error: "session invalide" };
  }

  const otherWork = clipDraftText(input.otherWork, MAX_DRAFT_OTHER_LEN);
  const description = clipDraftText(
    input.description,
    MAX_DRAFT_DESCRIPTION_LEN
  );
  const workCategory = sanitizeWorkCategoryParam({
    workCategory: input.workCategory,
  });

  if (!otherWork && !description) {
    return { ok: true };
  }

  const now = new Date().toISOString();
  const ip = storedIp(input.ip);

  await enqueueWrite(async () => {
    const db = await readDb();
    const drafts = pruneDrafts(db.drafts);
    const index = drafts.findIndex((row) => row.sessionId === input.sessionId);
    const previous = index >= 0 ? drafts[index] : undefined;
    const next: FormFunnelDraft = {
      sessionId: input.sessionId,
      updatedAt: now,
      workCategory: workCategory ?? previous?.workCategory,
      otherWork: otherWork ?? previous?.otherWork,
      description: description ?? previous?.description,
      ...(ip ? { ip } : previous?.ip ? { ip: previous.ip } : {}),
    };
    if (index >= 0) drafts[index] = next;
    else drafts.push(next);
    db.drafts = pruneDrafts(drafts);
    await writeDb(db);
  });

  return { ok: true };
}

interface SessionAgg {
  id: string;
  form: FormFunnelFormName;
  firstAt: number;
  lastAt: number;
  names: Set<string>;
  maxStepViewed: number;
  completedSteps: Set<number>;
  submitted: boolean;
  abandoned: boolean;
  abandonStep?: number;
  abandonSection?: string;
  variant?: string;
  guestMode?: boolean;
  utmContent?: string;
  utmSource?: string;
  utmTerm?: string;
  utmCampaign?: string;
  workCategory?: string;
  adsCategory?: string;
  device?: string;
  adsClick?: boolean;
  lastEventName?: string;
  stepDurations: Map<number, number>;
  lastSection?: string;
  sections: Set<string>;
  rcsAttempt: boolean;
  rcsSuccess: boolean;
  gaSent: boolean;
  internal?: boolean;
  ip?: string;
  ipAt?: number;
  errorCounts: Map<string, number>;
}

function bumpCount(
  map: Map<string, { sessions: Set<string>; events: number }>,
  key: string,
  sessionId: string
) {
  const row = map.get(key) ?? { sessions: new Set<string>(), events: 0 };
  row.sessions.add(sessionId);
  row.events += 1;
  map.set(key, row);
}

function toCountRows(
  map: Map<string, { sessions: Set<string>; events: number }>,
  labels: Record<string, string>,
  fallback = (key: string) => key
): CountRow[] {
  return [...map.entries()]
    .map(([key, row]) => ({
      key,
      label: labels[key] ?? fallback(key),
      sessions: row.sessions.size,
      events: row.events,
    }))
    .sort((a, b) => b.sessions - a.sessions || b.events - a.events);
}

function toIntentRows(
  sessions: SessionAgg[],
  pick: (session: SessionAgg) => { key: string; label: string } | undefined
): IntentRow[] {
  const map = new Map<
    string,
    { label: string; labelCounts: Map<string, number>; ids: Set<string>; submitted: Set<string> }
  >();
  for (const session of sessions) {
    const picked = pick(session);
    if (!picked) continue;
    const row =
      map.get(picked.key) ?? {
        label: picked.label,
        labelCounts: new Map<string, number>(),
        ids: new Set<string>(),
        submitted: new Set<string>(),
      };
    row.ids.add(session.id);
    if (session.submitted) row.submitted.add(session.id);
    row.labelCounts.set(
      picked.label,
      (row.labelCounts.get(picked.label) ?? 0) + 1
    );
    map.set(picked.key, row);
  }
  return [...map.entries()]
    .map(([key, row]) => {
      let label = row.label;
      let best = 0;
      for (const [candidate, count] of row.labelCounts) {
        if (count > best) {
          best = count;
          label = candidate;
        }
      }
      return {
        key,
        label,
        sessions: row.ids.size,
        submitted: row.submitted.size,
        conversionPercent: percent(row.submitted.size, row.ids.size),
      };
    })
    .sort((a, b) => b.sessions - a.sessions || b.submitted - a.submitted)
    .slice(0, 40);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function categoryIntentLabel(value: string): string {
  return value === "unknown" ? "Je ne sais pas / plusieurs métiers" : value;
}

function realWorkCategory(value: string | undefined): string | undefined {
  if (!value || value === "unknown") return undefined;
  return value;
}

function sessionKeywordCategory(session: SessionAgg): string | undefined {
  if (!session.utmTerm && !session.utmContent) return undefined;
  return realWorkCategory(
    resolveWorkCategoryFromAdsQuery({
      utmTerm: session.utmTerm,
      keyword: session.utmTerm,
      utmContent: session.utmContent,
    })
  );
}

function sessionArrivalCategory(session: SessionAgg): string | undefined {
  return (
    realWorkCategory(session.adsCategory) ?? sessionKeywordCategory(session)
  );
}

const DEVICE_LABELS: Record<string, string> = {
  mobile: "Téléphone",
  tablet: "Tablette",
  desktop: "Ordinateur",
};

function toStepTimeRows(sessions: SessionAgg[]): StepTimeRow[] {
  const byStep = new Map<number, number[]>();
  for (const session of sessions) {
    for (const [step, ms] of session.stepDurations) {
      if (!Number.isFinite(ms) || ms < 0) continue;
      const list = byStep.get(step) ?? [];
      list.push(ms);
      byStep.set(step, list);
    }
  }
  return [...byStep.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([step, samples]) => {
      const med = median(samples) ?? 0;
      return {
        key: String(step),
        label: LEAD_STEP_LABELS[step] ?? `Étape ${step}`,
        samples: samples.length,
        medianSeconds: Math.max(0, Math.round(med / 1000)),
      };
    });
}

function funnelSteps(
  sessions: SessionAgg[],
  steps: Array<{ id: string; label: string; match: (s: SessionAgg) => boolean }>
): FunnelStepStat[] {
  const startCount = sessions.length;
  let previous = startCount;
  return steps.map((step, index) => {
    const count = sessions.filter(step.match).length;
    const drop =
      index === 0 || previous <= 0 ? null : percent(previous - count, previous);
    previous = count;
    return {
      id: step.id,
      label: step.label,
      sessions: count,
      percentOfStart: percent(count, startCount),
      dropOffFromPrevious: drop,
    };
  });
}

function emptySide(): FormFunnelSide {
  return {
    sessions: 0,
    submitted: 0,
    conversionPercent: 0,
    funnel: [],
    lastStep: [],
    abandons: [],
    validationErrors: [],
    byVariant: [],
    byUtmContent: [],
    byUtmSource: [],
    byUtmCampaign: [],
    byUtmTerm: [],
    byWorkCategory: [],
    byDevice: [],
    byAdsMismatch: [],
    stepTimes: [],
    recent: [],
    savedTexts: [],
  };
}

function toSavedTextRows(
  sessions: SessionAgg[],
  drafts: FormFunnelDraft[]
): FunnelSavedTextRow[] {
  const submittedIds = new Set(
    sessions.filter((session) => session.submitted).map((session) => session.id)
  );
  const internalIds = new Set(
    sessions.filter((session) => session.internal).map((session) => session.id)
  );
  const categoryById = new Map(
    sessions.map((session) => [session.id, session.workCategory])
  );
  const ipById = new Map(
    sessions
      .filter((session) => session.ip)
      .map((session) => [session.id, session.ip])
  );
  return drafts
    .filter((draft) => Boolean(draft.otherWork || draft.description))
    .slice()
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .map((draft) => ({
      sessionShort: draft.sessionId.slice(-6),
      updatedAt: draft.updatedAt,
      workCategory:
        draft.workCategory ?? categoryById.get(draft.sessionId),
      otherWork: draft.otherWork,
      description: draft.description,
      submitted: submittedIds.has(draft.sessionId),
      internal: internalIds.has(draft.sessionId),
      ip: draft.ip ?? ipById.get(draft.sessionId),
    }));
}

function buildLeadSide(
  sessions: SessionAgg[],
  drafts: FormFunnelDraft[] = []
): FormFunnelSide {
  const savedTexts = toSavedTextRows(sessions, drafts);
  if (sessions.length === 0) return { ...emptySide(), savedTexts };

  const submitted = sessions.filter((s) => s.submitted).length;
  const lastStep = new Map<string, { sessions: Set<string>; events: number }>();
  const abandons = new Map<string, { sessions: Set<string>; events: number }>();
  const errors = new Map<string, { sessions: Set<string>; events: number }>();
  const variants = new Map<string, { sessions: Set<string>; events: number }>();
  const utmContent = new Map<string, { sessions: Set<string>; events: number }>();
  const utmSource = new Map<string, { sessions: Set<string>; events: number }>();

  for (const session of sessions) {
    const lastKey = session.submitted
      ? "submitted"
      : session.maxStepViewed >= 1
        ? String(session.maxStepViewed)
        : "start";
    bumpCount(lastStep, lastKey, session.id);
    if (session.abandoned && !session.submitted) {
      bumpCount(
        abandons,
        session.abandonStep ? String(session.abandonStep) : "unknown",
        session.id
      );
    }
    for (const [code, count] of session.errorCounts) {
      const row = errors.get(code) ?? { sessions: new Set<string>(), events: 0 };
      row.sessions.add(session.id);
      row.events += count;
      errors.set(code, row);
    }
    if (session.variant) bumpCount(variants, session.variant, session.id);
    if (session.utmContent) bumpCount(utmContent, session.utmContent, session.id);
    if (session.utmSource) bumpCount(utmSource, session.utmSource, session.id);
  }

  const lastStepLabels: Record<string, string> = {
    start: "Ouverture seulement",
    submitted: "Demande envoyée",
    "1": LEAD_STEP_LABELS[1],
    "2": LEAD_STEP_LABELS[2],
    "3": LEAD_STEP_LABELS[3],
    "4": LEAD_STEP_LABELS[4],
  };
  const draftBySession = new Map(
    drafts.map((draft) => [draft.sessionId, draft])
  );

  return {
    sessions: sessions.length,
    submitted,
    conversionPercent: percent(submitted, sessions.length),
    funnel: funnelSteps(sessions, [
      { id: "start", label: "Ouverture du formulaire", match: () => true },
      {
        id: "step1",
        label: LEAD_STEP_LABELS[1],
        match: (s) => s.maxStepViewed >= 1 || s.names.has(ANALYTICS_EVENT.LEAD_FORM_START),
      },
      {
        id: "step1_done",
        label: "Étape 1 validée",
        match: (s) => s.completedSteps.has(1),
      },
      { id: "step2", label: LEAD_STEP_LABELS[2], match: (s) => s.maxStepViewed >= 2 },
      {
        id: "step2_done",
        label: "Étape 2 validée",
        match: (s) => s.completedSteps.has(2),
      },
      { id: "step3", label: LEAD_STEP_LABELS[3], match: (s) => s.maxStepViewed >= 3 },
      {
        id: "step3_done",
        label: "Étape 3 validée",
        match: (s) => s.completedSteps.has(3),
      },
      { id: "step4", label: LEAD_STEP_LABELS[4], match: (s) => s.maxStepViewed >= 4 },
      {
        id: "otp_sent",
        label: "SMS de vérification envoyé",
        match: (s) => s.names.has(ANALYTICS_EVENT.LEAD_FORM_OTP_SENT),
      },
      {
        id: "otp_ok",
        label: "Mobile vérifié",
        match: (s) => s.names.has(ANALYTICS_EVENT.LEAD_FORM_OTP_VERIFIED),
      },
      {
        id: "submit_try",
        label: "Clic sur envoyer",
        match: (s) => s.names.has(ANALYTICS_EVENT.LEAD_FORM_SUBMIT_ATTEMPT),
      },
      {
        id: "submit",
        label: "Demande envoyée",
        match: (s) => s.submitted,
      },
    ]),
    lastStep: toCountRows(lastStep, lastStepLabels),
    abandons: toCountRows(abandons, LEAD_STEP_LABELS, (key) => `Étape ${key}`),
    validationErrors: toCountRows(errors, ERROR_LABELS),
    byVariant: toCountRows(variants, VARIANT_LABELS),
    byUtmContent: toCountRows(utmContent, {}),
    byUtmSource: toCountRows(utmSource, {}),
    byUtmCampaign: toIntentRows(sessions, (s) =>
      s.utmCampaign ? { key: s.utmCampaign, label: s.utmCampaign } : undefined
    ),
    byUtmTerm: toIntentRows(sessions, (s) => {
      if (!s.utmTerm) return undefined;
      const key = keywordGroupKey(s.utmTerm);
      if (!key) return undefined;
      return { key, label: s.utmTerm };
    }),
    byWorkCategory: toIntentRows(sessions, (s) => {
      if (!s.workCategory) return undefined;
      return {
        key: s.workCategory,
        label: categoryIntentLabel(s.workCategory),
      };
    }),
    byDevice: toIntentRows(sessions, (s) =>
      s.device
        ? { key: s.device, label: DEVICE_LABELS[s.device] ?? s.device }
        : undefined
    ),
    byAdsMismatch: toIntentRows(sessions, (s) => {
      const chosen = s.workCategory;
      if (!chosen || chosen === "unknown") return undefined;
      const arrival = sessionArrivalCategory(s);
      if (arrival === chosen) return undefined;
      const from = arrival ?? "Sans métier précoche";
      return {
        key: `${arrival ?? "none"}→${chosen}`,
        label: `${from} → ${chosen}`,
      };
    }),
    stepTimes: toStepTimeRows(sessions),
    recent: sessions
      .slice()
      .sort((a, b) => b.lastAt - a.lastAt)
      .slice(0, 40)
      .map((s) => ({
        sessionShort: s.id.slice(-6),
        startedAt: new Date(s.firstAt).toISOString(),
        lastAt: new Date(s.lastAt).toISOString(),
        durationMs: Math.max(0, s.lastAt - s.firstAt),
        outcome: s.submitted
          ? "Envoyée"
          : s.abandoned
            ? "Abandonnée"
            : "En cours / quittée",
        lastLabel: s.submitted
          ? "Demande envoyée"
          : LEAD_STEP_LABELS[s.maxStepViewed] ?? "Ouverture",
        variant: s.variant,
        guestMode: s.guestMode,
        utmContent: s.utmContent,
        utmSource: s.utmSource,
        utmCampaign: s.utmCampaign,
        utmTerm: s.utmTerm,
        device: s.device,
        adsClick: s.adsClick,
        workCategory: s.workCategory,
        adsCategory: s.adsCategory,
        keywordCategory: sessionKeywordCategory(s),
        gaSent: s.gaSent,
        otherWork: draftBySession.get(s.id)?.otherWork,
        descriptionDraft: draftBySession.get(s.id)?.description,
        internal: s.internal,
        ip: s.ip ?? draftBySession.get(s.id)?.ip,
      })),
    savedTexts,
  };
}

function buildProSide(sessions: SessionAgg[]): FormFunnelSide {
  if (sessions.length === 0) return emptySide();

  const submitted = sessions.filter((s) => s.submitted).length;
  const lastStep = new Map<string, { sessions: Set<string>; events: number }>();
  const abandons = new Map<string, { sessions: Set<string>; events: number }>();
  const errors = new Map<string, { sessions: Set<string>; events: number }>();
  const utmSource = new Map<string, { sessions: Set<string>; events: number }>();

  for (const session of sessions) {
    const lastKey = session.submitted
      ? "submitted"
      : session.lastSection ?? "siret_verify";
    bumpCount(lastStep, lastKey, session.id);
    if (session.abandoned && !session.submitted) {
      bumpCount(abandons, session.abandonSection ?? "unknown", session.id);
    }
    for (const [code, count] of session.errorCounts) {
      const row = errors.get(code) ?? { sessions: new Set<string>(), events: 0 };
      row.sessions.add(session.id);
      row.events += count;
      errors.set(code, row);
    }
    if (session.utmSource) bumpCount(utmSource, session.utmSource, session.id);
  }

  const lastLabels: Record<string, string> = {
    ...PRO_SECTION_LABELS,
    submitted: "Inscription envoyée",
  };

  return {
    sessions: sessions.length,
    submitted,
    conversionPercent: percent(submitted, sessions.length),
    funnel: funnelSteps(sessions, [
      { id: "start", label: "Ouverture du formulaire", match: () => true },
      {
        id: "rcs_try",
        label: "Vérification RCS lancée",
        match: (s) => s.rcsAttempt,
      },
      {
        id: "rcs_ok",
        label: "SIRET validé",
        match: (s) => s.rcsSuccess,
      },
      {
        id: "identity",
        label: PRO_SECTION_LABELS.identity,
        match: (s) => s.sections.has("identity") || s.rcsSuccess,
      },
      {
        id: "trades",
        label: PRO_SECTION_LABELS.trades_groups,
        match: (s) => s.sections.has("trades_groups"),
      },
      {
        id: "docs",
        label: PRO_SECTION_LABELS.documents,
        match: (s) => s.sections.has("documents"),
      },
      {
        id: "password",
        label: PRO_SECTION_LABELS.password,
        match: (s) => s.sections.has("password"),
      },
      {
        id: "submit_try",
        label: "Clic sur envoyer",
        match: (s) => s.names.has(ANALYTICS_EVENT.PRO_FORM_SUBMIT_ATTEMPT),
      },
      {
        id: "submit",
        label: "Inscription envoyée",
        match: (s) => s.submitted,
      },
    ]),
    lastStep: toCountRows(lastStep, lastLabels),
    abandons: toCountRows(abandons, PRO_SECTION_LABELS, (key) => key),
    validationErrors: toCountRows(errors, ERROR_LABELS),
    byVariant: [],
    byUtmContent: [],
    byUtmSource: toCountRows(utmSource, {}),
    byUtmCampaign: toIntentRows(sessions, (s) =>
      s.utmCampaign ? { key: s.utmCampaign, label: s.utmCampaign } : undefined
    ),
    byUtmTerm: [],
    byWorkCategory: [],
    byDevice: toIntentRows(sessions, (s) =>
      s.device
        ? { key: s.device, label: DEVICE_LABELS[s.device] ?? s.device }
        : undefined
    ),
    byAdsMismatch: [],
    stepTimes: [],
    recent: sessions
      .slice()
      .sort((a, b) => b.lastAt - a.lastAt)
      .slice(0, 40)
      .map((s) => ({
        sessionShort: s.id.slice(-6),
        startedAt: new Date(s.firstAt).toISOString(),
        lastAt: new Date(s.lastAt).toISOString(),
        durationMs: Math.max(0, s.lastAt - s.firstAt),
        outcome: s.submitted
          ? "Envoyée"
          : s.abandoned
            ? "Abandonnée"
            : "En cours / quittée",
        lastLabel: s.submitted
          ? "Inscription envoyée"
          : PRO_SECTION_LABELS[s.lastSection ?? ""] ?? "Ouverture",
        utmSource: s.utmSource,
        utmCampaign: s.utmCampaign,
        utmTerm: s.utmTerm,
        device: s.device,
        adsClick: s.adsClick,
        gaSent: s.gaSent,
        internal: s.internal,
        ip: s.ip,
      })),
    savedTexts: [],
  };
}

function aggregateSessions(events: FormFunnelEvent[]): SessionAgg[] {
  const byId = new Map<string, SessionAgg>();

  for (const event of events) {
    const form = formNameFromAnalytics(event.name, event.params);
    const key = `${form}:${event.sessionId}`;
    let session = byId.get(key);
    const at = Date.parse(event.at);
    if (!Number.isFinite(at)) continue;

    if (!session) {
      session = {
        id: event.sessionId,
        form,
        firstAt: at,
        lastAt: at,
        names: new Set(),
        maxStepViewed: 0,
        completedSteps: new Set(),
        submitted: false,
        abandoned: false,
        sections: new Set(),
        rcsAttempt: false,
        rcsSuccess: false,
        gaSent: false,
        internal: false,
        errorCounts: new Map(),
        stepDurations: new Map(),
      };
      byId.set(key, session);
    }

    session.firstAt = Math.min(session.firstAt, at);
    if (at >= session.lastAt) {
      session.lastAt = at;
      session.lastEventName = event.name;
    }
    session.names.add(event.name);
    if (event.gaSent) session.gaSent = true;
    if (event.internal) session.internal = true;
    const eventIp = storedIp(event.ip);
    if (eventIp && (session.ipAt == null || at >= session.ipAt)) {
      session.ip = eventIp;
      session.ipAt = at;
    }

    const variant = asString(event.params.form_variant);
    if (variant) session.variant = variant;
    const guest = asBoolean(event.params.guest_mode);
    if (guest !== undefined) session.guestMode = guest;
    const utmContent = cleanTrackingParam(asString(event.params.utm_content));
    if (utmContent) session.utmContent = utmContent;
    const utmSource = cleanTrackingParam(asString(event.params.utm_source));
    if (utmSource) session.utmSource = utmSource;
    const utmTerm = cleanTrackingParam(asString(event.params.utm_term));
    if (utmTerm) session.utmTerm = utmTerm;
    const utmCampaign = cleanTrackingParam(asString(event.params.utm_campaign));
    if (utmCampaign) session.utmCampaign = utmCampaign;
    const workCategory = asString(event.params.work_category);
    if (workCategory) session.workCategory = workCategory;
    const adsCategory = asString(event.params.ads_category);
    if (adsCategory && !session.adsCategory) session.adsCategory = adsCategory;
    const device = asString(event.params.device);
    if (device === "mobile" || device === "tablet" || device === "desktop") {
      session.device = device;
    }
    if (asBoolean(event.params.ads_click) === true) session.adsClick = true;

    const durationMs = asNumber(event.params.time_on_step_ms);

    const stepIndex = asNumber(event.params.step_index);
    if (
      durationMs != null &&
      durationMs >= 0 &&
      stepIndex &&
      (event.name === ANALYTICS_EVENT.LEAD_FORM_STEP_COMPLETE ||
        event.name === ANALYTICS_EVENT.LEAD_FORM_ABANDON)
    ) {
      session.stepDurations.set(stepIndex, durationMs);
    }
    if (
      event.name === ANALYTICS_EVENT.LEAD_FORM_STEP_VIEW &&
      stepIndex &&
      stepIndex > session.maxStepViewed
    ) {
      session.maxStepViewed = stepIndex;
    }
    if (
      event.name === ANALYTICS_EVENT.LEAD_FORM_START &&
      session.maxStepViewed < 1
    ) {
      session.maxStepViewed = 1;
    }
    if (
      event.name === ANALYTICS_EVENT.LEAD_FORM_STEP_COMPLETE &&
      stepIndex
    ) {
      session.completedSteps.add(stepIndex);
    }

    if (event.name === ANALYTICS_EVENT.SUBMIT_LEAD_FORM) {
      session.submitted = true;
    }
    if (event.name === ANALYTICS_EVENT.PRO_FORM_SUBMIT_SUCCESS) {
      session.submitted = true;
    }
    if (event.name === ANALYTICS_EVENT.LEAD_FORM_ABANDON) {
      session.abandoned = true;
      session.abandonStep = stepIndex ?? session.maxStepViewed;
    }
    if (event.name === ANALYTICS_EVENT.PRO_FORM_ABANDON) {
      session.abandoned = true;
      session.abandonSection = asString(event.params.section_id);
    }
    if (event.name === ANALYTICS_EVENT.PRO_FORM_RCS_VERIFY_ATTEMPT) {
      session.rcsAttempt = true;
    }
    if (event.name === ANALYTICS_EVENT.PRO_FORM_RCS_VERIFY_SUCCESS) {
      session.rcsSuccess = true;
    }

    const section = asString(event.params.section_id);
    if (section) {
      session.sections.add(section);
      session.lastSection = section;
    }

    if (
      event.name === ANALYTICS_EVENT.LEAD_FORM_VALIDATION_ERROR ||
      event.name === ANALYTICS_EVENT.PRO_FORM_VALIDATION_ERROR
    ) {
      const code = asString(event.params.error_code) ?? "unknown";
      session.errorCounts.set(code, (session.errorCounts.get(code) ?? 0) + 1);
    }
  }

  return [...byId.values()];
}

const STALE_ABANDON_MS = 15 * 60 * 1000;

function adminIpsFromEvents(events: FormFunnelEvent[]): Set<string> {
  const ips = new Set<string>();
  for (const event of events) {
    const ip = storedIp(event.ip);
    if (event.internal && ip) ips.add(ip);
  }
  return ips;
}

function markSessionsInternalByAdminIp(
  sessions: SessionAgg[],
  adminIps: Set<string>
) {
  if (adminIps.size === 0) return;
  for (const session of sessions) {
    if (!session.internal && session.ip && adminIps.has(session.ip)) {
      session.internal = true;
    }
  }
}

function finalizeAbandons(sessions: SessionAgg[], until: number) {
  for (const session of sessions) {
    if (session.submitted) {
      session.abandoned = false;
      continue;
    }
    const lastIsAbandon =
      session.lastEventName === ANALYTICS_EVENT.LEAD_FORM_ABANDON ||
      session.lastEventName === ANALYTICS_EVENT.PRO_FORM_ABANDON;
    const stale = until - session.lastAt >= STALE_ABANDON_MS;
    session.abandoned = lastIsAbandon || stale;
    if (!session.abandoned) continue;
    if (session.form === "work_request" && !session.abandonStep) {
      session.abandonStep = session.maxStepViewed || undefined;
    }
    if (session.form === "pro_registration" && !session.abandonSection) {
      session.abandonSection = session.lastSection;
    }
  }
}

export type FormFunnelRangeDays = 1 | 7 | 30 | 90;

export function parseFunnelRangeDays(raw: string | null): FormFunnelRangeDays {
  if (raw === "1" || raw === "7" || raw === "90") {
    return Number(raw) as FormFunnelRangeDays;
  }
  return 30;
}

export async function getFormFunnelReport(
  rangeDays: FormFunnelRangeDays,
  options?: { excludeInternal?: boolean }
): Promise<FormFunnelReport> {
  const db = await readDb();
  const until = Date.now();
  const since = until - rangeDays * 24 * 60 * 60 * 1000;
  const events = db.events.filter((event) => {
    const t = Date.parse(event.at);
    if (!Number.isFinite(t) || t < since || t > until) return false;
    if (isMetaCrawlerIp(event.ip)) return false;
    return true;
  });
  const sessions = aggregateSessions(events);
  finalizeAbandons(sessions, until);
  const adminIps = new Set<string>([
    ...adminIpsFromEvents(db.events),
    ...(await listKnownAdminIps()),
  ]);
  markSessionsInternalByAdminIp(sessions, adminIps);
  const leadAll = sessions.filter((s) => s.form === "work_request");
  const proAll = sessions.filter((s) => s.form === "pro_registration");
  const internalLeadSessions = leadAll.filter((s) => s.internal).length;
  const internalProSessions = proAll.filter((s) => s.internal).length;
  const hiddenInternalIds = new Set(
    [...leadAll, ...proAll]
      .filter((s) => s.internal)
      .map((s) => s.id)
  );
  const lead = options?.excludeInternal
    ? leadAll.filter((s) => !s.internal)
    : leadAll;
  const pro = options?.excludeInternal
    ? proAll.filter((s) => !s.internal)
    : proAll;
  const drafts = pruneDrafts(db.drafts).filter((draft) => {
    const t = Date.parse(draft.updatedAt);
    if (!Number.isFinite(t) || t < since || t > until) return false;
    if (options?.excludeInternal) {
      if (hiddenInternalIds.has(draft.sessionId)) return false;
      const draftIp = storedIp(draft.ip);
      if (draftIp && adminIps.has(draftIp)) return false;
    }
    if (isMetaCrawlerIp(draft.ip)) return false;
    return true;
  });

  return {
    rangeDays,
    since: new Date(since).toISOString(),
    until: new Date(until).toISOString(),
    totalEvents: events.length,
    internalLeadSessions,
    internalProSessions,
    lead: buildLeadSide(lead, drafts),
    pro: buildProSide(pro),
  };
}
