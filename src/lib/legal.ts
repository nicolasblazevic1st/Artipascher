/**
 * Identité de l'éditeur — à compléter avant mise en production « ouverte ».
 * Les mentions légales LCEN exigent ces informations exactes.
 */
export const LEGAL_PUBLISHER = {
  /** Nom commercial / marque */
  brand: "Artipascher",
  /** Dénomination sociale (ex. « Dupont Nicolas EI », « Artipascher SASU ») */
  legalName: "[À COMPLÉTER : dénomination sociale]",
  /** Forme juridique */
  legalForm: "[À COMPLÉTER : EI / EURL / SASU / SAS…]",
  /** Capital social (si société) — laisser « N/A » pour EI */
  shareCapital: "[À COMPLÉTER : capital social ou N/A]",
  /** SIRET */
  siret: "[À COMPLÉTER : SIRET]",
  /** RCS / greffe */
  rcs: "[À COMPLÉTER : RCS + ville, ou « non applicable » si EI]",
  /** Siège / adresse de l'éditeur */
  address: "[À COMPLÉTER : adresse complète]",
  /** Directeur / responsable de la publication */
  publicationDirector: "[À COMPLÉTER : prénom NOM]",
  /** Contact */
  email: "contact@artipascher.fr",
  /** Site */
  siteUrl: "https://artipascher.fr",
  /** Date de dernière mise à jour des documents */
  lastUpdated: "6 août 2026",
  /** Version des documents */
  version: "1.0-brouillon",
} as const;

/** Hébergeur (OVH) — données publiques usuelles */
export const LEGAL_HOST = {
  name: "OVH SAS",
  address: "2 rue Kellermann, 59100 Roubaix, France",
  siret: "424 761 419 00045",
  phone: "1007 (depuis la France)",
  website: "https://www.ovhcloud.com",
} as const;

export const LEGAL_DRAFT_NOTICE =
  "Document fourni à titre de brouillon opérationnel. À faire relire et adapter par un avocat avant ouverture commerciale complète du service.";
