import type { TradeCategory } from "./data";
import type { QualificationLevel } from "./qualification-tiers";

export type AdminReviewStatus = "pending" | "approved" | "rejected";

/** Vérification de l'attestation décennale par corps de métier. */
export type DecennaleVerificationStatus =
  | "en_attente_verification"
  | "validé"
  | "non_couvert";

/** Vérification KBIS / RC pro (niveau 1). */
export type DocumentVerificationStatus =
  | "en_attente_verification"
  | "validé"
  | "rejeté";

export interface Level1OcrHints {
  siren?: string;
  siret?: string;
  companyName?: string;
  insurer?: string;
  validUntil?: string;
  rawSnippet?: string;
}

export interface Level1ConsistencyIssue {
  field: string;
  message: string;
  severity: "warning" | "error";
}

export interface ProLevel1Audit {
  rcsVerifiedAt?: string;
  geoVerified: boolean;
  geoDepartment?: string;
  consistencyCheckedAt?: string;
  autoValidatedAt?: string;
  globalIssues?: Level1ConsistencyIssue[];
}

export type Level1CheckStatus =
  | "ok"
  | "pending"
  | "missing"
  | "rejected";

export interface Level1CheckItem {
  id: string;
  label: string;
  status: Level1CheckStatus;
  detail: string;
  automatic: boolean;
}

export interface ProTradeDocument {
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
}

export interface ProTradeSelection {
  tradeGroupId: string;
  tradeGroupLabel: string;
  qualibatJobId: number;
  qualibatJobLabel: string;
  category: TradeCategory;
  /** Statut de vérification de l'attestation décennale pour CE corps de métier. */
  decennaleStatus?: DecennaleVerificationStatus;
  /** Attestation décennale couvrant ce corps de métier. */
  decennaleDocument?: ProTradeDocument;
  /** Indices OCR sur l'attestation décennale. */
  decennaleOcrHints?: Level1OcrHints;
  decennaleConsistencyIssues?: Level1ConsistencyIssue[];
}

export interface ProDocument {
  id: string;
  label: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
  verificationStatus?: DocumentVerificationStatus;
  ocrHints?: Level1OcrHints;
  consistencyIssues?: Level1ConsistencyIssue[];
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
  /** @deprecated Ancien champ libre — le siège RCS (city/department) suffit. */
  zone?: string;
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
  /** Audit automatique niveau 1 (RCS, géo, cohérence OCR). */
  level1Audit?: ProLevel1Audit;
  /** Date de certification niveau 1 par l'admin. */
  level1CertifiedAt?: string;
  /** Niveau affiché (0 = démoté / non certifié, 1 = Certifié, 2 = Qualifié, 3 = Premium). */
  qualificationLevel?: QualificationLevel;
  /** Documents transmis à l'inscription (KBIS, assurances…). */
  documents?: ProDocument[];
  passwordHash: string;
  status: AdminReviewStatus;
  createdAt: string;
  reviewedAt?: string;
  adminNote?: string;
  /** Code de parrainage unique (entreprises vérifiées). */
  referralCode?: string;
  /** Pro qui a parrainé ce compte (via code unique). */
  referredByProId?: string;
  /** Horodatage d'application du code de parrainage. */
  referralCodeAppliedAt?: string;
  /** Horodatage du crédit versé au parrain (après 5 dépenses du filleul). */
  referralRewardGrantedAt?: string;
  /**
   * false = email non confirmé (nouveaux comptes).
   * undefined = comptes historiques (considérés vérifiés).
   */
  emailVerified?: boolean;
  emailVerifiedAt?: string;
}

export type ClientKind = "individual" | "company";

export interface ClientAccount {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  /** Défaut individual pour les comptes existants. */
  kind?: ClientKind;
  companyName?: string;
  siret?: string;
  siren?: string;
  companyVerified?: boolean;
  /**
   * false = email non confirmé (nouveaux comptes).
   * undefined = comptes historiques (considérés vérifiés).
   */
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  createdAt: string;
}

export interface WorkRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Téléphone du client (obligatoire à la création). */
  phone?: string;
  clientId?: string;
  clientKind?: ClientKind;
  companyName?: string;
  clientSiret?: string;
  /** Numéro et voie du chantier (ex. 12 rue de la Barre). */
  addressLine?: string;
  /** Complément d'adresse (appartement, bâtiment…). */
  addressLine2?: string;
  /** Code postal (59xxx ou 62xxx). */
  postalCode?: string;
  city: string;
  department: "59" | "62";
  /** Identifiant Base Adresse Nationale (data.gouv.fr). */
  banAddressId?: string;
  latitude?: number;
  longitude?: number;
  /** Horodatage de la double vérification serveur BAN. */
  addressVerifiedAt?: string;
  /** Date souhaitée par le particulier pour le début des travaux (YYYY-MM-DD). */
  requestedWorkStartDate?: string;
  category: string;
  description: string;
  /** Prix de départ de l'enchère. Peut venir du client, d'un devis précédent,
   *  ou du premier devis Artipascher validé. */
  startPrice?: number;
  /**
   * Comment le prix de départ est déterminé :
   * - client : montant fixé par le particulier
   * - first_quote : fixé au premier devis Artipascher validé
   * - unspecified : non précisé (équivalent pratique au 1er devis)
   */
  startPriceMode?: "client" | "first_quote" | "unspecified";
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
  /** Demande / enchère de démonstration (bandeau TEST). */
  isTest?: boolean;
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
  /** PDF du devis joint à l'enchère (vérifié OCR). */
  devisProofUrl?: string;
  /** Montant TTC extrait du devis (égal à `amount` au centime près). */
  ocrAmount?: number;
  ocrMatchedLabel?: string;
  ocrSnippet?: string;
  /** Devis après visite à l'origine de cette offre (conversion auto à la validation admin). */
  fromQuoteId?: string;
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

export interface EmailVerificationToken {
  token: string;
  email: string;
  userType: PasswordResetUserType;
  userId: string;
  expiresAt: string;
  createdAt: string;
  usedAt?: string;
}

export type SmsCampaignStatus = "demo" | "sent" | "failed";

export type SmsRecipientStatus = "sent" | "failed" | "skipped";

export type SmsCohort = "returning" | "new_young" | "new_established";

export type SmsCampaignTrigger = "manual" | "auto";

export interface SmsCampaignRecipient {
  proId?: string;
  siret?: string;
  companyName: string;
  phone: string;
  status: SmsRecipientStatus;
  error?: string;
  cohort?: SmsCohort;
}

/** Campagne SMS admin — alerte artisans proches d'une demande de travaux. */
export interface SmsCampaign {
  id: string;
  workRequestId: string;
  category: string;
  city: string;
  department: "59" | "62";
  message: string;
  status: SmsCampaignStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  recipients: SmsCampaignRecipient[];
  trigger?: SmsCampaignTrigger;
  createdAt: string;
  sentAt?: string;
}

export type ContactRequestStatus = "pending" | "accepted" | "refused" | "expired";

export interface ContactRequest {
  id: string;
  auctionId: string;
  workRequestId: string;
  proId: string;
  status: ContactRequestStatus;
  createdAt: string;
  expiresAt: string;
  decidedAt?: string;
}

/** Prospect SIRENE / carnet téléphone pour campagnes SMS. */
export interface ArtisanProspect {
  siret: string;
  siren: string;
  companyName: string;
  city: string;
  department: "59" | "62";
  nafCode?: string;
  companyCreatedAt?: string;
  phone?: string;
  source: "gouv" | "import" | "platform";
  optedOut?: boolean;
  lastContactedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmsCampaignSettings {
  autoSendOnApprove: boolean;
  defaultCampaignSize: number;
  defaultMessageTemplate?: string;
  throttleMs: number;
}

export const DEFAULT_SMS_SETTINGS: SmsCampaignSettings = {
  autoSendOnApprove: false,
  defaultCampaignSize: 30,
  throttleMs: 150,
};

/** 1 crédit = 1 € — polyvalent (contact ou enchère). */
export const CREDIT_PRICE_EUR = 1;

export const CREDIT_PACKS = [1, 5, 10, 20] as const;
export type CreditPackSize = (typeof CREDIT_PACKS)[number];

/** Crédits dépensés par le filleul avant récompense du parrain. */
export const REFERRAL_SPEND_THRESHOLD = 5;
/** Crédits offerts au parrain une fois le seuil atteint. */
export const REFERRAL_REWARD_CREDITS = 5;

export type CreditTxnType =
  | "purchase"
  | "spend_unlock"
  | "spend_bid"
  | "refund_unlock"
  | "admin_adjust"
  | "demo_grant"
  | "referral_reward";

export interface ProCreditTransaction {
  id: string;
  proId: string;
  type: CreditTxnType;
  /** +N à l'achat, -1 à la dépense. */
  amount: number;
  balanceAfter: number;
  auctionId?: string;
  workRequestId?: string;
  stripeSessionId?: string;
  note?: string;
  createdAt: string;
}

export interface ProCreditWallet {
  proId: string;
  balance: number;
  updatedAt: string;
}

export interface DataStore {
  clientAccounts: ClientAccount[];
  proRegistrations: ProRegistration[];
  workRequests: WorkRequest[];
  contactUnlocks: ContactUnlock[];
  contactRequests: ContactRequest[];
  artisanProspects: ArtisanProspect[];
  bids: Bid[];
  proQuotes: ProQuote[];
  passwordResetTokens: PasswordResetToken[];
  emailVerificationTokens: EmailVerificationToken[];
  smsCampaigns: SmsCampaign[];
  smsSettings?: SmsCampaignSettings;
  creditWallets: ProCreditWallet[];
  creditTransactions: ProCreditTransaction[];
}

export const EMPTY_STORE: DataStore = {
  clientAccounts: [],
  proRegistrations: [],
  workRequests: [],
  contactUnlocks: [],
  contactRequests: [],
  artisanProspects: [],
  bids: [],
  proQuotes: [],
  passwordResetTokens: [],
  emailVerificationTokens: [],
  smsCampaigns: [],
  smsSettings: { ...DEFAULT_SMS_SETTINGS },
  creditWallets: [],
  creditTransactions: [],
};
