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
  status: AuctionStatus;
  endsAt: string;
  /** Affiche le bandeau TEST (démo / seed). */
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

export const SAMPLE_AUCTIONS: Auction[] = [
  {
    id: "1",
    title: "Rénovation salle de bain complète",
    description:
      "Dépose ancienne salle de bain, pose carrelage sol et murs, installation douche à l'italienne, WC suspendu.",
    category: "carrelage",
    city: "Lille",
    department: "59",
    startPrice: 8500,
    currentPrice: 7200,
    bidCount: 4,
    status: "active",
    endsAt: "2026-08-10T18:00:00",
  },
  {
    id: "2",
    title: "Pose de parquet flottant",
    description:
      "Pose parquet flottant chêne environ 45 m², pose plinthes 52 mètres linéaires, préparation sol.",
    category: "menuiserie",
    city: "Roubaix",
    department: "59",
    startPrice: 3200,
    currentPrice: 2600,
    bidCount: 3,
    status: "active",
    endsAt: "2026-08-08T12:00:00",
  },
  {
    id: "3",
    title: "Peinture intérieure maison",
    description:
      "Peinture murs et plafonds, 6 pièces, préparation des supports, 2 couches finition.",
    category: "peinture",
    city: "Tourcoing",
    department: "59",
    startPrice: 4800,
    currentPrice: 4800,
    bidCount: 0,
    status: "active",
    endsAt: "2026-08-12T20:00:00",
  },
  {
    id: "4",
    title: "Remplacement tableau électrique",
    description:
      "Dépose ancien tableau, pose neuf aux normes NF C 15-100, mise aux normes prises et éclairages.",
    category: "electricite",
    city: "Valenciennes",
    department: "59",
    startPrice: 1800,
    currentPrice: 1500,
    bidCount: 2,
    status: "active",
    endsAt: "2026-08-09T17:00:00",
  },
  {
    id: "5",
    title: "Pose IPN mur porteur",
    description:
      "Création ouverture mur porteur, pose IPN HEB 180, reprise maçonnerie et finitions.",
    category: "maconnerie",
    city: "Douai",
    department: "59",
    startPrice: 5800,
    currentPrice: 5800,
    bidCount: 0,
    status: "active",
    endsAt: "2026-08-11T14:00:00",
  },
  {
    id: "6",
    title: "Isolation combles perdus",
    description:
      "Isolation combles perdus laine de verre R=7, trappes d'accès, pare-vapeur, 80 m².",
    category: "charpente",
    city: "Lens",
    department: "62",
    startPrice: 4200,
    currentPrice: 3600,
    bidCount: 5,
    status: "active",
    endsAt: "2026-08-07T19:00:00",
  },
];

/** Mention affichée sur la présentation et les pages de confiance. */
export const DATA_HOSTING_NOTICE =
  "Vos données personnelles sont hébergées chez OVH, dans un datacenter du Nord de la France.";

export const FAQ_ITEMS = [
  {
    question: "Comment fonctionnent les enchères inversées ?",
    answer:
      "Les enchères inversées fonctionnent à l'inverse des enchères classiques. Le prix de départ est fixé au premier devis validé, puis les professionnels du Nord-Pas-de-Calais proposent des prix de plus en plus bas. À la clôture, vous comparez les offres et choisissez vous-même l'artisan retenu.",
  },
  {
    question: "Artipascher couvre quelles zones ?",
    answer:
      "Artipascher est spécialisé dans le Nord-Pas-de-Calais : départements Nord (59) et Pas-de-Calais (62). Lille, Roubaix, Tourcoing, Valenciennes, Dunkerque, Douai, Lens, Arras et environs.",
  },
  {
    question: "Comment demander des travaux ?",
    answer:
      "Créez d'abord un compte particulier (gratuit), confirmez votre email, puis publiez votre demande depuis votre espace : description d'au moins 100 caractères, au minimum 1 photo, et votre ville (59/62). Une fois validée par notre équipe, une enchère est créée ; le prix de départ sera fixé au premier devis validé.",
  },
  {
    question: "Comment s'inscrire comme artisan ?",
    answer:
      "Inscrivez-vous avec votre numéro SIRET. Nous vérifions obligatoirement votre inscription au registre du commerce (RCS) : entreprise active, établissement en 59 ou 62. KBIS et assurance complémentaires. Validation sous 24 à 48 h.",
  },
  {
    question: "Pourquoi seuls les artisans inscrits au RCS sont visibles ?",
    answer:
      "Artipascher ne met en relation qu'avec des entreprises du bâtiment inscrites au registre du commerce. Chaque SIRET est contrôlé en direct auprès du registre national. Les auto-entrepreneurs et sociétés non immatriculées ne peuvent pas enchérir.",
  },
  {
    question: "Combien de temps dure une enchère ?",
    answer:
      "Vous choisissez la durée lors de votre demande : de 7 jours à 3 mois maximum. Un compteur en temps réel indique le temps restant sur chaque fiche projet une fois l'enchère lancée.",
  },
  {
    question: "Combien coûte une enchère pour le professionnel ?",
    answer:
      "Chaque enchère coûte 1 € au professionnel inscrit et approuvé. Le paiement est obligatoire avant l'enregistrement de l'offre. Chaque offre doit être strictement inférieure au prix actuel, sans montant minimal imposé.",
  },
  {
    question: "Les coordonnées du client sont-elles visibles par tous ?",
    answer:
      "Non. Nom, téléphone, email et adresse exacte sont masqués. Seuls les artisans inscrits au RCS, approuvés par l'admin, peuvent débloquer les coordonnées d'un chantier moyennant 1 € par enchère.",
  },
  {
    question: "Comment choisir mon artisan à la fin de l'enchère ?",
    answer:
      "Une fois l'enchère terminée, vous recevez la liste des offres des artisans vérifiés. Vous comparez les prix, les profils et les qualifications, puis vous sélectionnez librement l'artisan avec lequel vous souhaitez travailler. Le moins-disant n'est jamais imposé.",
  },
  {
    question: "Le service est-il gratuit pour les particuliers ?",
    answer:
      "Oui, la publication de votre projet est gratuite et sans engagement. Vous ne payez que l'artisan retenu à la fin des travaux.",
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
