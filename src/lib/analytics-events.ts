/**
 * Consent-aware GA4 events + first-party form funnel (admin).
 * GA no-ops when gtag is absent (consent refused / SSR).
 * First-party ingest always runs (no PII: no name, email, phone, address, SIRET, free text).
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type GtagParamValue = string | number | boolean;
export type AnalyticsParams = Record<string, GtagParamValue | undefined>;

export const ANALYTICS_EVENT = {
  LEAD_FORM_START: "lead_form_start",
  LEAD_FORM_STEP_VIEW: "lead_form_step_view",
  LEAD_FORM_STEP_COMPLETE: "lead_form_step_complete",
  LEAD_FORM_STEP_BACK: "lead_form_step_back",
  LEAD_FORM_VALIDATION_ERROR: "lead_form_validation_error",
  LEAD_FORM_SUBMIT_ATTEMPT: "lead_form_submit_attempt",
  LEAD_FORM_OTP_SENT: "lead_form_otp_sent",
  LEAD_FORM_OTP_VERIFIED: "lead_form_otp_verified",
  LEAD_FORM_ABANDON: "lead_form_abandon",
  SUBMIT_LEAD_FORM: "manual_event_SUBMIT_LEAD_FORM",
  PRO_FORM_START: "pro_form_start",
  PRO_FORM_RCS_VERIFY_ATTEMPT: "pro_form_rcs_verify_attempt",
  PRO_FORM_RCS_VERIFY_SUCCESS: "pro_form_rcs_verify_success",
  PRO_FORM_RCS_VERIFY_FAILURE: "pro_form_rcs_verify_failure",
  PRO_FORM_SECTION_VIEW: "pro_form_section_view",
  PRO_FORM_VALIDATION_ERROR: "pro_form_validation_error",
  PRO_FORM_SUBMIT_ATTEMPT: "pro_form_submit_attempt",
  PRO_FORM_SUBMIT_SUCCESS: "pro_form_submit_success",
  PRO_FORM_ABANDON: "pro_form_abandon",
} as const;

export type LeadFormStepId = "travaux" | "bien" | "projet" | "contact";
export type FormStepId = LeadFormStepId;
export type LeadFormStepIndex = 1 | 2 | 3 | 4;
export type WorkRequestFormVariant = "default" | "general";

export type ProFormSectionId =
  | "siret_verify"
  | "identity"
  | "trades_groups"
  | "trades_qualibat"
  | "documents"
  | "password"
  | "submit";

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENT)[keyof typeof ANALYTICS_EVENT];

export type ProRcsFailureReason = "invalid" | "network";

export const ANALYTICS_EVENT_NAMES = new Set<string>(
  Object.values(ANALYTICS_EVENT)
);

export const ANALYTICS_PARAM_KEYS = new Set([
  "form_name",
  "form_variant",
  "guest_mode",
  "step_id",
  "step_index",
  "from_step",
  "to_step",
  "error_code",
  "time_on_step_ms",
  "section_id",
  "fields_enabled",
  "reason",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
]);

const FUNNEL_SESSION_PREFIX = "nap_funnel_sid:";
const FUNNEL_UTM_KEY = "nap_funnel_utm";
const FUNNEL_INGEST_PATH = "/api/analytics/events";
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

const LEAD_FORM_STEP_IDS: Record<LeadFormStepIndex, LeadFormStepId> = {
  1: "travaux",
  2: "bien",
  3: "projet",
  4: "contact",
};

const PRO_FORM_SECTION_IDS: readonly ProFormSectionId[] = [
  "siret_verify",
  "identity",
  "trades_groups",
  "trades_qualibat",
  "documents",
  "password",
  "submit",
];

export function leadFormStepId(step: LeadFormStepIndex): LeadFormStepId {
  return LEAD_FORM_STEP_IDS[step];
}

export function isProFormSectionId(value: string): value is ProFormSectionId {
  return (PRO_FORM_SECTION_IDS as readonly string[]).includes(value);
}

export function isAnalyticsEventName(value: string): value is AnalyticsEventName {
  return ANALYTICS_EVENT_NAMES.has(value);
}

export function sanitizeAnalyticsParams(
  params?: AnalyticsParams | Record<string, unknown>
): Record<string, GtagParamValue> {
  if (!params) return {};
  const cleaned: Record<string, GtagParamValue> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!ANALYTICS_PARAM_KEYS.has(key) || value === undefined || value === null) {
      continue;
    }
    if (typeof value === "boolean") {
      cleaned[key] = value;
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      cleaned[key] = value;
      continue;
    }
    if (typeof value === "string") {
      const trimmed = value.trim().slice(0, 120);
      if (trimmed) cleaned[key] = trimmed;
    }
  }
  return cleaned;
}

export function compactAnalyticsParams(
  params?: AnalyticsParams
): Record<string, GtagParamValue> | undefined {
  const cleaned = sanitizeAnalyticsParams(params);
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export function formNameFromAnalytics(
  eventName: string,
  params?: AnalyticsParams
): "work_request" | "pro_registration" {
  const explicit = params?.form_name;
  if (explicit === "pro_registration") return "pro_registration";
  if (explicit === "work_request") return "work_request";
  if (eventName.startsWith("pro_form_")) return "pro_registration";
  return "work_request";
}

function getOrCreateFunnelSessionId(formName: string): string {
  const key = `${FUNNEL_SESSION_PREFIX}${formName}`;
  try {
    const existing = sessionStorage.getItem(key);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) return existing;
    const id =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

function readCachedUtm(): Record<string, string> {
  try {
    const cached = sessionStorage.getItem(FUNNEL_UTM_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as unknown;
      if (parsed && typeof parsed === "object") {
        return sanitizeAnalyticsParams(parsed as Record<string, unknown>) as Record<
          string,
          string
        >;
      }
    }
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      const value = params.get(key)?.trim().slice(0, 120);
      if (value) utm[key] = value;
    }
    sessionStorage.setItem(FUNNEL_UTM_KEY, JSON.stringify(utm));
    return utm;
  } catch {
    return {};
  }
}

function ingestFirstPartyEvent(
  name: string,
  params?: Record<string, GtagParamValue>
): void {
  if (typeof window === "undefined") return;
  const formName = formNameFromAnalytics(name, params);
  const payload = JSON.stringify({
    sessionId: getOrCreateFunnelSessionId(formName),
    name,
    params: { ...readCachedUtm(), ...params, form_name: formName },
    gaSent: typeof window.gtag === "function",
  });
  try {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon(FUNNEL_INGEST_PATH, blob)) return;
  } catch {
    // fall through to fetch
  }
  void fetch(FUNNEL_INGEST_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

export function trackEvent(name: string, params?: AnalyticsParams): void {
  if (typeof window === "undefined") return;
  const cleaned = compactAnalyticsParams(params);
  try {
    ingestFirstPartyEvent(name, cleaned);
  } catch {
    // Never break form UX.
  }
  if (typeof window.gtag !== "function") return;
  try {
    if (cleaned) {
      window.gtag("event", name, cleaned);
    } else {
      window.gtag("event", name);
    }
  } catch {
    // Never break form UX (ad blockers, consent, network).
  }
}

export function trackLeadFormConversion(
  ctx?: { variant: WorkRequestFormVariant; guestMode: boolean }
): void {
  trackEvent(
    ANALYTICS_EVENT.SUBMIT_LEAD_FORM,
    ctx ? leadFormParams(ctx) : { form_name: "work_request" }
  );
}

export function leadFormParams(
  ctx: { variant: WorkRequestFormVariant; guestMode: boolean },
  extra?: AnalyticsParams
): AnalyticsParams {
  return {
    form_name: "work_request",
    form_variant: ctx.variant,
    guest_mode: ctx.guestMode,
    ...extra,
  };
}

export function proFormParams(extra?: AnalyticsParams): AnalyticsParams {
  return {
    form_name: "pro_registration",
    ...extra,
  };
}

/** Stable codes — never forward the user-facing message (may include input). */
export function leadFormNafErrorCode(message: string): string {
  if (message.startsWith("Catégorie de travaux invalide")) return "invalid_category";
  if (message.includes("plusieurs spécialités NAF")) return "naf_required";
  return "naf_invalid";
}

export function leadFormPricingErrorCode(message: string): string {
  if (message.includes("au moins")) return "other_work_too_short";
  if (message.includes("trop longue")) return "other_work_too_long";
  if (message.includes("Prestation sélectionnée invalide")) {
    return "work_option_invalid";
  }
  if (message.includes("spécialité NAF")) return "work_option_naf_mismatch";
  return "pricing_tier_required";
}

export function leadFormDescriptionErrorCode(message: string): string {
  return message.includes("obligatoire")
    ? "description_required"
    : "description_too_short";
}

export function leadFormPhotoErrorCode(message: string): string {
  if (message.startsWith("Maximum")) return "too_many_photos";
  if (message.includes("manquant")) return "photo_missing";
  if (message.includes("Format")) return "photo_format";
  if (message.includes("moins de")) return "photo_too_large";
  return "photos_invalid";
}
