import type { ProQuote } from "./store-types";

/** Devis de démonstration — toujours approuvés, consultables sur les fiches enchères. */
export const SAMPLE_PRO_QUOTES: ProQuote[] = [
  // Peinture Lille (demande particulier test)
  {
    id: "quote-demo-peinture-1",
    workRequestId: "req-test-001",
    auctionId: "auction-req-test-001",
    proId: "demo-pro-peinture-1",
    companyName: "Rénovation Lilloise SARL",
    visitDate: "2026-07-28",
    amount: 3950,
    description: `Devis TTC après visite du 28/07/2026 — salon 22 m² + chambre 18 m² (murs et plafonds).

Prestations :
• Protection sols et meubles (bâches, adhésif de masquage)
• Lessivage et dégraissage des supports
• Rebouchage fissures et trous (enduit prêt à l'emploi)
• 2 couches peinture acrylique mat satin blanc cassé (Seigneurie / similar)
• Finition plinthes et encadrements de portes

Fournitures incluses. Déplacement inclus zone Lille.
Délai d'exécution : 4 jours ouvrés après accord.
Garantie décennale via assurance RC Pro.`,
    status: "approved",
    createdAt: "2026-07-29T09:00:00.000Z",
    reviewedAt: "2026-07-29T14:30:00.000Z",
    adminNote: "Devis démo — validé pour présentation.",
  },
  {
    id: "quote-demo-peinture-2",
    workRequestId: "req-test-001",
    auctionId: "auction-req-test-001",
    proId: "demo-pro-peinture-2",
    companyName: "Couleurs & Finitions 59",
    visitDate: "2026-07-30",
    amount: 4100,
    description: `Visite sur site effectuée le 30/07/2026. Appartement occupé, accès OK.

Détail des travaux :
• Préparation : ponçage léger plafonds, traitement zones humides salle de bain attenante
• Application 1 couche d'accrochage + 2 finitions mat satin
• Pièces : salon (22 m²) et chambre (18 m²) — hauteur sous plafond 2,50 m
• Nettoyage fin de chantier

Matériel et produits professionnels fournis.
Équipe de 2 peintres qualifiés.
Planning proposé : semaine du 15/09/2026.
Validité du devis : 30 jours.`,
    status: "approved",
    createdAt: "2026-07-30T16:00:00.000Z",
    reviewedAt: "2026-07-31T10:00:00.000Z",
    adminNote: "Devis démo — validé pour présentation.",
  },
  {
    id: "quote-demo-peinture-3",
    workRequestId: "req-test-001",
    auctionId: "auction-req-test-001",
    proId: "demo-pro-peinture-3",
    companyName: "Peinture Nord Express",
    visitDate: "2026-08-01",
    amount: 3780,
    description: `Devis n°2026-0847 — Chantier peinture intérieure Lille (59).

Suite à visite du 01/08/2026 :
• Salon 22 m² + chambre 18 m² (murs + plafonds)
• Préparation complète des supports (lessivage, rebouchage)
• Peinture blanc cassé mat satin, marque Tollens ou équivalent
• Protection et nettoyage inclus

Main-d'œuvre : 3,5 jours.
Déchets emportés en centre de tri agréé.
Assurance décennale et RC Pro à jour.
Acompte 30 % à la commande, solde à réception.`,
    status: "approved",
    createdAt: "2026-08-01T11:00:00.000Z",
    reviewedAt: "2026-08-01T15:00:00.000Z",
    adminNote: "Devis démo — validé pour présentation.",
  },

  // Plomberie Roubaix (demande particulier test)
  {
    id: "quote-demo-plomberie-1",
    workRequestId: "req-test-002",
    auctionId: "auction-req-test-002",
    proId: "demo-pro-plomberie-1",
    companyName: "Plomberie Sanitaire Roubaix",
    visitDate: "2026-08-02",
    amount: 1650,
    description: `Devis TTC — Remplacement chauffe-eau électrique 200 L.

Visite réalisée le 02/08/2026 (2e étage, cage d'escalier OK) :
• Dépose et évacuation ancien ballon
• Fourniture chauffe-eau électrique 200 L vertical (Atlantic ou equivalent)
• Pose, raccordements eau froide / eau chaude
• Groupe de sécurité neuf + expansion
• Mise en eau, contrôle étanchéité, réglage thermostat

Déplacement et main-d'œuvre inclus.
Délai intervention : sous 10 jours ouvrés après accord.
Garantie pièces 2 ans, main-d'œuvre 1 an.`,
    status: "approved",
    createdAt: "2026-08-02T18:00:00.000Z",
    reviewedAt: "2026-08-03T09:00:00.000Z",
    adminNote: "Devis démo — validé pour présentation.",
  },
  {
    id: "quote-demo-plomberie-2",
    workRequestId: "req-test-002",
    auctionId: "auction-req-test-002",
    proId: "demo-pro-plomberie-2",
    companyName: "Eau Chaude Pro 59",
    visitDate: "2026-08-02",
    amount: 1720,
    description: `Devis après visite — Chauffe-eau 200 L Roubaix.

Constat sur site :
• Ballon actuel vétuste, groupe de sécurité encrassé
• Accès 2e sans ascenseur — manutention 2 personnes prévue

Prestations :
• Dépose ancien appareil et évacuation DEEE
• Ballon électrique 200 L stéatite, classe C
• Raccordements cuivre / flexibles inox
• Mise aux normes électrique sur ligne existante
• Essai pression et remise fiche d'intervention

Intervention sous 3 semaines. Devis valable 1 mois.`,
    status: "approved",
    createdAt: "2026-08-03T07:30:00.000Z",
    reviewedAt: "2026-08-03T10:00:00.000Z",
    adminNote: "Devis démo — validé pour présentation.",
  },

  // Enchères catalogue démo (fiches publiques /encheres/1, /2…)
  {
    id: "quote-demo-sdb-1",
    workRequestId: "sample-auction-1",
    auctionId: "1",
    proId: "demo-pro-carrelage-1",
    companyName: "Carrelage & Bain Lille",
    visitDate: "2026-07-25",
    amount: 6980,
    description: `Devis salle de bain complète — Lille (59).

Visite du 25/07/2026 :
• Dépose sanitaires et carrelage existant
• Étanchéité SPEC sous carrelage (douche italienne)
• Carrelage sol et murs 30×60 cm (fourniture standard au choix client)
• Pose WC suspendu + bati-support
• Receveur douche à l'italienne + paroi fixe

Hors plomberie réseau encastré si mauvais état (devis complémentaire sur place).
Durée chantier : 8 à 10 jours.
Garantie parfait achèvement 1 an.`,
    status: "approved",
    createdAt: "2026-07-26T10:00:00.000Z",
    reviewedAt: "2026-07-26T16:00:00.000Z",
    adminNote: "Devis démo catalogue.",
  },
  {
    id: "quote-demo-sdb-2",
    workRequestId: "sample-auction-1",
    auctionId: "1",
    proId: "demo-pro-carrelage-2",
    companyName: "Rénovation Lilloise SARL",
    visitDate: "2026-07-27",
    amount: 7150,
    description: `Rénovation SDB complète — devis TTC post-visite.

Travaux prévus :
• Dépose et évacuation gravats
• Douche à l'italienne (pente + bonde linéaire)
• Carrelage grès cérame antidérapant sol + faïence murale
• WC suspendu Geberit, robinetterie thermostatique
• Peinture plafond zone sèche

Coordination plombier + carreleur inclus.
Planning : 2 semaines après validation.
Assurance décennale n°2026-RL-4587.`,
    status: "approved",
    createdAt: "2026-07-28T09:00:00.000Z",
    reviewedAt: "2026-07-28T11:00:00.000Z",
    adminNote: "Devis démo catalogue.",
  },
  {
    id: "quote-demo-parquet-1",
    workRequestId: "sample-auction-2",
    auctionId: "2",
    proId: "demo-pro-parquet-1",
    companyName: "Parquet Nord EURL",
    visitDate: "2026-07-26",
    amount: 2480,
    description: `Pose parquet flottant chêne — Roubaix, 45 m².

Visite du 26/07/2026 :
• Préparation sol (ragréage localisé 2 zones)
• Sous-couche acoustique
• Parquet flottant chêne stratifié/contrecollé (fourniture incluse gamme standard)
• Plinthes MDF 52 ml, peintes blanc
• Seuils de porte 3 unités

Chantier propre, logement occupé — zone par zone.
Durée : 3 jours. Garantie pose 2 ans.`,
    status: "approved",
    createdAt: "2026-07-27T08:00:00.000Z",
    reviewedAt: "2026-07-27T12:00:00.000Z",
    adminNote: "Devis démo catalogue.",
  },
  {
    id: "quote-demo-elec-1",
    workRequestId: "sample-auction-4",
    auctionId: "4",
    proId: "demo-pro-elec-1",
    companyName: "Élec 59 SAS",
    visitDate: "2026-07-29",
    amount: 1420,
    description: `Remplacement tableau électrique — Valenciennes.

Suite visite :
• Dépose ancien tableau vétuste
• Pose tableau neuf 2 rangées pré-équipé Legrand
• Mise aux normes NF C 15-100 (différentiels 30 mA)
• Reprise 8 circuits existants + étiquetage
• Consuel : dossier fourni, passage inspection non inclus

Intervention 1 journée. Attestation de conformité remise.
Entreprise Qualifelec.`,
    status: "approved",
    createdAt: "2026-07-30T10:00:00.000Z",
    reviewedAt: "2026-07-30T14:00:00.000Z",
    adminNote: "Devis démo catalogue.",
  },
  {
    id: "quote-demo-isolation-1",
    workRequestId: "sample-auction-6",
    auctionId: "6",
    proId: "demo-pro-isolation-1",
    companyName: "Isolation Hauts-de-France",
    visitDate: "2026-07-24",
    amount: 3450,
    description: `Isolation combles perdus — Lens (62), 80 m².

Visite combles du 24/07/2026 :
• Soufflage laine de verre R=7 (épaisseur 320 mm)
• Pare-vapeur retour trémie
• Trappe d'accès isolée remplacée
• Reprise calfeutrage cheminées

Avant-travaux : photos état des lieux.
Durée : 1 journée. Éligible aides (info client sur demande).`,
    status: "approved",
    createdAt: "2026-07-25T11:00:00.000Z",
    reviewedAt: "2026-07-25T15:00:00.000Z",
    adminNote: "Devis démo catalogue.",
  },
  {
    id: "quote-demo-isolation-2",
    workRequestId: "sample-auction-6",
    auctionId: "6",
    proId: "demo-pro-isolation-2",
    companyName: "Confort Énergie 62",
    visitDate: "2026-07-26",
    amount: 3580,
    description: `Devis isolation combles 80 m² — Lens.

Prestations :
• Débarras léger combles (évacuation 1 m³ inclus)
• Soufflage ouate cellulose R=7
• Traitement ponts thermiques trémie
• Trappe étanche + joint
• Certificat d'intervention RGE

Délai : 2 semaines. Garantie 10 ans étanchéité.`,
    status: "approved",
    createdAt: "2026-07-27T09:00:00.000Z",
    reviewedAt: "2026-07-27T13:00:00.000Z",
    adminNote: "Devis démo catalogue.",
  },
];

export function getSampleQuotesForAuction(auctionId: string): ProQuote[] {
  return SAMPLE_PRO_QUOTES.filter((q) => q.auctionId === auctionId);
}

export function getAllSampleQuotes(): ProQuote[] {
  return SAMPLE_PRO_QUOTES;
}
