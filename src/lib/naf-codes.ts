/** Codes NAF (INSEE) associés aux catégories de travaux Artipascher. */

export const CATEGORY_NAF_CODES: Record<string, string[]> = {
  Peinture: ["43.34Z"],
  Plomberie: ["43.22A", "43.22B"],
  Électricité: ["43.21A"],
  Maçonnerie: ["43.99C", "43.11Z"],
  Isolation: ["43.29A", "43.29B"],
  "Chauffage / Pompe à chaleur": ["43.22B", "43.21A"],
  "Rénovation énergétique": ["43.21A", "43.29A", "43.34Z"],
  "Rénovation complète": ["43.99C", "41.20A", "43.34Z"],
};

/** Section NAF F = Construction (fallback large). */
export const DEFAULT_CONSTRUCTION_NAF = ["43.99C"];

export function getNafCodesForCategory(category: string): string[] {
  return CATEGORY_NAF_CODES[category] ?? DEFAULT_CONSTRUCTION_NAF;
}
