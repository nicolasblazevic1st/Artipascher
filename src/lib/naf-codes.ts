/** Codes NAF (INSEE) associés aux catégories de travaux Nord Artisan Pro. */

import { getNafLabel, normalizeNafCode } from "./naf-trade-groups";

export const CATEGORY_NAF_CODES: Record<string, string[]> = {
  Peinture: ["43.34Z"],
  Plomberie: ["43.22A", "43.22B"],
  Électricité: ["43.21A"],
  Maçonnerie: ["43.99C", "43.11Z"],
  Isolation: ["43.29A", "43.29B"],
  "Chauffage / Pompe à chaleur": ["43.22B"],
  "Rénovation énergétique": ["43.21A", "43.29A", "43.34Z"],
  "Rénovation complète": ["43.99C", "41.20A", "43.34Z"],
  "Menuiserie (fenêtres, portes, volets)": ["43.32A", "43.32B"],
  "Toiture / Couverture": ["43.91A", "43.91B"],
  "Carrelage / Revêtements de sol": ["43.33Z"],
  "Placo / Cloisons": ["43.31Z", "43.29B"],
  "Extérieur / Aménagement paysager": ["81.30Z", "43.99C"],
  Terrassement: ["43.12A", "43.12B"],
  Serrurerie: ["43.32B", "25.11Z"],
  "Nettoyage / Multi-services": ["81.21Z", "81.22Z", "81.29B"],
};

/** Section NAF F = Construction (fallback large). */
export const DEFAULT_CONSTRUCTION_NAF = ["43.99C"];

export interface CategoryNafOption {
  code: string;
  label: string;
}

/** Les 22 codes NAF uniques liés aux 16 métiers plateforme. */
export function listPlatformCategoryNafCodes(): string[] {
  return [
    ...new Set(
      Object.values(CATEGORY_NAF_CODES)
        .flat()
        .map((c) => normalizeNafCode(c))
        .filter(Boolean)
    ),
  ].sort();
}

export function getNafCodesForCategory(category: string): string[] {
  return (CATEGORY_NAF_CODES[category] ?? DEFAULT_CONSTRUCTION_NAF).map(
    normalizeNafCode
  );
}

/** Options NAF affichables pour un métier (code + libellé INSEE). */
export function getNafOptionsForCategory(category: string): CategoryNafOption[] {
  return getNafCodesForCategory(category).map((code) => ({
    code,
    label: getNafLabel(code),
  }));
}

/**
 * Valide la sélection NAF d'une demande.
 * Si le métier a plusieurs NAF : au moins un choix obligatoire, tous dans la liste.
 * Si un seul NAF : auto (sélection vide = ce code).
 */
export function validateWorkRequestNafSelection(
  category: string,
  selected: readonly string[] | undefined
): { ok: true; nafCodes: string[] } | { ok: false; error: string } {
  const allowed = getNafCodesForCategory(category);
  if (allowed.length === 0) {
    return { ok: false, error: "Catégorie de travaux invalide." };
  }

  const picked = [
    ...new Set(
      (selected ?? []).map((c) => normalizeNafCode(c)).filter(Boolean)
    ),
  ];

  if (allowed.length === 1) {
    return { ok: true, nafCodes: allowed };
  }

  if (picked.length === 0) {
    return {
      ok: false,
      error:
        "Ce type de travaux a plusieurs spécialités NAF : cochez au moins une activité.",
    };
  }

  const forbidden = picked.filter((c) => !allowed.includes(c));
  if (forbidden.length > 0) {
    return {
      ok: false,
      error: `Code(s) NAF non autorisé(s) pour « ${category} » : ${forbidden.join(", ")}.`,
    };
  }

  return { ok: true, nafCodes: picked };
}

/** NAF stockés sur l’annonce, sinon dérivés de la catégorie.
 *  Les codes hors liste actuelle de la catégorie sont ignorés (ex. ancien mapping). */
export function resolveWorkRequestNafCodes(request: {
  category: string;
  nafCodes?: string[];
}): string[] {
  const allowed = getNafCodesForCategory(request.category).map(normalizeNafCode);
  const allowedSet = new Set(allowed);

  if (request.nafCodes && request.nafCodes.length > 0) {
    const picked = [
      ...new Set(
        request.nafCodes
          .map((c) => normalizeNafCode(c))
          .filter((c) => Boolean(c) && allowedSet.has(c))
      ),
    ];
    if (picked.length > 0) return picked;
  }
  return allowed;
}
