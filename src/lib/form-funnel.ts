import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import {
  ANALYTICS_EVENT,
  formNameFromAnalytics,
  isAnalyticsEventName,
  sanitizeAnalyticsParams,
  type GtagParamValue,
} from "@/lib/analytics-events";

const DB_PATH = path.join(process.cwd(), "data", "form-funnel.json");
const MAX_EVENTS = 25_000;
const RETENTION_DAYS = 90;
const MAX_SESSION_ID_LEN = 64;

export type FormFunnelFormName = "work_request" | "pro_registration";

export interface FormFunnelEvent {
  id: string;
  at: string;
  sessionId: string;
  name: string;
  params: Record<string, GtagParamValue>;
  gaSent: boolean;
}

interface FormFunnelDb {
  events: FormFunnelEvent[];
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

export interface FunnelSessionRow {
  sessionShort: string;
  startedAt: string;
  lastAt: string;
  outcome: string;
  lastLabel: string;
  variant?: string;
  guestMode?: boolean;
  utmContent?: string;
  utmSource?: string;
  utmTerm?: string;
  gaSent: boolean;
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
  recent: FunnelSessionRow[];
}

export interface FormFunnelReport {
  rangeDays: number;
  since: string;
  until: string;
  totalEvents: number;
  lead: FormFunnelSide;
  pro: FormFunnelSide;
}

const EMPTY_DB: FormFunnelDb = { events: [] };

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

async function readDb(): Promise<FormFunnelDb> {
  await ensureDb();
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<FormFunnelDb>;
    return { events: Array.isArray(parsed.events) ? parsed.events : [] };
  } catch {
    return { events: [] };
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
    return Number.isFinite(t) && t >= cutoff;
  });
  if (kept.length > MAX_EVENTS) {
    return kept.slice(kept.length - MAX_EVENTS);
  }
  return kept;
}

export async function appendFormFunnelEvent(input: {
  sessionId: string;
  name: string;
  params?: Record<string, unknown>;
  gaSent?: boolean;
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

  const event: FormFunnelEvent = {
    id: randomBytes(8).toString("hex"),
    at: new Date().toISOString(),
    sessionId: input.sessionId,
    name: input.name,
    params,
    gaSent: input.gaSent === true,
  };

  await enqueueWrite(async () => {
    const db = await readDb();
    db.events = pruneEvents([...db.events, event]);
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
  lastSection?: string;
  sections: Set<string>;
  rcsAttempt: boolean;
  rcsSuccess: boolean;
  gaSent: boolean;
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
    recent: [],
  };
}

function buildLeadSide(sessions: SessionAgg[]): FormFunnelSide {
  if (sessions.length === 0) return emptySide();

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
    recent: sessions
      .slice()
      .sort((a, b) => b.lastAt - a.lastAt)
      .slice(0, 40)
      .map((s) => ({
        sessionShort: s.id.slice(-6),
        startedAt: new Date(s.firstAt).toISOString(),
        lastAt: new Date(s.lastAt).toISOString(),
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
        utmTerm: s.utmTerm,
        gaSent: s.gaSent,
      })),
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
    recent: sessions
      .slice()
      .sort((a, b) => b.lastAt - a.lastAt)
      .slice(0, 40)
      .map((s) => ({
        sessionShort: s.id.slice(-6),
        startedAt: new Date(s.firstAt).toISOString(),
        lastAt: new Date(s.lastAt).toISOString(),
        outcome: s.submitted
          ? "Envoyée"
          : s.abandoned
            ? "Abandonnée"
            : "En cours / quittée",
        lastLabel: s.submitted
          ? "Inscription envoyée"
          : PRO_SECTION_LABELS[s.lastSection ?? ""] ?? "Ouverture",
        utmSource: s.utmSource,
        utmTerm: s.utmTerm,
        gaSent: s.gaSent,
      })),
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
        errorCounts: new Map(),
      };
      byId.set(key, session);
    }

    session.firstAt = Math.min(session.firstAt, at);
    session.lastAt = Math.max(session.lastAt, at);
    session.names.add(event.name);
    if (event.gaSent) session.gaSent = true;

    const variant = asString(event.params.form_variant);
    if (variant) session.variant = variant;
    const guest = asBoolean(event.params.guest_mode);
    if (guest !== undefined) session.guestMode = guest;
    const utmContent = asString(event.params.utm_content);
    if (utmContent) session.utmContent = utmContent;
    const utmSource = asString(event.params.utm_source);
    if (utmSource) session.utmSource = utmSource;
    const utmTerm = asString(event.params.utm_term);
    if (utmTerm) session.utmTerm = utmTerm;

    const stepIndex = asNumber(event.params.step_index);
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

export function parseFunnelRangeDays(raw: string | null): 7 | 30 | 90 {
  if (raw === "7" || raw === "90") return Number(raw) as 7 | 90;
  return 30;
}

export async function getFormFunnelReport(
  rangeDays: 7 | 30 | 90
): Promise<FormFunnelReport> {
  const db = await readDb();
  const until = Date.now();
  const since = until - rangeDays * 24 * 60 * 60 * 1000;
  const events = db.events.filter((event) => {
    const t = Date.parse(event.at);
    return Number.isFinite(t) && t >= since && t <= until;
  });
  const sessions = aggregateSessions(events);
  const lead = sessions.filter((s) => s.form === "work_request");
  const pro = sessions.filter((s) => s.form === "pro_registration");

  return {
    rangeDays,
    since: new Date(since).toISOString(),
    until: new Date(until).toISOString(),
    totalEvents: events.length,
    lead: buildLeadSide(lead),
    pro: buildProSide(pro),
  };
}
