export const COOKIE_CONSENT_STORAGE_KEY = "nap_cookie_consent";
export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_CHANGE_EVENT = "nap:cookie-consent-change";
export const COOKIE_CONSENT_OPEN_EVENT = "nap:cookie-consent-open";

export type CookieConsentChoice = {
  version: number;
  necessary: true;
  analytics: boolean;
  updatedAt: string;
};

export function isCookieConsentChoice(
  value: unknown
): value is CookieConsentChoice {
  if (!value || typeof value !== "object") return false;
  const choice = value as Partial<CookieConsentChoice>;
  return (
    choice.version === COOKIE_CONSENT_VERSION &&
    choice.necessary === true &&
    typeof choice.analytics === "boolean" &&
    typeof choice.updatedAt === "string"
  );
}

export function readCookieConsent(): CookieConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCookieConsentChoice(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCookieConsent(
  analytics: boolean
): CookieConsentChoice {
  const choice: CookieConsentChoice = {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    analytics,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(
    COOKIE_CONSENT_STORAGE_KEY,
    JSON.stringify(choice)
  );
  window.dispatchEvent(
    new CustomEvent(COOKIE_CONSENT_CHANGE_EVENT, { detail: choice })
  );
  return choice;
}

export function openCookiePreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COOKIE_CONSENT_OPEN_EVENT));
}
