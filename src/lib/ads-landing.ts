import { cleanTrackingParam } from "@/lib/utm";
import { WORK_REQUEST_FORM_PATH } from "@/lib/work-request-form-path";

const STORAGE_KEY = "nap_ads_landing";

/** Params pub à garder de l’accueil jusqu’au formulaire. */
export const ADS_LANDING_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "category",
  "keyword",
  "kwd",
  "gclid",
  "gbraid",
  "wbraid",
] as const;

function firstParam(
  value: string | string[] | null | undefined
): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return cleanTrackingParam(typeof raw === "string" ? raw : undefined);
}

export function collectAdsLandingParams(
  get: (key: string) => string | string[] | null | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ADS_LANDING_KEYS) {
    const value = firstParam(get(key));
    if (value) out[key] = value;
  }
  return out;
}

export function collectAdsLandingFromSearchParams(
  params: Record<string, string | string[] | undefined>
): Record<string, string> {
  return collectAdsLandingParams((key) => params[key]);
}

export function workRequestHrefFromLanding(
  landing: Record<string, string>,
  extra?: { category?: string }
): string {
  const merged = { ...landing };
  if (extra?.category) merged.category = extra.category;
  const qs = new URLSearchParams();
  for (const key of ADS_LANDING_KEYS) {
    const value = cleanTrackingParam(merged[key]);
    if (value) qs.set(key, value);
  }
  const suffix = qs.toString();
  return suffix
    ? `${WORK_REQUEST_FORM_PATH}?${suffix}`
    : WORK_REQUEST_FORM_PATH;
}

export function workRequestHrefFromNextParams(
  params: Record<string, string | string[] | undefined>,
  extra?: { category?: string }
): string {
  return workRequestHrefFromLanding(
    collectAdsLandingFromSearchParams(params),
    extra
  );
}

export function persistAdsLandingFromSearch(search: string): void {
  if (typeof window === "undefined") return;
  try {
    const incoming = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
    const collected = collectAdsLandingParams((key) => incoming.get(key));
    if (Object.keys(collected).length === 0) return;
    const previous = readPersistedAdsLanding();
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...previous, ...collected })
    );
  } catch {
    // ignore
  }
}

export function readPersistedAdsLanding(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return collectAdsLandingParams(
      (key) => (parsed as Record<string, unknown>)[key] as string | undefined
    );
  } catch {
    return {};
  }
}
