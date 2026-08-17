import { NextResponse } from "next/server";

/**
 * Préouverture / version bêta.
 *
 * Règle simple (inversée) :
 * - bêta UNIQUEMENT sur le domaine de prod publique
 * - partout ailleurs (dev.*, localhost, IP, staging) → ouvert
 *
 * Pendant la transition de marque, artipascher.fr et nord-artisan-pro.com
 * sont tous deux traités comme prod.
 */

function envFlagFalse(value: string | undefined): boolean {
  if (value == null) return false;
  const v = value.trim().toLowerCase();
  return v === "false" || v === "0" || v === "off" || v === "no";
}

function envFlagTrue(value: string | undefined): boolean {
  if (value == null) return false;
  const v = value.trim().toLowerCase();
  return v === "true" || v === "1" || v === "on" || v === "yes";
}

/** Host de la requête (sans port). */
export function normalizeHost(host: string | null | undefined): string {
  if (!host) return "";
  return host.split(",")[0]?.trim().toLowerCase().split(":")[0] ?? "";
}

/** Domaines de production publique (marque actuelle + ancien domaine). */
export function isProductionPublicHost(
  host: string | null | undefined
): boolean {
  const h = normalizeHost(host);
  return (
    h === "nord-artisan-pro.com" ||
    h === "www.nord-artisan-pro.com" ||
    h === "artipascher.fr" ||
    h === "www.artipascher.fr"
  );
}

export function isDevStagingHost(host: string | null | undefined): boolean {
  const h = normalizeHost(host);
  return (
    h === "dev.nord-artisan-pro.com" ||
    h.endsWith(".dev.nord-artisan-pro.com") ||
    h === "dev.artipascher.fr" ||
    h.endsWith(".dev.artipascher.fr") ||
    h === "localhost" ||
    h === "127.0.0.1"
  );
}

export function isStagingSite(): boolean {
  if (envFlagTrue(process.env.ARTIPASCHER_STAGING)) return true;
  if (envFlagTrue(process.env.NEXT_PUBLIC_ARTIPASCHER_STAGING)) return true;
  if (process.env.PORT === "3001") return true;

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").toLowerCase();
  if (site.includes("dev.nord-artisan-pro.com")) return true;
  if (site.includes("dev.artipascher.fr")) return true;

  return false;
}

/**
 * Mode bêta pour une requête HTTP.
 * Sans host reconnu comme prod → jamais de bêta.
 */
export function isBetaModeForHost(host: string | null | undefined): boolean {
  // Staging / local / inconnu → ouvert
  if (!isProductionPublicHost(host)) return false;

  // Prod : bêta ON sauf désactivation explicite
  if (envFlagFalse(process.env.BETA_MODE)) return false;
  if (envFlagFalse(process.env.NEXT_PUBLIC_BETA_MODE)) return false;
  return true;
}

/** Raccourci API Route : lit le Host de la requête. */
export function isBetaModeFromRequest(request: {
  headers: { get(name: string): string | null };
}): boolean {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return isBetaModeForHost(host);
}

/**
 * Fallback sans host (build / scripts).
 * Staging → ouvert. Sinon suit NEXT_PUBLIC_BETA_MODE (défaut ON).
 */
export function isBetaMode(): boolean {
  if (envFlagFalse(process.env.BETA_MODE)) return false;
  if (envFlagTrue(process.env.ARTIPASCHER_STAGING)) return false;
  if (isStagingSite()) return false;
  if (envFlagFalse(process.env.NEXT_PUBLIC_BETA_MODE)) return false;
  return true;
}

export const BETA_CLOSED_MESSAGE =
  "Nord Artisan Pro est en phase de préouverture (version bêta). Les inscriptions, demandes de travaux et paiements ne sont pas encore ouverts au public.";

export function betaClosedJsonResponse() {
  return NextResponse.json(
    {
      error: BETA_CLOSED_MESSAGE,
      code: "BETA_CLOSED",
    },
    { status: 503 }
  );
}
