/** Catégories de travaux proposées aux particuliers (demande de prix / enchères). */
export const WORK_CATEGORIES = [
  "Peinture",
  "Plomberie",
  "Électricité",
  "Maçonnerie",
  "Isolation",
  "Chauffage / Pompe à chaleur",
  "Rénovation énergétique",
  "Rénovation complète",
  "Menuiserie (fenêtres, portes, volets)",
  "Toiture / Couverture",
  "Carrelage / Revêtements de sol",
  "Placo / Cloisons",
  "Extérieur / Aménagement paysager",
  "Terrassement",
  "Serrurerie",
  "Nettoyage / Multi-services",
] as const;

export type WorkCategory = (typeof WORK_CATEGORIES)[number];

/** Correspondance enchères démo (TradeCategory) → catégorie demande particulier. */
export const TRADE_CATEGORY_TO_WORK: Record<string, WorkCategory | undefined> = {
  maconnerie: "Maçonnerie",
  menuiserie: "Menuiserie (fenêtres, portes, volets)",
  plaquiste: "Placo / Cloisons",
  carrelage: "Carrelage / Revêtements de sol",
  electricite: "Électricité",
  peinture: "Peinture",
  plomberie: "Plomberie",
  chauffage: "Chauffage / Pompe à chaleur",
  couverture: "Toiture / Couverture",
};

export function isWorkCategory(value: string): value is WorkCategory {
  return (WORK_CATEGORIES as readonly string[]).includes(value);
}
