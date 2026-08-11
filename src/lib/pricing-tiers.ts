/**
 * Tickets de chantier → prix de déblocage contact (crédits).
 * 1 crédit de référence = CREDIT_PRICE_EUR (20 €) ; le débit est proportionnel.
 */

import { CREDIT_PRICE_EUR } from "./store-types";

export const PRICING_TIER_IDS = ["bas", "moyen", "eleve", "premium"] as const;

export type PricingTierId = (typeof PRICING_TIER_IDS)[number];

export interface PricingTier {
  id: PricingTierId;
  label: string;
  /** Prix TTC de la mise en contact artisan. */
  unlockPriceEur: number;
  shortHelp: string;
}

export const PRICING_TIERS: readonly PricingTier[] = [
  {
    id: "bas",
    label: "Ticket bas",
    unlockPriceEur: 15,
    shortHelp: "Intervention courte, dépannage simple",
  },
  {
    id: "moyen",
    label: "Ticket moyen",
    unlockPriceEur: 17.5,
    shortHelp: "Réparation ou pose unitaire",
  },
  {
    id: "eleve",
    label: "Ticket élevé",
    unlockPriceEur: 20,
    shortHelp: "Rénovation partielle / technicité",
  },
  {
    id: "premium",
    label: "Ticket premium",
    unlockPriceEur: 25,
    shortHelp: "Urgence, structure ou chantier lourd",
  },
] as const;

/** Défaut = ancien tarif unique (20 €). */
export const DEFAULT_PRICING_TIER: PricingTierId = "eleve";

export function isPricingTierId(value: string): value is PricingTierId {
  return (PRICING_TIER_IDS as readonly string[]).includes(value);
}

export function getPricingTier(id: PricingTierId): PricingTier {
  const found = PRICING_TIERS.find((t) => t.id === id);
  if (!found) return PRICING_TIERS.find((t) => t.id === DEFAULT_PRICING_TIER)!;
  return found;
}

export function unlockPriceEurForTier(
  tier: PricingTierId | undefined | null
): number {
  return getPricingTier(tier ?? DEFAULT_PRICING_TIER).unlockPriceEur;
}

/** Crédits à débiter pour un prix € (ex. 17,5 € → 0,875 crédit si 1 crédit = 20 €). */
export function unlockCreditsForPriceEur(priceEur: number): number {
  if (!Number.isFinite(priceEur) || priceEur <= 0) {
    return unlockCreditsForPriceEur(unlockPriceEurForTier(DEFAULT_PRICING_TIER));
  }
  return Math.round((priceEur / CREDIT_PRICE_EUR) * 1000) / 1000;
}

export function unlockCreditsForTier(
  tier: PricingTierId | undefined | null
): number {
  return unlockCreditsForPriceEur(unlockPriceEurForTier(tier));
}

export function formatUnlockPriceEur(priceEur: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: priceEur % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(priceEur);
}

export interface NafWorkOption {
  id: string;
  nafCode: string;
  name: string;
  detail: string;
  tier: PricingTierId;
}

/** Prestations détaillées par code NAF (sélection client → ticket / prix unlock). */
export const NAF_WORK_OPTIONS: readonly NafWorkOption[] = [
  // 43.22A — Plomberie eau/gaz
  {
    id: "4322a-debouchage",
    nafCode: "43.22A",
    name: "Débouchage WC / lavabo / douche",
    detail: "Sans ouverture de réseau",
    tier: "bas",
  },
  {
    id: "4322a-robinet",
    nafCode: "43.22A",
    name: "Remplacement joint / flexible / robinet",
    detail: "Pièce unitaire, accès facile",
    tier: "bas",
  },
  {
    id: "4322a-hydrocurage",
    nafCode: "43.22A",
    name: "Débouchage caméra + hydrocurage",
    detail: "Inspection vidéo, curage HP",
    tier: "moyen",
  },
  {
    id: "4322a-wc",
    nafCode: "43.22A",
    name: "Remplacement WC complet",
    detail: "Dépose, pose, raccordements",
    tier: "moyen",
  },
  {
    id: "4322a-ballon",
    nafCode: "43.22A",
    name: "Remplacement ballon ECS",
    detail: "Pose + mise en service",
    tier: "moyen",
  },
  {
    id: "4322a-tuyauterie",
    nafCode: "43.22A",
    name: "Réfection tuyauterie (pièce)",
    detail: "Cuivre / PER / multicouche",
    tier: "eleve",
  },
  {
    id: "4322a-fuite",
    nafCode: "43.22A",
    name: "Recherche de fuite",
    detail: "Détection + rapport",
    tier: "eleve",
  },
  {
    id: "4322a-sdb",
    nafCode: "43.22A",
    name: "Rénovation plomberie salle de bain",
    detail: "Points d'eau, évacuations, sanitaires",
    tier: "premium",
  },
  {
    id: "4322a-urgence",
    nafCode: "43.22A",
    name: "Urgence fuite (soir / week-end / nuit)",
    detail: "Intervention hors horaires",
    tier: "premium",
  },

  // 43.22B — Thermique / clim
  {
    id: "4322b-purge",
    nafCode: "43.22B",
    name: "Purge radiateurs / contrôle pression",
    detail: "Entretien rapide",
    tier: "bas",
  },
  {
    id: "4322b-entretien",
    nafCode: "43.22B",
    name: "Entretien chaudière annuel",
    detail: "Contrôle + attestation",
    tier: "bas",
  },
  {
    id: "4322b-radiateur",
    nafCode: "43.22B",
    name: "Remplacement radiateur",
    detail: "1 unité, purge",
    tier: "moyen",
  },
  {
    id: "4322b-desembouage",
    nafCode: "43.22B",
    name: "Désembouage circuit chauffage",
    detail: "Pompe + rinçage",
    tier: "moyen",
  },
  {
    id: "4322b-chaudiere",
    nafCode: "43.22B",
    name: "Remplacement chaudière condensation",
    detail: "Pose + mise en service",
    tier: "eleve",
  },
  {
    id: "4322b-clim",
    nafCode: "43.22B",
    name: "Installation clim split / multi-split",
    detail: "Liaisons + mise en service",
    tier: "eleve",
  },
  {
    id: "4322b-pac",
    nafCode: "43.22B",
    name: "Installation pompe à chaleur",
    detail: "Air/eau ou air/air",
    tier: "premium",
  },
  {
    id: "4322b-urgence",
    nafCode: "43.22B",
    name: "Dépannage chaudière urgence",
    detail: "Hors service / hiver",
    tier: "premium",
  },

  // 43.21A — Électricité
  {
    id: "4321a-prise",
    nafCode: "43.21A",
    name: "Remplacement prise / interrupteur",
    detail: "Sans modification de circuit",
    tier: "bas",
  },
  {
    id: "4321a-point",
    nafCode: "43.21A",
    name: "Ajout point lumineux ou prise",
    detail: "Sur circuit existant",
    tier: "moyen",
  },
  {
    id: "4321a-panne",
    nafCode: "43.21A",
    name: "Dépannage panne / court-circuit",
    detail: "Diagnostic + réparation",
    tier: "moyen",
  },
  {
    id: "4321a-tableau",
    nafCode: "43.21A",
    name: "Remplacement tableau électrique",
    detail: "Logement, conformité",
    tier: "eleve",
  },
  {
    id: "4321a-borne",
    nafCode: "43.21A",
    name: "Installation borne IRVE",
    detail: "Wallbox + ligne dédiée",
    tier: "eleve",
  },
  {
    id: "4321a-reno",
    nafCode: "43.21A",
    name: "Rénovation électrique complète",
    detail: "Appartement / maison",
    tier: "premium",
  },

  // 43.34Z — Peinture
  {
    id: "4334z-retouche",
    nafCode: "43.34Z",
    name: "Retouche peinture localisée",
    detail: "Sans préparation lourde",
    tier: "bas",
  },
  {
    id: "4334z-piece",
    nafCode: "43.34Z",
    name: "Peinture 1 pièce",
    detail: "Murs + plafond",
    tier: "moyen",
  },
  {
    id: "4334z-appart",
    nafCode: "43.34Z",
    name: "Peinture appartement complet",
    detail: "Préparation + finition",
    tier: "eleve",
  },
  {
    id: "4334z-facade",
    nafCode: "43.34Z",
    name: "Peinture / ravalement façade",
    detail: "Accès + surface",
    tier: "premium",
  },

  // 43.99C — Maçonnerie
  {
    id: "4399c-joint",
    nafCode: "43.99C",
    name: "Reprise joint / petit rebouchage",
    detail: "Intervention localisée",
    tier: "bas",
  },
  {
    id: "4399c-ouverture",
    nafCode: "43.99C",
    name: "Ouverture non porteuse",
    detail: "Porte / passage",
    tier: "moyen",
  },
  {
    id: "4399c-dalle",
    nafCode: "43.99C",
    name: "Dalle béton / chape",
    detail: "Pièce",
    tier: "eleve",
  },
  {
    id: "4399c-porteur",
    nafCode: "43.99C",
    name: "Ouverture mur porteur",
    detail: "IPN / béton, étaiement",
    tier: "premium",
  },

  // 43.11Z — Démolition
  {
    id: "4311z-cloison",
    nafCode: "43.11Z",
    name: "Dépose cloison légère",
    detail: "Évacuation gravats",
    tier: "bas",
  },
  {
    id: "4311z-sdb",
    nafCode: "43.11Z",
    name: "Démolition SDB / cuisine",
    detail: "Second œuvre",
    tier: "moyen",
  },
  {
    id: "4311z-mur",
    nafCode: "43.11Z",
    name: "Démolition mur / plancher",
    detail: "Contrôlée",
    tier: "eleve",
  },
  {
    id: "4311z-curage",
    nafCode: "43.11Z",
    name: "Curage complet avant rénovation",
    detail: "Strip-out",
    tier: "premium",
  },

  // 43.29A — Isolation
  {
    id: "4329a-calorifuge",
    nafCode: "43.29A",
    name: "Calorifugeage tuyauteries",
    detail: "Points singuliers",
    tier: "bas",
  },
  {
    id: "4329a-combles",
    nafCode: "43.29A",
    name: "Isolation combles perdus",
    detail: "Soufflage",
    tier: "moyen",
  },
  {
    id: "4329a-iti",
    nafCode: "43.29A",
    name: "Isolation murs par l'intérieur",
    detail: "Doublage",
    tier: "eleve",
  },
  {
    id: "4329a-ite",
    nafCode: "43.29A",
    name: "ITE façade",
    detail: "Isolation par l'extérieur",
    tier: "premium",
  },

  // 43.29B
  {
    id: "4329b-joints",
    nafCode: "43.29B",
    name: "Calfeutrement fenêtres",
    detail: "Joints / mousses",
    tier: "bas",
  },
  {
    id: "4329b-coffre",
    nafCode: "43.29B",
    name: "Isolation coffre de volet",
    detail: "Pont thermique",
    tier: "moyen",
  },

  // 43.32A — Menuiserie bois/PVC
  {
    id: "4332a-reglage",
    nafCode: "43.32A",
    name: "Réglage porte / fenêtre",
    detail: "Frottement, joints",
    tier: "bas",
  },
  {
    id: "4332a-fenetre",
    nafCode: "43.32A",
    name: "Pose 1 fenêtre",
    detail: "Rénovation",
    tier: "moyen",
  },
  {
    id: "4332a-lot",
    nafCode: "43.32A",
    name: "Remplacement lot de fenêtres",
    detail: "Maison",
    tier: "eleve",
  },
  {
    id: "4332a-veranda",
    nafCode: "43.32A",
    name: "Véranda / extension menuisée",
    detail: "Sur-mesure",
    tier: "premium",
  },

  // 43.32B — Serrurerie
  {
    id: "4332b-cylindre",
    nafCode: "43.32B",
    name: "Remplacement cylindre / serrure",
    detail: "Pose standard",
    tier: "bas",
  },
  {
    id: "4332b-ouverture",
    nafCode: "43.32B",
    name: "Ouverture porte claquée",
    detail: "Sans destruction",
    tier: "moyen",
  },
  {
    id: "4332b-grille",
    nafCode: "43.32B",
    name: "Pose grille / portail métallique",
    detail: "Fixations, scellements",
    tier: "eleve",
  },
  {
    id: "4332b-blindee",
    nafCode: "43.32B",
    name: "Porte blindée complète",
    detail: "Dépose + pose",
    tier: "premium",
  },

  // 25.11Z
  {
    id: "2511z-soudure",
    nafCode: "25.11Z",
    name: "Réparation métallique soudée",
    detail: "Atelier ou site",
    tier: "moyen",
  },
  {
    id: "2511z-structure",
    nafCode: "25.11Z",
    name: "Structure métallique légère",
    detail: "Fabrication + pose",
    tier: "eleve",
  },
  {
    id: "2511z-charpente",
    nafCode: "25.11Z",
    name: "Ossature / charpente métallique",
    detail: "Levage, assemblage",
    tier: "premium",
  },

  // 43.91A — Charpente
  {
    id: "4391a-traitement",
    nafCode: "43.91A",
    name: "Traitement charpente",
    detail: "Insectes / champignons",
    tier: "moyen",
  },
  {
    id: "4391a-reprise",
    nafCode: "43.91A",
    name: "Reprise / renforcement ferme",
    detail: "Structure bois",
    tier: "eleve",
  },
  {
    id: "4391a-neuve",
    nafCode: "43.91A",
    name: "Charpente neuve / remplacement",
    detail: "Complet",
    tier: "premium",
  },

  // 43.91B — Couverture
  {
    id: "4391b-tuile",
    nafCode: "43.91B",
    name: "Remplacement tuiles localisées",
    detail: "Après fuite ponctuelle",
    tier: "bas",
  },
  {
    id: "4391b-gouttiere",
    nafCode: "43.91B",
    name: "Gouttière / zinguerie",
    detail: "Linéaire",
    tier: "moyen",
  },
  {
    id: "4391b-versant",
    nafCode: "43.91B",
    name: "Réfection partielle versant",
    detail: "Couverture",
    tier: "eleve",
  },
  {
    id: "4391b-complete",
    nafCode: "43.91B",
    name: "Réfection toiture complète",
    detail: "Couverture + zinguerie",
    tier: "premium",
  },
  {
    id: "4391b-bache",
    nafCode: "43.91B",
    name: "Urgence bâchage tempête",
    detail: "Sécurisation provisoire",
    tier: "premium",
  },

  // 43.33Z — Carrelage
  {
    id: "4333z-carreau",
    nafCode: "43.33Z",
    name: "Remplacement carreau cassé",
    detail: "Localisé",
    tier: "bas",
  },
  {
    id: "4333z-credence",
    nafCode: "43.33Z",
    name: "Pose faïence crédence",
    detail: "Cuisine",
    tier: "moyen",
  },
  {
    id: "4333z-sol",
    nafCode: "43.33Z",
    name: "Carrelage sol pièce",
    detail: "Chape saine",
    tier: "moyen",
  },
  {
    id: "4333z-sdb",
    nafCode: "43.33Z",
    name: "Carrelage salle de bain complète",
    detail: "Sol + murs + étanchéité",
    tier: "eleve",
  },
  {
    id: "4333z-complexe",
    nafCode: "43.33Z",
    name: "Grand format / pierre / mosaïque",
    detail: "Pose complexe",
    tier: "premium",
  },

  // 43.31Z — Plâtrerie
  {
    id: "4331z-trou",
    nafCode: "43.31Z",
    name: "Reprise trou / bande à joint",
    detail: "Localisé",
    tier: "bas",
  },
  {
    id: "4331z-cloison",
    nafCode: "43.31Z",
    name: "Création cloison placo",
    detail: "Pièce",
    tier: "moyen",
  },
  {
    id: "4331z-plafond",
    nafCode: "43.31Z",
    name: "Plafond suspendu",
    detail: "Ossature + plaques",
    tier: "eleve",
  },
  {
    id: "4331z-combles",
    nafCode: "43.31Z",
    name: "Aménagement combles (placo)",
    detail: "Cloisons + doublages",
    tier: "premium",
  },

  // 41.20A
  {
    id: "4120a-extension",
    nafCode: "41.20A",
    name: "Extension / agrandissement",
    detail: "Projet multi-lots",
    tier: "premium",
  },
  {
    id: "4120a-globale",
    nafCode: "41.20A",
    name: "Rénovation globale",
    detail: "Tous corps d'état",
    tier: "premium",
  },

  // 43.12A / 43.12B — Terrassement
  {
    id: "4312a-jardin",
    nafCode: "43.12A",
    name: "Nivellement / décaissement jardin",
    detail: "Mini-pelle",
    tier: "moyen",
  },
  {
    id: "4312a-tranchee",
    nafCode: "43.12A",
    name: "Tranchée réseaux",
    detail: "Eau, élec, drainage",
    tier: "moyen",
  },
  {
    id: "4312a-dalle",
    nafCode: "43.12A",
    name: "Préparation plateforme dalle",
    detail: "Compactage",
    tier: "eleve",
  },
  {
    id: "4312b-fondations",
    nafCode: "43.12B",
    name: "Terrassement fondations",
    detail: "Extension / maison",
    tier: "eleve",
  },
  {
    id: "4312b-masse",
    nafCode: "43.12B",
    name: "Terrassement grande masse",
    detail: "Volumes importants",
    tier: "premium",
  },

  // 81.30Z — Paysage
  {
    id: "8130z-tonte",
    nafCode: "81.30Z",
    name: "Tonte / entretien courant",
    detail: "Ponctuel ou contrat",
    tier: "bas",
  },
  {
    id: "8130z-haie",
    nafCode: "81.30Z",
    name: "Taille de haies",
    detail: "Élagage léger",
    tier: "bas",
  },
  {
    id: "8130z-allee",
    nafCode: "81.30Z",
    name: "Allée / terrasse extérieure",
    detail: "Dalles, graviers, bois",
    tier: "eleve",
  },
  {
    id: "8130z-jardin",
    nafCode: "81.30Z",
    name: "Aménagement jardin complet",
    detail: "Projet global",
    tier: "premium",
  },

  // Nettoyage
  {
    id: "8121z-menage",
    nafCode: "81.21Z",
    name: "Ménage / fin de location",
    detail: "Nettoyage courant",
    tier: "bas",
  },
  {
    id: "8121z-chantier",
    nafCode: "81.21Z",
    name: "Nettoyage fin de chantier",
    detail: "Poussière, vitres",
    tier: "moyen",
  },
  {
    id: "8122z-vitres",
    nafCode: "81.22Z",
    name: "Vitres en hauteur",
    detail: "Nacelle / accès",
    tier: "eleve",
  },
  {
    id: "8122z-sinistre",
    nafCode: "81.22Z",
    name: "Remise en état après sinistre",
    detail: "Hors reconstruction",
    tier: "eleve",
  },
  {
    id: "8129b-graffiti",
    nafCode: "81.29B",
    name: "Nettoyage graffiti",
    detail: "Traitement spécifique",
    tier: "moyen",
  },
];

export function getWorkOptionsForNafCodes(
  nafCodes: readonly string[]
): NafWorkOption[] {
  const set = new Set(
    nafCodes.map((c) => c.trim().toUpperCase()).filter(Boolean)
  );
  if (set.size === 0) return [];
  return NAF_WORK_OPTIONS.filter((o) => set.has(o.nafCode.toUpperCase()));
}

export function getWorkOptionById(id: string): NafWorkOption | undefined {
  return NAF_WORK_OPTIONS.find((o) => o.id === id);
}

export function resolveUnlockPricing(input: {
  pricingTier?: PricingTierId | string | null;
  workOptionId?: string | null;
}): {
  tier: PricingTierId;
  unlockPriceEur: number;
  unlockCredits: number;
  workOption?: NafWorkOption;
} {
  const workOption = input.workOptionId
    ? getWorkOptionById(input.workOptionId)
    : undefined;
  const tier: PricingTierId =
    workOption?.tier ??
    (isPricingTierId(String(input.pricingTier ?? ""))
      ? (input.pricingTier as PricingTierId)
      : DEFAULT_PRICING_TIER);
  const unlockPriceEur = unlockPriceEurForTier(tier);
  return {
    tier,
    unlockPriceEur,
    unlockCredits: unlockCreditsForPriceEur(unlockPriceEur),
    workOption,
  };
}

export function validatePricingSelection(input: {
  pricingTier?: string | null;
  workOptionId?: string | null;
  nafCodes: readonly string[];
}):
  | {
      ok: true;
      pricingTier: PricingTierId;
      workOptionId?: string;
      unlockPriceEur: number;
    }
  | { ok: false; error: string } {
  const workOptionId = input.workOptionId?.trim() || undefined;
  if (workOptionId) {
    const opt = getWorkOptionById(workOptionId);
    if (!opt) {
      return { ok: false, error: "Prestation sélectionnée invalide." };
    }
    const allowed = new Set(
      input.nafCodes.map((c) => c.trim().toUpperCase()).filter(Boolean)
    );
    if (!allowed.has(opt.nafCode.toUpperCase())) {
      return {
        ok: false,
        error: "La prestation ne correspond pas à la spécialité NAF choisie.",
      };
    }
    return {
      ok: true,
      pricingTier: opt.tier,
      workOptionId: opt.id,
      unlockPriceEur: unlockPriceEurForTier(opt.tier),
    };
  }

  const raw = String(input.pricingTier ?? "").trim();
  if (!isPricingTierId(raw)) {
    return {
      ok: false,
      error:
        "Choisissez le type de prestation (ticket) pour fixer le prix de mise en contact.",
    };
  }
  return {
    ok: true,
    pricingTier: raw,
    unlockPriceEur: unlockPriceEurForTier(raw),
  };
}
