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

/** Dirigeant / représentant légal issu du registre (API gouv). */
export interface LegalRepresentative {
  fullName: string;
  role?: string;
  /** personne physique | personne morale */
  kind?: "personne_physique" | "personne_morale";
}

export type PaymentNameCheckStatus = "match" | "mismatch" | "unavailable";

/** Contrôle de cohérence nom CB ↔ dirigeants / entreprise (non bloquant). */
export interface PaymentNameCheck {
  status: PaymentNameCheckStatus;
  cardName?: string;
  matchedAgainst?: string;
  checkedAt: string;
  stripeSessionId?: string;
}

/** Frais retenus si la vérif d'identité (Kbis) échoue au 1er achat de crédits. */
export const KBIS_VERIFICATION_FEE_EUR = 3;
export const KBIS_VERIFICATION_FEE_CENTS = KBIS_VERIFICATION_FEE_EUR * 100;

export type KbisPurchaseVerificationStatus = "passed" | "failed" | "error";

export type KbisPurchaseProvider = "registry" | "mock" | "infogreffe";

/** Contrôle identité déclenché à l'achat de crédits (achat Kbis / registre). */
export interface KbisPurchaseVerification {
  status: KbisPurchaseVerificationStatus;
  checkedAt: string;
  stripeSessionId: string;
  provider: KbisPurchaseProvider;
  /** Centimes retenus en cas d'échec (défaut 300). */
  feeRetainedCents: number;
  refundedCents?: number;
  stripeRefundId?: string;
  reason?: string;
  companyNameAtCheck?: string;
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
  /** Dirigeants connus au registre au moment de la vérif SIRET. */
  legalRepresentatives?: LegalRepresentative[];
  /** Dernier contrôle nom CB vs dirigeants / raison sociale. */
  paymentNameCheck?: PaymentNameCheck;
  /**
   * Vérif d'identité à l'achat de crédits (Kbis / registre).
   * Tant que status !== "passed", chaque achat Stripe repasse par le gate.
   */
  kbisPurchaseVerification?: KbisPurchaseVerification;
  /** Audit automatique niveau 1 (RCS, géo, cohérence OCR). */
  level1Audit?: ProLevel1Audit;
  /** Date de certification niveau 1 par l'admin. */
  level1CertifiedAt?: string;
  /** Certification (0 = retirée, 1 = certifié ; 2/3 legacy encore tolérés en lecture). */
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
  /** Compte de démonstration (présentation / tests). */
  isTestAccount?: boolean;
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
  /** Mobile vérifié par SMS (E.164, ex. +33612345678). */
  phoneVerifiedE164?: string;
  /** Horodatage de la dernière vérification SMS du mobile. */
  phoneVerifiedAt?: string;
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
  /** Compte de démonstration (présentation / tests). */
  isTestAccount?: boolean;
  /** Claims « client injoignable » validés (anti-churn). */
  ghostClaimsUpheld?: number;
  /** Client bloqué : plus de nouvelles demandes de contact / auto-accept. */
  blockedFromContact?: boolean;
  blockedAt?: string;
  adminNote?: string;
  createdAt: string;
}

export interface WorkRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Téléphone du client (obligatoire à la création). */
  phone?: string;
  /** Horodatage de vérif SMS du mobile au moment de la création. */
  phoneVerifiedAt?: string;
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
  /**
   * Codes NAF ciblés pour cette annonce (dérivés de la catégorie à la création).
   * Obligatoires pour la recherche d’artisans autour du chantier.
   */
  nafCodes?: string[];
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
  /** Durée d'annonce / mise en contact en jours (max. 90). */
  auctionDurationDays: number;
  /**
   * Si true : le particulier préfère une entreprise créée il y a plus de 2 ans.
   * Influence le mix SMS (2/3 ≥2 ans, 1/3 &lt;2 ans).
   */
  preferEstablishedCompany?: boolean;
  /**
   * Note Google minimale souhaitée (ex. 4). Absent / 0 = pas de filtre.
   * Appliqué au matching si une note est connue pour l’artisan.
   */
  minGoogleRating?: number;
  /**
   * Toujours true sur les nouvelles demandes : entreprise au statut normal
   * (active, hors liquidation / cessation).
   */
  requireActiveCompany?: boolean;
  /**
   * Toujours true sur les nouvelles demandes : décennale + RC pro validées.
   */
  requireValidInsurances?: boolean;
  /**
   * Autorisation de mise en contact (acceptation CG à la création).
   * Contact-only : toujours true pour les nouvelles demandes.
   * undefined = true (historique).
   */
  smsContactAlertsEnabled?: boolean;
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
  /** Demande / enchère de démonstration (bande de démonstration). */
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
  /** Justificatif (PDF/image), surtout si transmis par le particulier. */
  proofUrl?: string;
  /** Qui a déposé le devis sur la plateforme. */
  submittedBy?: "pro" | "client";
  uploadedByClientId?: string;
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

export type UnlockClaimStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected";

export interface ContactUnlock {
  id: string;
  proId: string;
  auctionId: string;
  workRequestId?: string;
  amountEur: number;
  paidAt: string;
  stripeSessionId?: string;
  /** Recréditage anti-churn effectué. */
  refundedAt?: string;
  refundTxnId?: string;
  claimStatus?: UnlockClaimStatus;
  claimedAt?: string;
  claimReason?: string;
  claimResolvedAt?: string;
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

/** Challenge OTP SMS pour vérifier le mobile d'un particulier. */
export interface PhoneVerificationChallenge {
  id: string;
  /**
   * Compte client, ou `__guest__` pour une vérification hors compte
   * (demande de travaux sans inscription).
   */
  clientId: string;
  phoneE164: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
  createdAt: string;
}

/** Mobile vérifié sans compte (fenêtre courte pour soumettre une demande). */
export interface GuestPhoneVerification {
  phoneE164: string;
  verifiedAt: string;
  expiresAt: string;
}

/** Sujet store pour les OTP / vérifs hors compte. */
export const GUEST_PHONE_SUBJECT_ID = "__guest__";

export type SmsCampaignStatus =
  | "demo"
  | "sent"
  | "failed"
  | "pending_review"
  | "cancelled";

export type SmsRecipientStatus = "sent" | "failed" | "skipped" | "pending";

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

/** Batch d’envoi journalier (historique) lié à une campagne d’acquisition. */
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
  /** Campagne multi-jours parente, si applicable. */
  acquisitionCampaignId?: string;
  /**
   * Jour d’envoi prévu (Europe/Paris YYYY-MM-DD).
   * En mode revue : préparé la veille pour cette date.
   */
  scheduledForDate?: string;
  createdAt: string;
  sentAt?: string;
}

export type SmsAcquisitionStatus =
  | "active"
  | "completed"
  | "paused"
  | "exhausted";

/**
 * Campagne d’acquisition multi-jours : budget SMS/jour jusqu’à 5/5 contacts acceptés.
 */
export interface SmsAcquisitionCampaign {
  id: string;
  workRequestId: string;
  status: SmsAcquisitionStatus;
  /** Snapshot du budget journalier au démarrage. */
  smsPerDay: number;
  totalSent: number;
  /** Jour Europe/Paris YYYY-MM-DD du dernier lot. */
  lastSendDate?: string;
  sentOnLastDate: number;
  trigger: SmsCampaignTrigger;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
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
  /**
   * Le particulier a déjà rappelé une fois cet artisan après refus/expiration.
   * Un seul rappel est autorisé.
   */
  clientRecallUsed?: boolean;
  recalledAt?: string;
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
  /**
   * Dernier SMS marketing campagne envoyé avec succès.
   * Si renseigné → plus jamais de SMS marketing (acquisition).
   */
  lastContactedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmsCampaignSettings {
  autoSendOnApprove: boolean;
  /** SMS marketing max par jour et par campagne d’acquisition. */
  smsPerDay: number;
  /**
   * Si true (défaut) : préparation la veille en `pending_review` (sans OVH).
   * Envoi réel seulement après validation admin, avec re-check 5/5.
   */
  requireReviewBeforeSend: boolean;
  /**
   * @deprecated Alias de smsPerDay (migration anciens stores).
   */
  defaultCampaignSize?: number;
  defaultMessageTemplate?: string;
  throttleMs: number;
}

export const DEFAULT_SMS_SETTINGS: SmsCampaignSettings = {
  autoSendOnApprove: false,
  smsPerDay: 5,
  defaultCampaignSize: 5,
  requireReviewBeforeSend: true,
  throttleMs: 150,
};

/**
 * Prix unitaire de référence : 1 crédit = 20 € = 1 mise en contact.
 * Les packs appliquent un tarif dégressif (voir CREDIT_PACKS).
 */
export const CREDIT_PRICE_EUR = 20;

export interface CreditPack {
  credits: number;
  /** Prix TTC du pack (tarif dégressif). */
  priceEur: number;
}

/** Packs à tarif dégressif (€ / crédit décroissant). */
export const CREDIT_PACKS: readonly CreditPack[] = [
  { credits: 1, priceEur: 20 }, // 20 € / crédit
  { credits: 3, priceEur: 54 }, // 18 € / crédit (−10 %)
  { credits: 5, priceEur: 85 }, // 17 € / crédit (−15 %)
  { credits: 10, priceEur: 150 }, // 15 € / crédit (−25 %)
] as const;

export type CreditPackSize = (typeof CREDIT_PACKS)[number]["credits"];

export function getCreditPack(credits: number): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.credits === credits);
}

export function creditPackUnitPriceEur(pack: CreditPack): number {
  return Math.round((pack.priceEur / pack.credits) * 100) / 100;
}

/** Crédits dépensés par le filleul avant récompense du parrain (1 mise en contact). */
export const REFERRAL_SPEND_THRESHOLD = 1;
/** Crédits offerts au parrain une fois le seuil atteint. */
export const REFERRAL_REWARD_CREDITS = 1;

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
  /** Montant payé en euros (achats Stripe). */
  amountEur?: number;
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

export type NotificationAudience = "client" | "pro";

export type NotificationKind =
  | "contact_interest"
  | "contact_accepted"
  | "contact_refused"
  | "contact_recalled"
  | "quote_submitted"
  | "quote_approved"
  | "quote_rejected"
  | "bid_placed"
  | "artisan_selected"
  | "request_approved"
  | "request_rejected";

/** Notification in-app (espace particulier ou pro). */
export interface AppNotification {
  id: string;
  audience: NotificationAudience;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  readAt?: string;
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
  phoneVerificationChallenges: PhoneVerificationChallenge[];
  guestPhoneVerifications?: GuestPhoneVerification[];
  smsCampaigns: SmsCampaign[];
  smsAcquisitionCampaigns?: SmsAcquisitionCampaign[];
  smsSettings?: SmsCampaignSettings;
  creditWallets: ProCreditWallet[];
  creditTransactions: ProCreditTransaction[];
  notifications: AppNotification[];
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
  phoneVerificationChallenges: [],
  guestPhoneVerifications: [],
  smsCampaigns: [],
  smsAcquisitionCampaigns: [],
  smsSettings: { ...DEFAULT_SMS_SETTINGS },
  creditWallets: [],
  creditTransactions: [],
  notifications: [],
};
