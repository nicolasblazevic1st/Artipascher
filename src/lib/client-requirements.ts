/**
 * Exigences client affichées sur une annonce (avant déblocage).
 */

import { parseMinGoogleRating } from "./google-rating";
import type { WorkRequest } from "./store-types";

export type ClientRequirementSource = Pick<
  WorkRequest,
  | "category"
  | "maxContactArtisans"
  | "minGoogleRating"
  | "requireActiveCompany"
  | "requireValidInsurances"
  | "requireRge"
>;

/** Liste courte des exigences visibles pour les artisans. */
export function listVisibleClientRequirements(
  request: ClientRequirementSource
): string[] {
  const items: string[] = [];

  if (request.category?.trim()) {
    items.push(`Métier : ${request.category.trim()}`);
  }

  if (
    typeof request.maxContactArtisans === "number" &&
    request.maxContactArtisans >= 1 &&
    request.maxContactArtisans <= 5
  ) {
    items.push(
      request.maxContactArtisans === 1
        ? "1 artisan maximum pour ce chantier"
        : `Jusqu’à ${request.maxContactArtisans} artisans pour ce chantier`
    );
  }

  if (request.requireActiveCompany !== false) {
    items.push("Entreprise active (pas fermée)");
  }

  items.push(
    "Artisans sous procédure administrative non acceptés"
  );

  if (request.requireValidInsurances !== false) {
    items.push("RC professionnelle et décennale validées");
  }

  if (request.requireRge === true) {
    items.push("Artisan RGE (annuaire ADEME)");
  }

  const minRating = parseMinGoogleRating(request.minGoogleRating);
  if (minRating != null) {
    items.push(
      `Note Google d’au moins ${minRating.toFixed(1).replace(".", ",")}/5`
    );
  }

  return items;
}
