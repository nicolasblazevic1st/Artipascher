/**
 * Consent-aware GA4 events. No-ops when gtag is absent (consent refused / SSR).
 * Never put PII in params (name, email, phone, address, SIRET, free text).
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

export type ProRcsFailureReason = "invalid" | "network";

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

export function compactAnalyticsParams(
  params?: AnalyticsParams
): Record<string, GtagParamValue> | undefined {
  if (!params) return undefined;
  const cleaned: Record<string, GtagParamValue> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) cleaned[key] = value;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export function trackEvent(name: string, params?: AnalyticsParams): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  try {
    const cleaned = compactAnalyticsParams(params);
    if (cleaned) {
      window.gtag("event", name, cleaned);
    } else {
      window.gtag("event", name);
    }
  } catch {
    // Never break form UX (ad blockers, consent, network).
  }
}

export function trackLeadFormConversion(): void {
  trackEvent(ANALYTICS_EVENT.SUBMIT_LEAD_FORM);
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
