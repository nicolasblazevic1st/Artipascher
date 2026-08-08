import { NextResponse } from "next/server";

/**
 * Préouverture / version bêta publique (prod).
 *
 * Règle absolue : host `dev.artipascher.fr` → jamais en bêta.
 * Sinon : bêta ON par défaut, sauf BETA_MODE / NEXT_PUBLIC_BETA_MODE=false.
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

export function isDevStagingHost(host: string | null | undefined): boolean {
  const h = normalizeHost(host);
  return h === "dev.artipascher.fr" || h.endsWith(".dev.artipascher.fr");
}

export function isStagingSite(): boolean {
  if (envFlagTrue(process.env.ARTIPASCHER_STAGING)) return true;
  if (envFlagTrue(process.env.NEXT_PUBLIC_ARTIPASCHER_STAGING)) return true;
  if (process.env.PORT === "3001") return true;

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").toLowerCase();
  if (site.includes("dev.artipascher.fr")) return true;

  return false;
}

/**
 * Mode bêta pour une requête HTTP (host Nginx prioritaire).
 * À utiliser dans les API et composants serveur avec headers().
 */
export function isBetaModeForHost(host: string | null | undefined): boolean {
  if (isDevStagingHost(host)) return false;
  return isBetaMode();
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
 * Mode bêta (env / build). Sans host, le staging se détecte via
 * ARTIPASCHER_STAGING, PORT=3001 ou NEXT_PUBLIC_SITE_URL.
 */
export function isBetaMode(): boolean {
  if (envFlagFalse(process.env.BETA_MODE)) return false;
  if (envFlagTrue(process.env.ARTIPASCHER_STAGING)) return false;
  if (isStagingSite()) return false;

  if (envFlagFalse(process.env.NEXT_PUBLIC_BETA_MODE)) return false;

  // Prod par défaut : bêta ON (préouverture légale)
  return true;
}

export const BETA_CLOSED_MESSAGE =
  "Artipascher est en phase de préouverture (version bêta). Les inscriptions, demandes de travaux et paiements ne sont pas encore ouverts au public.";

export function betaClosedJsonResponse() {
  return NextResponse.json(
    {
      error: BETA_CLOSED_MESSAGE,
      code: "BETA_CLOSED",
    },
    { status: 503 }
  );
}
