import type { ProSession } from "./pro-auth";
import { getProSession } from "./pro-auth";

export const TEST_ACCOUNT_EMAIL_SUFFIX = "@test.nord-artisan-pro.com";

export function isTestAccountEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(TEST_ACCOUNT_EMAIL_SUFFIX);
}

/** Bandeau démo visible pour les comptes test (et admin en impersonation), masqué aux artisans réels. */
export function shouldShowDemoBannerForProSession(session: ProSession): boolean {
  if (session.impersonatedByAdmin) return true;
  return isTestAccountEmail(session.email);
}

/**
 * Visibilité du bandeau sur le site public : masqué uniquement si un artisan réel est connecté.
 * Les visiteurs, particuliers et comptes test pro voient le bandeau sur les enchères de démo.
 */
export async function shouldShowDemoBanner(): Promise<boolean> {
  const proSession = await getProSession();
  if (!proSession) return true;
  return shouldShowDemoBannerForProSession(proSession);
}
