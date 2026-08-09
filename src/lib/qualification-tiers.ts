export type QualificationLevel = 0 | 1 | 2 | 3;
/** Niveaux actifs (legacy 2/3 encore acceptés en base, affichés comme certifié). */
export type ActiveQualificationLevel = Exclude<QualificationLevel, 0>;

export interface QualificationDocument {
  id: string;
  label: string;
  help: string;
}

export interface QualificationTier {
  level: QualificationLevel;
  badge: string;
  title: string;
  summary: string;
  documents: QualificationDocument[];
}

export const QUALIFICATION_TIERS: QualificationTier[] = [
  {
    level: 0,
    badge: "Non certifié",
    title: "Non certifié",
    summary:
      "Certification retirée (fraude ou non-conformité). Compte refusé, plus d'accès aux offres ni aux clients.",
    documents: [],
  },
  {
    level: 1,
    badge: "Certifié",
    title: "Documents vérifiés",
    summary: "Documents de base vérifiés pour les travaux courants.",
    documents: [
      {
        id: "rcs",
        label: "SIREN / RNE vérifié en direct",
        help: "Contrôle automatique au registre national des entreprises lors de l'inscription (SIRET actif, entreprise immatriculée).",
      },
      {
        id: "rc",
        label: "Assurance responsabilité civile pro",
        help: "Couvre les dommages causés pendant le chantier (dégâts des eaux, casse…). Indispensable avant d'ouvrir votre porte.",
      },
      {
        id: "decennale",
        label: "Assurance décennale",
        help: "Obligatoire pour les travaux structurels (toiture, murs, étanchéité…). Vous êtes protégé 10 ans en cas de malfaçon grave.",
      },
      {
        id: "nord",
        label: "Établissement actif en Nord (59) ou Pas-de-Calais (62)",
        help: "Artipascher ne met en relation qu'avec des entreprises locales. Réactivité, connaissance du terrain et SAV plus simple.",
      },
    ],
  },
];

/** @deprecated Plus de paliers par catégorie — toujours le niveau certifié. */
export const LEVEL_2_CATEGORIES = [] as const;

export function getRecommendedLevelForCategory(
  _category: string
): ActiveQualificationLevel {
  return 1;
}

/** @deprecated Utiliser getRecommendedLevelForCategory */
export const getMinimumLevelForCategory = getRecommendedLevelForCategory;

export function getQualificationTier(level: QualificationLevel = 1) {
  if (level === 0) {
    return QUALIFICATION_TIERS.find((t) => t.level === 0)!;
  }
  return QUALIFICATION_TIERS.find((t) => t.level === 1)!;
}

export function isActiveQualificationLevel(
  level: number
): level is ActiveQualificationLevel {
  return level === 1 || level === 2 || level === 3;
}
