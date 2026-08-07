/** Codes NAF (INSEE) associés aux catégories de travaux Artipascher. */

import { normalizeNafCode } from "./naf-trade-groups";

export const CATEGORY_NAF_CODES: Record<string, string[]> = {
  Peinture: ["43.34Z"],
  Plomberie: ["43.22A", "43.22B"],
  Électricité: ["43.21A"],
  Maçonnerie: ["43.99C", "43.11Z"],
  Isolation: ["43.29A", "43.29B"],
  "Chauffage / Pompe à chaleur": ["43.22B", "43.21A"],
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

export function getNafCodesForCategory(category: string): string[] {
  return CATEGORY_NAF_CODES[category] ?? DEFAULT_CONSTRUCTION_NAF;
}

/** NAF stockés sur l’annonce, sinon dérivés de la catégorie. */
export function resolveWorkRequestNafCodes(request: {
  category: string;
  nafCodes?: string[];
}): string[] {
  if (request.nafCodes && request.nafCodes.length > 0) {
    return [
      ...new Set(
        request.nafCodes.map((c) => normalizeNafCode(c)).filter(Boolean)
      ),
    ];
  }
  return getNafCodesForCategory(request.category).map(normalizeNafCode);
}
