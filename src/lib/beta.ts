import { NextResponse } from "next/server";

/**
 * Préouverture / version bêta publique (prod).
 * Désactivée sur dev.artipascher.fr et si NEXT_PUBLIC_BETA_MODE=false.
 */
export function isStagingSite(): boolean {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").toLowerCase();
  return site.includes("dev.artipascher.fr");
}

export function isBetaMode(): boolean {
  if (isStagingSite()) return false;
  return process.env.NEXT_PUBLIC_BETA_MODE !== "false";
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
