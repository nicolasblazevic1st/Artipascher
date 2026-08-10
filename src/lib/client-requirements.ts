/**
 * Exigences client affichées sur une annonce (avant déblocage).
 */

import { parseMinGoogleRating } from "./google-rating";
import type { WorkRequest } from "./store-types";

export type ClientRequirementSource = Pick<
  WorkRequest,
  | "category"
  | "preferEstablishedCompany"
  | "minGoogleRating"
  | "requireActiveCompany"
  | "requireValidInsurances"
>;

/** Liste courte des exigences visibles pour les artisans. */
export function listVisibleClientRequirements(
  request: ClientRequirementSource
): string[] {
  const items: string[] = [];

  if (request.category?.trim()) {
    items.push(`Métier : ${request.category.trim()}`);
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

  if (request.preferEstablishedCompany === true) {
    items.push("Entreprise créée il y a plus de 2 ans");
  } else if (request.preferEstablishedCompany === false) {
    items.push("Entreprise créée il y a moins de 2 ans");
  }

  const minRating = parseMinGoogleRating(request.minGoogleRating);
  if (minRating != null) {
    items.push(
      `Note Google d’au moins ${minRating.toFixed(1).replace(".", ",")}/5`
    );
  }

  return items;
}
