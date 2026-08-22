import type { ProSession } from "./pro-auth";

export const TEST_ACCOUNT_EMAIL_SUFFIX = "@test.nord-artisan-pro.com";

export function isTestAccountEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(TEST_ACCOUNT_EMAIL_SUFFIX);
}

/** Retire le préfixe [TEST] des textes affichés — le bandeau « Démo » suffit. */
export function stripTestLabel(text: string): string {
  return text.replace(/^\s*\[TEST\]\s*/i, "").trim();
}

/** Bandeau démo visible pour les comptes test (et admin en impersonation), masqué aux artisans réels. */
export function shouldShowDemoBannerForProSession(session: ProSession): boolean {
  if (session.impersonatedByAdmin) return true;
  return isTestAccountEmail(session.email);
}
