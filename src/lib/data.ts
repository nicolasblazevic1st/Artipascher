export type AuctionStatus = "active" | "ended";

export type TradeCategory =
  | "maconnerie"
  | "menuiserie"
  | "plaquiste"
  | "carrelage"
  | "electricite"
  | "peinture"
  | "plomberie"
  | "chauffage"
  | "couverture"
  | "charpente";

export interface Auction {
  id: string;
  title: string;
  description: string;
  category: TradeCategory;
  city: string;
  department: "59" | "62";
  startPrice: number;
  currentPrice: number;
  bidCount: number;
  /** Artisans ayant débloqué le contact. */
  acceptedArtisansCount: number;
  /** Plafond de déblocages pour cette annonce. */
  maxAcceptedArtisans: number;
  status: AuctionStatus;
  endsAt: string;
  /** Annonce de démonstration (bande de démonstration). */
  isTest?: boolean;
  /** Première photo projet (visible sans crédit). */
  coverPhotoUrl?: string;
  /** Coordonnées chantier (filtrable par distance). */
  latitude?: number;
  longitude?: number;
}

export const CATEGORY_LABELS: Record<TradeCategory, string> = {
  maconnerie: "Maçonnerie",
  menuiserie: "Menuiserie",
  plaquiste: "Plaquiste",
  carrelage: "Carrelage",
  electricite: "Électricité",
  peinture: "Peinture",
  plomberie: "Plomberie",
  chauffage: "Chauffage",
  couverture: "Couverture / Toiture",
  charpente: "Charpente",
};

export const NORD_CITIES = [
  "Lille",
  "Roubaix",
  "Tourcoing",
  "Valenciennes",
  "Dunkerque",
  "Douai",
  "Lens",
  "Arras",
  "Cambrai",
  "Maubeuge",
  "Wattrelos",
  "Croix",
  "Marcq-en-Barœul",
  "Lambersart",
  "Béthune",
] as const;

/** Centroïdes approximatifs des villes du catalogue (filtre distance). */
export const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  Lille: { lat: 50.6292, lon: 3.0573 },
  Roubaix: { lat: 50.6927, lon: 3.1746 },
  Tourcoing: { lat: 50.7239, lon: 3.1612 },
  Valenciennes: { lat: 50.3571, lon: 3.5181 },
  Dunkerque: { lat: 51.0343, lon: 2.3768 },
  Douai: { lat: 50.3708, lon: 3.0793 },
  Lens: { lat: 50.4289, lon: 2.8318 },
  Arras: { lat: 50.291, lon: 2.7772 },
  Cambrai: { lat: 50.1767, lon: 3.2356 },
  Maubeuge: { lat: 50.2775, lon: 3.9726 },
  Wattrelos: { lat: 50.7042, lon: 3.214 },
  Croix: { lat: 50.6785, lon: 3.1503 },
  "Marcq-en-Barœul": { lat: 50.671, lon: 3.0927 },
  Lambersart: { lat: 50.65, lon: 3.025 },
  Béthune: { lat: 50.5297, lon: 2.64 },
  Calais: { lat: 50.9513, lon: 1.8587 },
};

export function coordinatesForCity(city: string): { lat: number; lon: number } | null {
  const direct = CITY_COORDINATES[city];
  if (direct) return direct;
  const normalized = city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  for (const [name, coords] of Object.entries(CITY_COORDINATES)) {
    const key = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (key === normalized) return coords;
  }
  return null;
}

/** Ancien catalogue démo hardcodé — vidé. */
export const SAMPLE_AUCTIONS: Auction[] = [];

/** Mention affichée sur la présentation et les pages de confiance. */
export const DATA_HOSTING_NOTICE =
  "Vos données personnelles sont hébergées chez OVH, dans un datacenter du Nord de la France.";

export const FAQ_ITEMS = [
  {
    question: "Le service est-il gratuit pour les particuliers ?",
    answer:
      "Oui. Publier une demande de travaux est gratuit et sans engagement. Artipascher ne prend aucune commission ni pourcentage sur vos travaux.",
  },
  {
    question: "Comment fonctionne Artipascher ?",
    answer:
      "Vous publiez une annonce décrivant vos travaux. Les artisans vérifiés du Nord-Pas-de-Calais qui correspondent à votre besoin peuvent débloquer vos coordonnées (crédits) pour vous contacter, visiter le chantier et vous envoyer un devis directement. Vous choisissez librement l’artisan retenu.",
  },
  {
    question: "Artipascher couvre quelles zones ?",
    answer:
      "Artipascher est spécialisé dans le Nord-Pas-de-Calais : départements Nord (59) et Pas-de-Calais (62). Lille, Roubaix, Tourcoing, Valenciennes, Dunkerque, Douai, Lens, Arras et environs.",
  },
  {
    question: "Comment demander des travaux ?",
    answer:
      "Remplissez le formulaire de demande (description d’au moins 100 caractères, au minimum 1 photo, ville en 59/62) et vérifiez votre mobile par SMS. Aucun compte n’est obligatoire pour publier. Créer un compte ensuite vous permet de retrouver et suivre vos demandes. Après validation par notre équipe, l’annonce est publiée pour les artisans correspondants.",
  },
  {
    question: "Comment s'inscrire comme artisan ?",
    answer:
      "Inscrivez-vous avec votre numéro SIRET. Nous vérifions obligatoirement votre inscription au registre du commerce (RCS) : entreprise active, établissement en 59 ou 62. Documents professionnels (attestation décennale, RC pro) selon le métier. Validation sous 24 à 48 h.",
  },
  {
    question: "Pourquoi seuls les artisans inscrits au RCS sont visibles ?",
    answer:
      "Artipascher ne met en relation qu’avec des entreprises du bâtiment inscrites au registre du commerce. Chaque SIRET est contrôlé auprès du registre national. Les structures non immatriculées ne peuvent pas débloquer de contacts.",
  },
  {
    question: "Combien de temps reste visible une annonce ?",
    answer:
      "Vous choisissez la durée lors de votre demande : de 7 jours à 3 mois maximum. Un compteur indique le temps restant sur chaque fiche une fois l’annonce publiée.",
  },
  {
    question: "Combien coûte le déblocage pour le professionnel ?",
    answer:
      "Une mise en contact coûte 1 crédit (20 € au tarif unitaire). Des packs à tarif dégressif sont proposés (ex. 10 crédits à 15 € / crédit). Chaque demande est limitée à 5 mises en contact maximum.",
  },
  {
    question: "Les coordonnées du client sont-elles visibles par tous ?",
    answer:
      "Non. Nom, téléphone, email et adresse exacte restent masqués. Seuls les artisans inscrits au RCS, approuvés, et correspondant au besoin peuvent débloquer les coordonnées (1 crédit · 20 €).",
  },
  {
    question: "Comment choisir mon artisan ?",
    answer:
      "Les artisans intéressés vous contactent après avoir débloqué vos coordonnées. Vous échangez (visite, devis hors plateforme) et sélectionnez librement celui qui vous convient. Aucune attribution automatique.",
  },
  {
    question: "Où sont hébergées mes données personnelles ?",
    answer:
      "Vos données personnelles (coordonnées, demandes, photos) sont hébergées chez OVH, dans un datacenter situé dans le Nord de la France. Elles ne quittent pas le territoire national.",
  },
];

export function formatPrice(amount: number): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatLocation(city: string, department: "59" | "62"): string {
  return `${city} (${department})`;
}
