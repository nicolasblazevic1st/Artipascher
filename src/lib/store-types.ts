import type { TradeCategory } from "./data";
import type { QualificationLevel } from "./qualification-tiers";

export type AdminReviewStatus = "pending" | "approved" | "rejected";

export interface ProTradeSelection {
  tradeGroupId: string;
  tradeGroupLabel: string;
  qualibatJobId: number;
  qualibatJobLabel: string;
  category: TradeCategory;
}

export interface ProDocument {
  id: string;
  label: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
}

export interface ProRegistration {
  id: string;
  companyName: string;
  siret: string;
  siren: string;
  email: string;
  phone: string;
  city: string;
  department: "59" | "62";
  category: TradeCategory;
  zone: string;
  /** Corps de métier et métiers Qualibat (plusieurs possibles). */
  tradeSelections?: ProTradeSelection[];
  /** @deprecated Premier corps de métier — préférer tradeSelections. */
  tradeGroupId?: string;
  /** @deprecated */
  tradeGroupLabel?: string;
  /** @deprecated */
  qualibatJobId?: number;
  /** @deprecated */
  qualibatJobLabel?: string;
  rcsVerified: boolean;
  /** Niveau affiché sur les enchères (1 = Certifié, 2 = Qualifié, 3 = Premium). */
  qualificationLevel?: QualificationLevel;
  /** Documents transmis à l'inscription (KBIS, assurances…). */
  documents?: ProDocument[];
  passwordHash: string;
  status: AdminReviewStatus;
  createdAt: string;
  reviewedAt?: string;
  adminNote?: string;
}

export interface ClientAccount {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface WorkRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  clientId?: string;
  /** Numéro et voie du chantier (ex. 12 rue de la Barre). */
  addressLine?: string;
  /** Complément d'adresse (appartement, bâtiment…). */
  addressLine2?: string;
  /** Code postal (59xxx ou 62xxx). */
  postalCode?: string;
  city: string;
  department: "59" | "62";
  category: string;
  description: string;
  /** Prix de départ de l'enchère. Peut venir du devis précédent client (à l'approbation)
   *  ou du premier devis Artipascher validé (prioritaire). */
  startPrice?: number;
  /** Renseigné lorsque le prix de départ provient d'un devis Artipascher validé. */
  startPriceQuoteId?: string;
  /** Durée souhaitée de l'enchère en jours (max. 90). */
  auctionDurationDays: number;
  photos: string[];
  status: AdminReviewStatus;
  createdAt: string;
  reviewedAt?: string;
  auctionId?: string;
  /** Date de fin calculée à l'approbation admin. */
  auctionEndsAt?: string;
  /** Offre indicative retenue (legacy). */
  selectedBidId?: string;
  /** Devis après visite retenu par le particulier. */
  selectedQuoteId?: string;
  /** Lien public de partage (réseaux sociaux). */
  shareToken?: string;
  /** Devis concurrent déjà obtenu par le client (montant + justificatif). */
  previousQuoteAmount?: number;
  previousQuoteProofUrl?: string;
  /** Précisions optionnelles (artisan, date…). */
  previousQuoteNote?: string;
}

export type ProQuoteStatus = "pending_moderation" | "approved" | "rejected";

/** Devis formalisé après visite sur site — validé par l'administration. */
export interface ProQuote {
  id: string;
  workRequestId: string;
  auctionId: string;
  proId: string;
  companyName: string;
  /** Date de visite sur le chantier (YYYY-MM-DD). */
  visitDate: string;
  amount: number;
  /** Détail des prestations, matériaux, délais… */
  description: string;
  status: ProQuoteStatus;
  createdAt: string;
  reviewedAt?: string;
  adminNote?: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  proId: string;
  companyName: string;
  amount: number;
  feeEur: number;
  createdAt: string;
  stripeSessionId?: string;
}

export interface ContactUnlock {
  id: string;
  proId: string;
  auctionId: string;
  amountEur: number;
  paidAt: string;
  stripeSessionId?: string;
}

export type PasswordResetUserType = "client" | "pro";

export interface PasswordResetToken {
  token: string;
  email: string;
  userType: PasswordResetUserType;
  userId: string;
  expiresAt: string;
  createdAt: string;
  usedAt?: string;
}

export interface DataStore {
  clientAccounts: ClientAccount[];
  proRegistrations: ProRegistration[];
  workRequests: WorkRequest[];
  contactUnlocks: ContactUnlock[];
  bids: Bid[];
  proQuotes: ProQuote[];
  passwordResetTokens: PasswordResetToken[];
}

export const EMPTY_STORE: DataStore = {
  clientAccounts: [],
  proRegistrations: [],
  workRequests: [],
  contactUnlocks: [],
  bids: [],
  proQuotes: [],
  passwordResetTokens: [],
};
