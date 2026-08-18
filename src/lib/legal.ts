import { BRAND } from "./brand";

/**
 * Identité de l'éditeur — LCEN / mentions légales.
 * Adresse : à coller depuis l’avis de situation Sirene (siège).
 */
export const LEGAL_PUBLISHER = {
  /** Nom commercial / marque */
  brand: BRAND.name,
  /** Dénomination (EI = nom de l’entrepreneur) */
  legalName: "Nicolas BLAZEVIC",
  /** Forme juridique */
  legalForm: "Entrepreneur individuel",
  /** Capital social — N/A pour EI */
  shareCapital: "N/A",
  /** SIRET (SIREN 108 238 924 + NIC 00014) */
  siret: "108 238 924 00014",
  /** Immatriculation */
  rcs: "Immatriculé au Registre National des Entreprises (RNE) — SIREN 108 238 924",
  /** Siège */
  address: "26 rue de Santes, 59320 Haubourdin",
  /** Directeur / responsable de la publication */
  publicationDirector: "Nicolas BLAZEVIC",
  /** Contact */
  email: BRAND.emailContact,
  /** Site */
  siteUrl: BRAND.siteUrl,
  /**
   * Médiateur de la consommation (CGU).
   * Vérifier que l’adhésion FEVAD inclut bien le dispositif de médiation.
   */
  consumerMediator:
    "Médiateur de la consommation FEVAD — BP 20015, 75362 Paris Cedex 8 — https://www.mediateurfevad.fr",
  /** Date de dernière mise à jour des documents */
  lastUpdated: "18 août 2026",
  /** Version des documents */
  version: "1.6-brouillon",
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
