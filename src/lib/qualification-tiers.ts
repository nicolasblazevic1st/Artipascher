export type QualificationLevel = 1 | 2 | 3;

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
    level: 1,
    badge: "Certifié",
    title: "Niveau 1 — Essentiel",
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
  {
    level: 2,
    badge: "Qualifié",
    title: "Niveau 2 — Qualifié",
    summary: "Profil renforcé pour la rénovation énergétique et les chantiers techniques.",
    documents: [
      {
        id: "rge",
        label: "Label RGE (Reconnu Garant de l'Environnement)",
        help: "Certification officielle pour l'isolation, le chauffage, les fenêtres… Condition pour toucher MaPrimeRénov' et certaines aides publiques.",
      },
      {
        id: "qualibat",
        label: "Qualibat ou qualification métier reconnue",
        help: "Atteste les compétences réelles du corps de métier (peinture, électricité, gros œuvre…). Au-delà du simple SIRET.",
      },
      {
        id: "anciennete",
        label: "Ancienneté minimale (2 ans d'activité)",
        help: "Réduit le risque d'entreprises éphémères. Une structure installée depuis plusieurs années inspire plus confiance.",
      },
    ],
  },
  {
    level: 3,
    badge: "Premium",
    title: "Niveau 3 — Premium",
    summary: "Partenaires de confiance pour les gros chantiers et rénovations globales.",
    documents: [
      {
        id: "charte",
        label: "Charte qualité Artipascher signée",
        help: "L'entreprise s'engage sur les délais, la propreté du chantier, un devis détaillé et un interlocuteur identifié.",
      },
      {
        id: "references",
        label: "Références chantiers vérifiées dans le Nord",
        help: "Photos avant/après et chantiers réels dans votre région. Vous savez que d'autres clients ont déjà fait confiance.",
      },
      {
        id: "entretien",
        label: "Entretien de validation avec notre équipe",
        help: "Contrôle humain complémentaire : sérieux, capacité à absorber votre projet, adéquation budget / prestation.",
      },
    ],
  },
];

/** Travaux pour lesquels un niveau 2+ est particulièrement pertinent (informatif). */
export const LEVEL_2_CATEGORIES = [
  "Rénovation énergétique",
  "Isolation",
  "Chauffage / Pompe à chaleur",
  "Menuiserie (fenêtres, portes, volets)",
] as const;

export function getRecommendedLevelForCategory(category: string): QualificationLevel {
  if (category === "Rénovation complète") return 3;
  if (
    category === "Rénovation énergétique" ||
    category === "Isolation" ||
    category === "Chauffage / Pompe à chaleur" ||
    category === "Menuiserie (fenêtres, portes, volets)"
  ) {
    return 2;
  }
  return 1;
}

/** @deprecated Utiliser getRecommendedLevelForCategory */
export const getMinimumLevelForCategory = getRecommendedLevelForCategory;

export function getQualificationTier(level: QualificationLevel = 1) {
  return QUALIFICATION_TIERS.find((t) => t.level === level) ?? QUALIFICATION_TIERS[0];
}
