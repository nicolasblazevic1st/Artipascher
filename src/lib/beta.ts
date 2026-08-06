import { NextResponse } from "next/server";

/**
 * Préouverture / version bêta publique.
 * Activée par défaut. Désactiver avec NEXT_PUBLIC_BETA_MODE=false
 * (ex. en local pour tester les parcours complets).
 */
export function isBetaMode(): boolean {
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
