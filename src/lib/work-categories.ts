import { cleanTrackingParam } from "@/lib/utm";

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

/** Inverse pour afficher les demandes store comme cartes enchères. */
export const WORK_TO_TRADE_CATEGORY: Record<string, string> = {
  Peinture: "peinture",
  Plomberie: "plomberie",
  Électricité: "electricite",
  Maçonnerie: "maconnerie",
  Isolation: "plaquiste",
  "Chauffage / Pompe à chaleur": "chauffage",
  "Rénovation énergétique": "chauffage",
  "Rénovation complète": "maconnerie",
  "Menuiserie (fenêtres, portes, volets)": "menuiserie",
  "Toiture / Couverture": "couverture",
  "Carrelage / Revêtements de sol": "carrelage",
  "Placo / Cloisons": "plaquiste",
  "Extérieur / Aménagement paysager": "maconnerie",
  Terrassement: "maconnerie",
  Serrurerie: "menuiserie",
  "Nettoyage / Multi-services": "peinture",
};

export function isWorkCategory(value: string): value is WorkCategory {
  return (WORK_CATEGORIES as readonly string[]).includes(value);
}

function foldAdsToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Slugs pubs (utm_content) + libellés URL → catégorie formulaire. */
const ADS_SLUG_TO_CATEGORY: Record<string, WorkCategory> = {
  peinture: "Peinture",
  peintre: "Peinture",
  plomberie: "Plomberie",
  plombier: "Plomberie",
  electricite: "Électricité",
  electricien: "Électricité",
  maconnerie: "Maçonnerie",
  macon: "Maçonnerie",
  isolation: "Isolation",
  chauffage: "Chauffage / Pompe à chaleur",
  chauffagiste: "Chauffage / Pompe à chaleur",
  pac: "Chauffage / Pompe à chaleur",
  menuiserie: "Menuiserie (fenêtres, portes, volets)",
  menuisier: "Menuiserie (fenêtres, portes, volets)",
  toiture: "Toiture / Couverture",
  couverture: "Toiture / Couverture",
  couvreur: "Toiture / Couverture",
  carrelage: "Carrelage / Revêtements de sol",
  carreleur: "Carrelage / Revêtements de sol",
  placo: "Placo / Cloisons",
  plaquiste: "Placo / Cloisons",
  paysager: "Extérieur / Aménagement paysager",
  paysagiste: "Extérieur / Aménagement paysager",
  jardin: "Extérieur / Aménagement paysager",
  terrassement: "Terrassement",
  terrassier: "Terrassement",
  serrurerie: "Serrurerie",
  serrurier: "Serrurerie",
  nettoyage: "Nettoyage / Multi-services",
};

const SEARCH_PHRASES: Array<{ needle: string; category: WorkCategory }> = [
  { needle: "pompe a chaleur", category: "Chauffage / Pompe à chaleur" },
  { needle: "renovation energetique", category: "Rénovation énergétique" },
  { needle: "renovation complete", category: "Rénovation complète" },
  { needle: "revetement de sol", category: "Carrelage / Revêtements de sol" },
  { needle: "amenagement paysager", category: "Extérieur / Aménagement paysager" },
  { needle: "etancheite", category: "Toiture / Couverture" },
  { needle: "etancheur", category: "Toiture / Couverture" },
  { needle: "gouttiere", category: "Toiture / Couverture" },
  { needle: "zinguerie", category: "Toiture / Couverture" },
  { needle: "zingueur", category: "Toiture / Couverture" },
  { needle: "demoussage", category: "Toiture / Couverture" },
  { needle: "repeindre", category: "Peinture" },
  { needle: "peindre", category: "Peinture" },
  { needle: "vitrier", category: "Peinture" },
  { needle: "double vitrage", category: "Peinture" },
  { needle: "ramonage", category: "Chauffage / Pompe à chaleur" },
  { needle: "ramoneur", category: "Chauffage / Pompe à chaleur" },
  { needle: "climatisation", category: "Chauffage / Pompe à chaleur" },
  { needle: "poele", category: "Chauffage / Pompe à chaleur" },
  { needle: "insert", category: "Chauffage / Pompe à chaleur" },
  { needle: "parquet", category: "Carrelage / Revêtements de sol" },
  { needle: "facade", category: "Maçonnerie" },
  { needle: "crepi", category: "Maçonnerie" },
  { needle: "enduit", category: "Maçonnerie" },
  { needle: "desamiantage", category: "Isolation" },
  { needle: "assainissement", category: "Plomberie" },
  { needle: "fosse septique", category: "Plomberie" },
  { needle: "piscine", category: "Extérieur / Aménagement paysager" },
  { needle: "cloture", category: "Extérieur / Aménagement paysager" },
  { needle: "portail", category: "Serrurerie" },
  { needle: "interphone", category: "Serrurerie" },
];

function matchCategoryToken(raw?: string | null): WorkCategory | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (isWorkCategory(trimmed)) return trimmed;
  const folded = foldAdsToken(trimmed);
  if (!folded) return undefined;
  if (ADS_SLUG_TO_CATEGORY[folded]) return ADS_SLUG_TO_CATEGORY[folded];
  const compact = folded.replace(/ /g, "");
  return ADS_SLUG_TO_CATEGORY[compact];
}

/** Texte libre (description, mot-clé Ads) → métier plateforme si un indice est clair. */
export function matchCategoryFromSearchText(
  raw?: string | null
): WorkCategory | undefined {
  if (!raw) return undefined;
  const folded = foldAdsToken(raw);
  if (!folded) return undefined;
  for (const { needle, category } of SEARCH_PHRASES) {
    if (folded.includes(needle)) return category;
  }
  const tokens = folded.split(" ");
  for (const token of tokens) {
    const hit = ADS_SLUG_TO_CATEGORY[token];
    if (hit) return hit;
  }
  return undefined;
}

export type AdsWorkQuery = {
  category?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  keyword?: string | null;
};

function firstParam(
  value: string | string[] | null | undefined
): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return cleanTrackingParam(typeof raw === "string" ? raw : undefined);
}

/** Query string Google Ads / landing → champs de matching. */
export function adsWorkQueryFromParams(params: {
  category?: string | string[];
  utm_content?: string | string[];
  utm_term?: string | string[];
  keyword?: string | string[];
}): AdsWorkQuery {
  return {
    category: firstParam(params.category),
    utmContent: firstParam(params.utm_content),
    utmTerm: firstParam(params.utm_term),
    keyword: firstParam(params.keyword),
  };
}

/** Catch-all admin / SMS quand le particulier ne sait pas le métier. */
export const GENERAL_WORK_CATEGORY: WorkCategory = "Rénovation complète";

/** Pubs / UTM / mot-clé Google → métier déjà coché sur le formulaire. */
export function resolveWorkCategoryFromAdsQuery(
  input: AdsWorkQuery
): WorkCategory | undefined {
  const fromSlug =
    matchCategoryToken(input.category) ?? matchCategoryToken(input.utmContent);
  if (fromSlug) return fromSlug;
  return (
    matchCategoryFromSearchText(input.keyword) ??
    matchCategoryFromSearchText(input.utmTerm) ??
    matchCategoryFromSearchText(input.category)
  );
}

function adsQueryBlob(input: AdsWorkQuery): string {
  return foldAdsToken(
    [input.keyword, input.utmTerm, input.utmContent, input.category]
      .filter(Boolean)
      .join(" ")
  );
}

/**
 * Recherche vague d’artisan / de travaux, sans métier dans la requête.
 * Ex. « trouver un artisan », « artisan pas de calais », « devis travaux ».
 */
export function isGenericWorkSearch(input: AdsWorkQuery): boolean {
  if (resolveWorkCategoryFromAdsQuery(input)) return false;
  const blob = adsQueryBlob(input);
  if (!blob) return false;
  const tokens = new Set(blob.split(" "));
  if (
    tokens.has("travaux") ||
    tokens.has("devis") ||
    tokens.has("renovation") ||
    tokens.has("renovations")
  ) {
    return true;
  }
  if (tokens.has("artisan") || tokens.has("artisans")) return true;
  return (
    blob.includes("mise en relation") ||
    blob.includes("entreprise batiment")
  );
}

export type AdsFormPrefill = {
  category?: WorkCategory;
  unknownTrade: boolean;
};

/**
 * Métier dans le mot-clé / UTM → catégorie précochée.
 * Recherche vague d’artisan → « Je ne sais pas / plusieurs métiers ».
 */
export function resolveAdsFormPrefill(input: AdsWorkQuery): AdsFormPrefill {
  const category = resolveWorkCategoryFromAdsQuery(input);
  if (category) return { category, unknownTrade: false };
  if (isGenericWorkSearch(input)) return { unknownTrade: true };
  return { unknownTrade: false };
}
