import { NextResponse } from "next/server";

/**
 * Préouverture / version bêta publique (prod).
 * Désactivée sur staging (dev.artipascher.fr) et si BETA / NEXT_PUBLIC_BETA_MODE=false.
 *
 * Important Next.js : les NEXT_PUBLIC_* sont figés au *build*.
 * ARTIPASCHER_STAGING / BETA_MODE restent lisibles au *runtime* (PM2).
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

export function isStagingSite(): boolean {
  if (envFlagTrue(process.env.ARTIPASCHER_STAGING)) return true;
  if (envFlagTrue(process.env.NEXT_PUBLIC_ARTIPASCHER_STAGING)) return true;

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").toLowerCase();
  if (site.includes("dev.artipascher.fr")) return true;

  return false;
}

export function isBetaMode(): boolean {
  // Overrides runtime (serveur / PM2) — prioritaire
  if (envFlagFalse(process.env.BETA_MODE)) return false;
  if (envFlagTrue(process.env.ARTIPASCHER_STAGING)) return false;

  // Staging figé au build
  if (isStagingSite()) return false;

  // Prod / défaut : bêta ON sauf NEXT_PUBLIC_BETA_MODE=false
  if (envFlagFalse(process.env.NEXT_PUBLIC_BETA_MODE)) return false;
  if (envFlagFalse(process.env.BETA_MODE)) return false;

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
