import type { TradeCategory } from "./data";
import type { QualificationLevel } from "./qualification-tiers";

export type AdminReviewStatus = "pending" | "approved" | "rejected";

/** Vérification de l'attestation décennale par corps de métier. */
export type DecennaleVerificationStatus =
  | "en_attente_verification"
  | "validé"
  | "non_couvert";

/** Vérification documents niveau 1 (RC pro, etc.). */
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

/** Snapshot BODACC (procédures collectives — API DILA, Licence Ouverte 2.0). */
export interface BodaccVerificationSnapshot {
  status: "clear" | "active_procedure" | "unavailable";
  checkedAt: string;
  hasActiveProcedure: boolean;
  nature?: string;
  dateParution?: string;
  announcementId?: string;
  url?: string;
  error?: string;
}

export type RgeCheckStatus = "verified" | "not_rge" | "expired" | "unavailable";

/** Qualification RGE active (ou récemment expirée) renvoyée par l’ADEME. */
export interface RgeQualification {
  domain: string;
  metaDomain?: string;
  qualificationName?: string;
  certificateName?: string;
  organism?: string;
  validFrom?: string;
  validUntil?: string;
  qualificationUrl?: string;
}

/** Snapshot RGE (annuaire ADEME, Licence Ouverte). */
export interface RgeVerificationSnapshot {
  status: RgeCheckStatus;
  checkedAt: string;
  siret: string;
  isRge: boolean;
  companyName?: string;
  domains?: string[];
  qualifications?: RgeQualification[];
  /** Plus proche date de fin parmi les qualifications encore valides. */
  validUntil?: string;
  error?: string;
}

export interface ProLevel1Audit {
  rcsVerifiedAt?: string;
  geoVerified: boolean;
  geoDepartment?: string;
  consistencyCheckedAt?: string;
  /** @deprecated Remplacé par ocrSuggest + revue manuelle admin. */
  autoValidatedAt?: string;
  /** Inscription / re-upload : OCR fait, validation humaine requise. */
  manualReviewRequired?: boolean;
  /** Suggestion OCR (ne certifie pas le compte). */
  ocrSuggest?: {
    wouldCertify: boolean;
    reasons: string[];
    suggestedAt: string;
  };
  globalIssues?: Level1ConsistencyIssue[];
  /** Contrôle BODACC (procédures collectives) à l'inscription / revalidation docs. */
  bodacc?: BodaccVerificationSnapshot;
  /** Contrôle RGE (annuaire ADEME open data) à l'inscription / synchro. */
  rge?: RgeVerificationSnapshot;
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
  /**
   * Type de garantie exigée pour ce corps de métier (politique plateforme).
   * Absent sur d’anciens comptes → traité comme décennale.
   */
  guaranteeType?: "decennale" | "biennale" | "none";
  /** Statut de vérification du document de garantie (décennale ou biennale) pour CE métier. */
  decennaleStatus?: DecennaleVerificationStatus;
  /** Document de garantie couvrant ce corps de métier (décennale ou biennale). */
  decennaleDocument?: ProTradeDocument;
  /** Indices OCR sur le document de garantie. */
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

/** @deprecated Ancien gate payant à l'achat de crédits — remplacé par BODACC à l'inscription. */
export const KBIS_VERIFICATION_FEE_EUR = 3;
/** @deprecated */
export const KBIS_VERIFICATION_FEE_CENTS = KBIS_VERIFICATION_FEE_EUR * 100;

export type KbisPurchaseVerificationStatus = "passed" | "failed" | "error";

export type KbisPurchaseProvider = "registry" | "mock" | "infogreffe";

/**
 * @deprecated Ancien contrôle à l'achat de crédits (frais 3 €).
 * La vérif passe désormais par registre + BODACC + PDF RC/décennale à l'inscription.
 */
export interface KbisPurchaseVerification {
  status: KbisPurchaseVerificationStatus;
  checkedAt: string;
  stripeSessionId: string;
  provider: KbisPurchaseProvider;
  feeRetainedCents: number;
  refundedCents?: number;
  stripeRefundId?: string;
  reason?: string;
  companyNameAtCheck?: string;
  bodacc?: BodaccVerificationSnapshot;
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
  /** Documents transmis à l'inscription (RC pro, etc.). */
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
  /** ID client société Pennylane (API v2). */
  pennylaneCustomerId?: number;
  /** Factures Pennylane liées aux achats Stripe (idempotence). */
  pennylaneInvoices?: PennylaneInvoiceRef[];
}

/** Référence facture Pennylane pour un Checkout Stripe. */
export interface PennylaneInvoiceRef {
  stripeSessionId: string;
  invoiceId: number;
  invoiceNumber?: string;
  createdAt: string;
}

export type ClientKind = "individual" | "company" | "copropriete";

/** Nature des travaux dans une copropriété (non identifiant). */
export type WorkScope = "privatif" | "commun";

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
  /**
   * Parties communes vs lot privatif — seulement si clientKind = copropriete.
   * Affichable publiquement (n’identifie pas l’immeuble).
   */
  workScope?: WorkScope;
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
  /**
   * Ticket de chantier (bas / moyen / élevé / premium) → prix de déblocage contact.
   * Absent sur l’historique = ticket élevé (20 €, ancien tarif unique).
   * Non affiché au particulier.
   */
  pricingTier?: "bas" | "moyen" | "eleve" | "premium";
  /** Prestation détaillée choisie (catalogue NAF), si renseignée. */
  workOptionId?: string;
  /** Description courte si prestation = « Autre ». */
  workOptionOtherDescription?: string;
  description: string;
  /** Prix de départ de l'enchère. Peut venir du client, d'un devis précédent,
   *  ou du premier devis Nord Artisan Pro validé. */
  startPrice?: number;
  /**
   * Comment le prix de départ est déterminé :
   * - client : montant fixé par le particulier
   * - first_quote : fixé au premier devis Nord Artisan Pro validé
   * - unspecified : non précisé (équivalent pratique au 1er devis)
   */
  startPriceMode?: "client" | "first_quote" | "unspecified";
  /** Renseigné lorsque le prix de départ provient d'un devis Nord Artisan Pro validé. */
  startPriceQuoteId?: string;
  /** Durée d'annonce / mise en contact en heures. */
  auctionDurationHours: number;
  /**
   * @deprecated Legacy jours — migré vers auctionDurationHours (×24).
   */
  auctionDurationDays?: number;
  /**
   * Nombre max d’artisans autorisés à débloquer le contact (choix client, 1–5).
   * undefined (historique) = 5.
   */
  maxContactArtisans?: number;
  /**
   * Ancienneté d'entreprise exigée pour les contacts / SMS :
   * - true : uniquement 5+ (≥ 5 ans)
   * - false : uniquement 0 à 5 ans (&lt; 5 ans) — anciennes demandes
   * - undefined : indifférent (pas de filtre d'âge)
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
   * true = uniquement des artisans RGE (annuaire ADEME).
   * undefined / false = pas de filtre RGE.
   */
  requireRge?: boolean;
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
  /** Retrait volontaire de l’annonce (masquée du site public, toujours consultable en admin). */
  unpublishedAt?: string;
  /** Note interne admin (non visible client / artisans). */
  adminNote?: string;
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
 * Campagne d’acquisition : quota 5 SMS × artisans demandés, jusqu’aux places remplies.
 */
export interface SmsAcquisitionCampaign {
  id: string;
  workRequestId: string;
  status: SmsAcquisitionStatus;
  /** Snapshot du quota total (5 × artisans) au démarrage. Ancien nom conservé. */
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
  /**
   * Ancien budget SMS/jour. Le volume réel est 5 × artisans choisis.
   * Conservé pour compat lecture des anciens stores.
   */
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
 * @deprecated Packs de solde retirés — paiement unitaire au déblocage.
 * Conservé vide pour compat. lecture d’anciennes sessions / code legacy.
 */
export const CONTACT_UNLOCK_REF_EUR = 20;

export interface ContactBalancePack {
  /** Solde crédité en euros. */
  creditEur: number;
  /** Prix TTC payé (Stripe). */
  payEur: number;
}

/** @deprecated Plus de packs à l’achat. */
export const CONTACT_BALANCE_PACKS: readonly ContactBalancePack[] = [] as const;

export type ContactBalancePackSize = number;
export function getContactBalancePack(
  creditEur: number
): ContactBalancePack | undefined {
  return CONTACT_BALANCE_PACKS.find((p) => p.creditEur === creditEur);
}

export function contactBalancePackDiscountPercent(
  pack: ContactBalancePack
): number {
  if (pack.creditEur <= 0) return 0;
  return Math.round((1 - pack.payEur / pack.creditEur) * 100);
}

/** @deprecated Alias — préférer CONTACT_UNLOCK_REF_EUR. */
export const CREDIT_PRICE_EUR = CONTACT_UNLOCK_REF_EUR;
/** @deprecated Alias packs crédits → solde. */
export type CreditPack = { credits: number; priceEur: number };
/** @deprecated */
export const CREDIT_PACKS = CONTACT_BALANCE_PACKS.map((p) => ({
  credits: p.creditEur,
  priceEur: p.payEur,
})) as readonly CreditPack[];
/** @deprecated */
export type CreditPackSize = ContactBalancePackSize;
/** @deprecated */
export function getCreditPack(credits: number): CreditPack | undefined {
  const pack = getContactBalancePack(credits);
  return pack
    ? { credits: pack.creditEur, priceEur: pack.payEur }
    : undefined;
}
/** @deprecated */
export function creditPackUnitPriceEur(pack: {
  credits?: number;
  priceEur: number;
  creditEur?: number;
  payEur?: number;
}): number {
  const credit = pack.creditEur ?? pack.credits ?? 1;
  const pay = pack.payEur ?? pack.priceEur;
  return Math.round((pay / credit) * 100) / 100;
}

/** € dépensés par le filleul avant récompense du parrain. */
export const REFERRAL_SPEND_THRESHOLD = 20;
/** € offerts au parrain une fois le seuil atteint. */
export const REFERRAL_REWARD_EUR = 20;
/** @deprecated Alias. */
export const REFERRAL_REWARD_CREDITS = REFERRAL_REWARD_EUR;

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
  /** Delta en euros (+achat, −dépense). */
  amount: number;
  balanceAfter: number;
  /** Montant payé en euros (achats Stripe). */
  amountEur?: number;
  auctionId?: string;
  workRequestId?: string;
  stripeSessionId?: string;
  /** Facture Pennylane associée (achats solde). */
  pennylaneInvoiceId?: number;
  pennylaneInvoiceNumber?: string;
  note?: string;
  createdAt: string;
}

export interface ProCreditWallet {
  proId: string;
  /** Solde en euros. */
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
  /** Une fois migré, les soldes/transactions sont en euros. */
  walletCurrency?: "eur" | "credits";
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
  walletCurrency: "eur",
};
