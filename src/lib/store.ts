import { promises as fs } from "fs";
import path from "path";
import { hashPassword, verifyPassword, validatePassword } from "./password";
import { randomBytes } from "crypto";
import { computeCurrentPrice, MAX_BIDS_PER_AUCTION } from "./auctions";
import {
  isAcceptSlotsFull,
  isSmsContactAlertsEnabled,
  resolveMaxContactArtisans,
} from "./contact-slots";
import {
  generateReferralCode,
  isValidReferralCodeFormat,
  normalizeReferralCode,
  REFERRAL_ENABLED,
} from "./referral";
import { createShareToken } from "./share";
import { formatWorkRequestAddress } from "./client-address";
import { getClientContact } from "./client-contacts";
import { formatFrenchPhoneDisplay } from "./phone-format";
import { getSampleQuotesForAuction } from "./sample-quotes";
import { getValidatedDecennaleLabelsForWorkCategory } from "./decennale-verification";
import { getNafCodesForCategory } from "./naf-codes";
import {
  CLIENT_GHOST_BLACKLIST_THRESHOLD,
  evaluateUnlockClaimWindow,
  monthKeyParis,
  UNLOCK_CLAIM_REASON_DEFAULT,
  UNLOCK_REFUND_MONTHLY_CAP,
} from "./unlock-refund";
import {
  DEFAULT_SMS_SETTINGS,
  EMPTY_STORE,
  REFERRAL_REWARD_CREDITS,
  REFERRAL_SPEND_THRESHOLD,
  type AppNotification,
  type ArtisanProspect,
  type Bid,
  type ClientAccount,
  type ClientKind,
  type ContactRequest,
  type ContactUnlock,
  type CreditTxnType,
  type DataStore,
  type DecennaleVerificationStatus,
  type DocumentVerificationStatus,
  type EmailVerificationToken,
  type NotificationAudience,
  type NotificationKind,
  type ProCreditTransaction,
  type ProCreditWallet,
  type ProQuote,
  type PasswordResetToken,
  type PasswordResetUserType,
  type GuestPhoneVerification,
  type PhoneVerificationChallenge,
  type ProDocument,
  type ProRegistration,
  type SmsAcquisitionCampaign,
  type SmsAcquisitionStatus,
  type SmsCampaign,
  type SmsCampaignSettings,
  type SmsCampaignTrigger,
  type WorkRequest,
} from "./store-types";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

/** Anciennes demandes stockées avec `budget` avant migration vers startPrice. */
type LegacyWorkRequest = WorkRequest & { budget?: number };

function normalizeWorkRequest(request: LegacyWorkRequest): WorkRequest {
  const { budget, ...rest } = request;
  const hours =
    typeof rest.auctionDurationHours === "number" &&
    rest.auctionDurationHours > 0
      ? Math.floor(rest.auctionDurationHours)
      : typeof rest.auctionDurationDays === "number" &&
          rest.auctionDurationDays > 0
        ? Math.floor(rest.auctionDurationDays) * 24
        : 720;
  return {
    ...rest,
    startPrice: rest.startPrice ?? budget,
    auctionDurationHours: hours,
    auctionDurationDays:
      rest.auctionDurationDays ?? Math.max(1, Math.round(hours / 24)),
  };
}

const LEGACY_CREDIT_TO_EUR = 20;

function migrateWalletToEuros(store: DataStore): boolean {
  if (store.walletCurrency === "eur") return false;
  for (const wallet of store.creditWallets) {
    wallet.balance = Math.round(wallet.balance * LEGACY_CREDIT_TO_EUR * 1000) / 1000;
  }
  for (const txn of store.creditTransactions) {
    txn.amount = Math.round(txn.amount * LEGACY_CREDIT_TO_EUR * 1000) / 1000;
    txn.balanceAfter =
      Math.round(txn.balanceAfter * LEGACY_CREDIT_TO_EUR * 1000) / 1000;
  }
  store.walletCurrency = "eur";
  return true;
}

async function ensureStore(): Promise<void> {
  const dir = path.dirname(STORE_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf-8");
  }
}

export async function readStore(): Promise<DataStore> {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as Partial<DataStore>;
  const store: DataStore = {
    ...EMPTY_STORE,
    ...parsed,
    clientAccounts: parsed.clientAccounts ?? [],
    proRegistrations: parsed.proRegistrations ?? [],
    workRequests: (parsed.workRequests ?? []).map((r) =>
      normalizeWorkRequest(r as LegacyWorkRequest)
    ),
    contactUnlocks: parsed.contactUnlocks ?? [],
    contactRequests: parsed.contactRequests ?? [],
    artisanProspects: parsed.artisanProspects ?? [],
    bids: parsed.bids ?? [],
    proQuotes: parsed.proQuotes ?? [],
    passwordResetTokens: parsed.passwordResetTokens ?? [],
    emailVerificationTokens: parsed.emailVerificationTokens ?? [],
    phoneVerificationChallenges: parsed.phoneVerificationChallenges ?? [],
    guestPhoneVerifications: parsed.guestPhoneVerifications ?? [],
    smsCampaigns: parsed.smsCampaigns ?? [],
    smsAcquisitionCampaigns: parsed.smsAcquisitionCampaigns ?? [],
    smsSettings: normalizeSmsSettings(parsed.smsSettings),
    creditWallets: parsed.creditWallets ?? [],
    creditTransactions: parsed.creditTransactions ?? [],
    notifications: parsed.notifications ?? [],
    walletCurrency: parsed.walletCurrency,
  };
  if (migrateWalletToEuros(store)) {
    await writeStore(store);
  }
  return store;
}

function normalizeSmsSettings(
  raw?: Partial<SmsCampaignSettings> | null
): SmsCampaignSettings {
  const merged = { ...DEFAULT_SMS_SETTINGS, ...(raw ?? {}) };
  const smsPerDay = Math.max(
    1,
    Math.min(
      200,
      Math.floor(
        merged.smsPerDay ??
          merged.defaultCampaignSize ??
          DEFAULT_SMS_SETTINGS.smsPerDay
      )
    )
  );
  return {
    ...merged,
    smsPerDay,
    defaultCampaignSize: smsPerDay,
    requireReviewBeforeSend: merged.requireReviewBeforeSend !== false,
  };
}

/** Jour civil Europe/Paris au format YYYY-MM-DD. */
export function parisDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Prochain jour marketing lun–sam (Europe/Paris), en général demain. */
export function parisNextMarketingDayKey(from = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(from);

  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  // Midi UTC évite les bascules DST quand on itère les jours.
  const cursor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  for (let i = 0; i < 8; i++) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const wd = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris",
      weekday: "short",
    }).format(cursor);
    if (wd !== "Sun") {
      return parisDayKey(cursor);
    }
  }
  return parisDayKey(cursor);
}

async function writeStore(store: DataStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function addProRegistration(
  data: Omit<ProRegistration, "id" | "status" | "createdAt">
): Promise<ProRegistration> {
  const store = await readStore();
  const emailTaken = store.proRegistrations.some(
    (p) =>
      p.email.toLowerCase() === data.email.toLowerCase() &&
      p.status !== "rejected"
  );
  if (emailTaken) {
    throw new Error("EMAIL_ALREADY_USED");
  }

  const entry: ProRegistration = {
    ...data,
    id: newId("pro"),
    status: "pending",
    emailVerified: data.emailVerified ?? false,
    createdAt: new Date().toISOString(),
  };
  store.proRegistrations.unshift(entry);
  await writeStore(store);
  return entry;
}

export async function setProRegistrationDocuments(
  id: string,
  documents: ProDocument[]
): Promise<ProRegistration | null> {
  const store = await readStore();
  const index = store.proRegistrations.findIndex((p) => p.id === id);
  if (index === -1) return null;
  store.proRegistrations[index].documents = documents;
  await writeStore(store);
  return store.proRegistrations[index];
}

export async function setProTradeSelections(
  id: string,
  tradeSelections: ProRegistration["tradeSelections"]
): Promise<ProRegistration | null> {
  const store = await readStore();
  const index = store.proRegistrations.findIndex((p) => p.id === id);
  if (index === -1) return null;
  store.proRegistrations[index].tradeSelections = tradeSelections;
  if (tradeSelections?.[0]) {
    const primary = tradeSelections[0];
    store.proRegistrations[index].tradeGroupId = primary.tradeGroupId;
    store.proRegistrations[index].tradeGroupLabel = primary.tradeGroupLabel;
    store.proRegistrations[index].qualibatJobId = primary.qualibatJobId;
    store.proRegistrations[index].qualibatJobLabel = primary.qualibatJobLabel;
    store.proRegistrations[index].category = primary.category;
  }
  await writeStore(store);
  return store.proRegistrations[index];
}

export async function updateProTradeDecennaleStatus(
  proId: string,
  tradeGroupId: string,
  decennaleStatus: DecennaleVerificationStatus
): Promise<ProRegistration | null> {
  const store = await readStore();
  const index = store.proRegistrations.findIndex((p) => p.id === proId);
  if (index === -1) return null;

  const pro = store.proRegistrations[index];
  const selections = pro.tradeSelections ?? [];
  const selIndex = selections.findIndex((s) => s.tradeGroupId === tradeGroupId);
  if (selIndex === -1) return null;

  selections[selIndex] = { ...selections[selIndex], decennaleStatus };
  store.proRegistrations[index].tradeSelections = selections;
  await writeStore(store);
  return store.proRegistrations[index];
}

export async function updateProDocumentVerificationStatus(
  proId: string,
  documentId: string,
  verificationStatus: Extract<DocumentVerificationStatus, "validé" | "rejeté">
): Promise<ProRegistration | null> {
  const store = await readStore();
  const index = store.proRegistrations.findIndex((p) => p.id === proId);
  if (index === -1) return null;

  const pro = store.proRegistrations[index];
  const documents = pro.documents ?? [];
  const docIndex = documents.findIndex((d) => d.id === documentId);
  if (docIndex === -1) return null;

  documents[docIndex] = { ...documents[docIndex], verificationStatus };
  store.proRegistrations[index].documents = documents;
  await writeStore(store);
  return store.proRegistrations[index];
}

export async function updateProLevel1Audit(
  proId: string,
  patch: Partial<NonNullable<ProRegistration["level1Audit"]>>
): Promise<ProRegistration | null> {
  const store = await readStore();
  const index = store.proRegistrations.findIndex((p) => p.id === proId);
  if (index === -1) return null;

  store.proRegistrations[index].level1Audit = {
    geoVerified: false,
    ...store.proRegistrations[index].level1Audit,
    ...patch,
  };
  await writeStore(store);
  return store.proRegistrations[index];
}

export async function addWorkRequest(
  data: Omit<WorkRequest, "id" | "status" | "createdAt">
): Promise<WorkRequest> {
  const store = await readStore();
  const nafCodes =
    data.nafCodes && data.nafCodes.length > 0
      ? [...new Set(data.nafCodes.map((c) => c.trim().toUpperCase()).filter(Boolean))]
      : getNafCodesForCategory(data.category);
  const entry: WorkRequest = {
    ...data,
    photos: data.photos ?? [],
    nafCodes,
    id: newId("req"),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  store.workRequests.unshift(entry);
  await writeStore(store);
  return entry;
}

export { resolveWorkRequestNafCodes } from "./naf-codes";

/** Persiste les NAF manquants sur les annonces existantes (dérivés de la catégorie). */
export async function ensureWorkRequestNafCodes(
  id: string
): Promise<WorkRequest | null> {
  const store = await readStore();
  const index = store.workRequests.findIndex((r) => r.id === id);
  if (index === -1) return null;
  const current = store.workRequests[index];
  if (current.nafCodes && current.nafCodes.length > 0) return current;
  const nafCodes = getNafCodesForCategory(current.category);
  store.workRequests[index] = { ...current, nafCodes };
  await writeStore(store);
  return store.workRequests[index];
}

export async function backfillWorkRequestNafCodes(): Promise<number> {
  const store = await readStore();
  let n = 0;
  for (let i = 0; i < store.workRequests.length; i++) {
    const r = store.workRequests[i];
    if (r.nafCodes && r.nafCodes.length > 0) continue;
    store.workRequests[i] = {
      ...r,
      nafCodes: getNafCodesForCategory(r.category),
    };
    n += 1;
  }
  if (n > 0) await writeStore(store);
  return n;
}

export async function setWorkRequestPhotos(
  id: string,
  photos: string[]
): Promise<WorkRequest | null> {
  const store = await readStore();
  const index = store.workRequests.findIndex((r) => r.id === id);
  if (index === -1) return null;
  store.workRequests[index].photos = photos;
  await writeStore(store);
  return store.workRequests[index];
}

export async function setWorkRequestPreviousQuote(
  id: string,
  data: Pick<WorkRequest, "previousQuoteAmount" | "previousQuoteProofUrl" | "previousQuoteNote">
): Promise<WorkRequest | null> {
  const store = await readStore();
  const index = store.workRequests.findIndex((r) => r.id === id);
  if (index === -1) return null;
  store.workRequests[index] = {
    ...store.workRequests[index],
    ...data,
  };
  await writeStore(store);
  return store.workRequests[index];
}

export async function updateProRegistration(
  id: string,
  patch: Partial<
    Pick<
      ProRegistration,
      | "status"
      | "adminNote"
      | "reviewedAt"
      | "qualificationLevel"
      | "level1CertifiedAt"
      | "documents"
      | "tradeSelections"
      | "level1Audit"
      | "legalRepresentatives"
      | "paymentNameCheck"
      | "kbisPurchaseVerification"
    >
  >
): Promise<ProRegistration | null> {
  const store = await readStore();
  const index = store.proRegistrations.findIndex((p) => p.id === id);
  if (index === -1) return null;
  const next = {
    ...store.proRegistrations[index],
    ...patch,
  };
  // Ne pas écraser reviewedAt pour un simple patch (ex. contrôle nom CB).
  if (patch.reviewedAt !== undefined) {
    next.reviewedAt = patch.reviewedAt;
  } else if (patch.status !== undefined) {
    next.reviewedAt = new Date().toISOString();
  }
  store.proRegistrations[index] = next;
  await writeStore(store);
  return store.proRegistrations[index];
}

/**
 * Fraude / non-conformité : retire la certification (niveau 0).
 * Conserve les documents sur disque comme preuves, bloque la connexion.
 */
export async function demoteProToLevelZero(
  proId: string,
  adminNote?: string
): Promise<ProRegistration | null> {
  const store = await readStore();
  const index = store.proRegistrations.findIndex((p) => p.id === proId);
  if (index === -1) return null;

  const pro = store.proRegistrations[index];
  const now = new Date().toISOString();
  const note =
    adminNote?.trim() ||
    "Fraude ou documents non conformes — renvoyé au niveau 0.";

  pro.status = "rejected";
  pro.adminNote = note;
  pro.reviewedAt = now;
  delete pro.level1CertifiedAt;
  pro.qualificationLevel = 0;

  pro.documents = (pro.documents ?? []).map((doc) => ({
    ...doc,
    verificationStatus: "rejeté" as const,
  }));

  pro.tradeSelections = (pro.tradeSelections ?? []).map((selection) => ({
    ...selection,
    decennaleStatus: "non_couvert" as const,
  }));

  if (pro.level1Audit) {
    pro.level1Audit = {
      ...pro.level1Audit,
      globalIssues: [
        ...(pro.level1Audit.globalIssues ?? []),
        {
          field: "admin",
          message: note,
          severity: "error",
        },
      ],
    };
  }

  store.proRegistrations[index] = pro;
  await writeStore(store);
  return pro;
}

export async function updateWorkRequest(
  id: string,
  patch: Partial<
    Pick<
      WorkRequest,
      | "status"
      | "reviewedAt"
      | "auctionId"
      | "auctionEndsAt"
      | "selectedBidId"
      | "clientId"
      | "shareToken"
      | "startPrice"
      | "startPriceQuoteId"
      | "nafCodes"
    >
  >
): Promise<WorkRequest | null> {
  const store = await readStore();
  const index = store.workRequests.findIndex((r) => r.id === id);
  if (index === -1) return null;
  store.workRequests[index] = {
    ...store.workRequests[index],
    ...patch,
    reviewedAt: patch.reviewedAt ?? new Date().toISOString(),
  };
  await writeStore(store);
  return store.workRequests[index];
}

export async function getAdminStats() {
  const store = await readStore();
  const pendingPros = store.proRegistrations.filter((p) => p.status === "pending").length;
  const pendingRequests = store.workRequests.filter((r) => r.status === "pending").length;
  const approvedPros = store.proRegistrations.filter((p) => p.status === "approved").length;
  const pendingQuotes = store.proQuotes.filter((q) => q.status === "pending_moderation").length;
  const totalUnlocks = store.contactUnlocks.filter((u) => !u.refundedAt).length;

  return {
    pendingPros,
    pendingRequests,
    pendingQuotes,
    approvedPros,
    totalPros: store.proRegistrations.length,
    totalClients: store.clientAccounts.length,
    totalRequests: store.workRequests.length,
    totalUnlocks,
  };
}

export async function getApprovedProByEmail(
  email: string
): Promise<ProRegistration | null> {
  const store = await readStore();
  return (
    store.proRegistrations.find(
      (p) =>
        p.status === "approved" &&
        p.email.toLowerCase() === email.toLowerCase()
    ) ?? null
  );
}

/** Connexion pro : compte approuvé ou en attente de validation docs (pas niveau 0). */
export async function getLoginEligibleProByEmail(
  email: string
): Promise<ProRegistration | null> {
  const store = await readStore();
  return (
    store.proRegistrations.find(
      (p) =>
        (p.status === "approved" || p.status === "pending") &&
        p.email.toLowerCase() === email.toLowerCase()
    ) ?? null
  );
}

export async function authenticatePro(
  email: string,
  password: string
): Promise<ProRegistration | null> {
  const pro = await getLoginEligibleProByEmail(email);
  if (!pro?.passwordHash) return null;
  if (!verifyPassword(password, pro.passwordHash)) return null;
  return pro;
}

export async function hasContactUnlock(
  proId: string,
  auctionId: string
): Promise<boolean> {
  const store = await readStore();
  return store.contactUnlocks.some(
    (u) => u.proId === proId && u.auctionId === auctionId
  );
}

/** Places de contact occupées = unlocks non recrédités. */
export async function countContactUnlocksForAuction(
  auctionId: string
): Promise<number> {
  const store = await readStore();
  const pros = new Set<string>();
  for (const u of store.contactUnlocks) {
    if (u.auctionId === auctionId && !u.refundedAt) {
      pros.add(u.proId);
    }
  }
  return pros.size;
}

export async function listContactUnlocksForAuction(
  auctionId: string
): Promise<
  Array<
    ContactUnlock & {
      companyName: string;
      proEmail: string;
    }
  >
> {
  const store = await readStore();
  return store.contactUnlocks
    .filter((u) => u.auctionId === auctionId)
    .map((u) => {
      const pro = store.proRegistrations.find((p) => p.id === u.proId);
      return {
        ...u,
        companyName: pro?.companyName ?? u.proId,
        proEmail: pro?.email ?? "",
      };
    })
    .sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
    );
}

export async function getContactUnlock(
  proId: string,
  auctionId: string
): Promise<ContactUnlock | null> {
  const store = await readStore();
  return (
    store.contactUnlocks.find(
      (u) => u.proId === proId && u.auctionId === auctionId
    ) ?? null
  );
}

export async function getContactUnlockById(
  id: string
): Promise<ContactUnlock | null> {
  const store = await readStore();
  return store.contactUnlocks.find((u) => u.id === id) ?? null;
}

export async function addContactUnlock(data: {
  proId: string;
  auctionId: string;
  amountEur: number;
  workRequestId?: string;
  stripeSessionId?: string;
}): Promise<ContactUnlock | { error: string }> {
  const store = await readStore();
  const existing = store.contactUnlocks.find(
    (u) => u.proId === data.proId && u.auctionId === data.auctionId
  );
  if (existing) return existing;

  const occupied = new Set<string>();
  for (const u of store.contactUnlocks) {
    if (u.auctionId === data.auctionId && !u.refundedAt) {
      occupied.add(u.proId);
    }
  }
  const workRequest =
    (data.workRequestId
      ? store.workRequests.find((w) => w.id === data.workRequestId)
      : undefined) ??
    store.workRequests.find((w) => w.auctionId === data.auctionId);
  const maxSlots = resolveMaxContactArtisans(workRequest);
  if (isAcceptSlotsFull(occupied.size, maxSlots)) {
    return {
      error: `Les ${maxSlots} places de contact sont déjà prises pour cette demande.`,
    };
  }

  const entry: ContactUnlock = {
    id: newId("unlock"),
    ...data,
    paidAt: new Date().toISOString(),
    claimStatus: "none",
  };
  store.contactUnlocks.push(entry);
  await writeStore(store);
  return entry;
}

function findClientForWorkRequestInStore(
  store: DataStore,
  workRequest: WorkRequest | undefined
): ClientAccount | null {
  if (!workRequest) return null;
  if (workRequest.clientId) {
    return store.clientAccounts.find((c) => c.id === workRequest.clientId) ?? null;
  }
  const email = workRequest.email.toLowerCase();
  return (
    store.clientAccounts.find((c) => c.email.toLowerCase() === email) ?? null
  );
}

function countApprovedUnlockRefundsInMonth(
  store: DataStore,
  proId: string,
  monthKey: string
): number {
  return store.contactUnlocks.filter((u) => {
    if (u.proId !== proId) return false;
    if (u.claimStatus !== "approved" || !u.refundedAt) return false;
    return monthKeyParis(new Date(u.refundedAt)) === monthKey;
  }).length;
}

function hasSpendUnlockForAuction(
  store: DataStore,
  proId: string,
  auctionId: string
): boolean {
  return store.creditTransactions.some(
    (t) =>
      t.proId === proId &&
      t.auctionId === auctionId &&
      t.type === "spend_unlock" &&
      t.amount < 0
  );
}

async function applyUnlockRefundInStore(
  store: DataStore,
  unlock: ContactUnlock,
  note: string
): Promise<
  { balance: number; transaction: ProCreditTransaction } | { error: string }
> {
  if (unlock.refundedAt) {
    return { error: "Ce contact a déjà été recrédité." };
  }
  if (!hasSpendUnlockForAuction(store, unlock.proId, unlock.auctionId)) {
    return {
      error:
        "Aucun crédit dépensé pour ce déblocage (mode démo ou déjà régularisé).",
    };
  }

  const refundCredits = Math.max(1, Math.round(unlock.amountEur || 1));
  const credit = await applyCreditDelta(store, {
    proId: unlock.proId,
    type: "refund_unlock",
    amount: refundCredits,
    auctionId: unlock.auctionId,
    workRequestId: unlock.workRequestId,
    note,
  });
  if ("error" in credit) return credit;

  unlock.refundedAt = new Date().toISOString();
  unlock.refundTxnId = credit.transaction.id;
  unlock.claimStatus = "approved";
  unlock.claimResolvedAt = unlock.refundedAt;
  return credit;
}

function bumpClientGhostReputationInStore(
  store: DataStore,
  client: ClientAccount | null
): { ghostClaimsUpheld: number; blocked: boolean } {
  if (!client) return { ghostClaimsUpheld: 0, blocked: false };
  const next = (client.ghostClaimsUpheld ?? 0) + 1;
  client.ghostClaimsUpheld = next;
  if (next >= CLIENT_GHOST_BLACKLIST_THRESHOLD && !client.blockedFromContact) {
    client.blockedFromContact = true;
    client.blockedAt = new Date().toISOString();
    client.adminNote = [
      client.adminNote,
      `Blacklist contact auto — ${next} signalements « client injoignable » validés.`,
    ]
      .filter(Boolean)
      .join("\n");
  }
  return {
    ghostClaimsUpheld: next,
    blocked: Boolean(client.blockedFromContact),
  };
}

export type UnlockClaimView = {
  unlock: ContactUnlock;
  canClaim: boolean;
  claimBlockedReason?: string;
  autoEligible: boolean;
  /** @deprecated Devis plateforme retiré — toujours false. */
  hasQuote: boolean;
};

export async function getUnlockClaimViewForPro(
  proId: string,
  auctionId: string
): Promise<UnlockClaimView | null> {
  const store = await readStore();
  const unlock = store.contactUnlocks.find(
    (u) => u.proId === proId && u.auctionId === auctionId
  );
  if (!unlock) return null;

  const hasQuote = false;
  const status = unlock.claimStatus ?? "none";

  if (unlock.refundedAt || status === "approved") {
    return {
      unlock,
      canClaim: false,
      claimBlockedReason: "Crédits déjà recrédités pour ce contact.",
      autoEligible: false,
      hasQuote,
    };
  }
  if (status === "pending") {
    return {
      unlock,
      canClaim: false,
      claimBlockedReason: "Signalement en cours d’examen.",
      autoEligible: false,
      hasQuote,
    };
  }
  if (status === "rejected") {
    return {
      unlock,
      canClaim: false,
      claimBlockedReason: "Signalement refusé.",
      autoEligible: false,
      hasQuote,
    };
  }
  if (!hasSpendUnlockForAuction(store, proId, auctionId)) {
    return {
      unlock,
      canClaim: false,
      claimBlockedReason: "Aucun crédit dépensé pour ce déblocage.",
      autoEligible: false,
      hasQuote,
    };
  }

  const window = evaluateUnlockClaimWindow(unlock.paidAt);
  if (!window.ok) {
    return {
      unlock,
      canClaim: false,
      claimBlockedReason: window.reason,
      autoEligible: false,
      hasQuote,
    };
  }

  const monthCount = countApprovedUnlockRefundsInMonth(
    store,
    proId,
    monthKeyParis()
  );
  const autoEligible = monthCount < UNLOCK_REFUND_MONTHLY_CAP;

  return {
    unlock,
    canClaim: true,
    autoEligible,
    hasQuote,
  };
}

export async function claimUnlockRefund(data: {
  proId: string;
  auctionId: string;
  reason?: string;
}): Promise<
  | {
      unlock: ContactUnlock;
      autoApproved: boolean;
      balance?: number;
      ghostClaimsUpheld?: number;
      clientBlocked?: boolean;
    }
  | { error: string }
> {
  const store = await readStore();
  const unlock = store.contactUnlocks.find(
    (u) => u.proId === data.proId && u.auctionId === data.auctionId
  );
  if (!unlock) return { error: "Déblocage introuvable." };

  const status = unlock.claimStatus ?? "none";
  if (unlock.refundedAt || status === "approved") {
    return { error: "Crédits déjà recrédités pour ce contact." };
  }
  if (status === "pending") {
    return { error: "Un signalement est déjà en cours d’examen." };
  }
  if (status === "rejected") {
    return { error: "Ce signalement a déjà été refusé." };
  }
  if (!hasSpendUnlockForAuction(store, data.proId, data.auctionId)) {
    return {
      error: "Aucun crédit dépensé pour ce déblocage (mode démo).",
    };
  }

  const window = evaluateUnlockClaimWindow(unlock.paidAt);
  if (!window.ok) return { error: window.reason };

  const monthCount = countApprovedUnlockRefundsInMonth(
    store,
    data.proId,
    monthKeyParis()
  );
  const autoApprove = monthCount < UNLOCK_REFUND_MONTHLY_CAP;
  const reason =
    data.reason?.trim() || UNLOCK_CLAIM_REASON_DEFAULT;

  unlock.claimedAt = new Date().toISOString();
  unlock.claimReason = reason;

  if (!autoApprove) {
    unlock.claimStatus = "pending";
    await writeStore(store);
    return { unlock, autoApproved: false };
  }

  const refunded = await applyUnlockRefundInStore(
    store,
    unlock,
    `Recrédit anti-churn — ${reason}`
  );
  if ("error" in refunded) return refunded;

  const workRequest =
    (unlock.workRequestId
      ? store.workRequests.find((w) => w.id === unlock.workRequestId)
      : undefined) ??
    store.workRequests.find((w) => w.auctionId === unlock.auctionId);
  const client = findClientForWorkRequestInStore(store, workRequest);
  const reputation = bumpClientGhostReputationInStore(store, client);

  await writeStore(store);
  return {
    unlock,
    autoApproved: true,
    balance: refunded.balance,
    ghostClaimsUpheld: reputation.ghostClaimsUpheld,
    clientBlocked: reputation.blocked,
  };
}

export async function listPendingUnlockClaims(): Promise<
  Array<{
    unlock: ContactUnlock;
    proCompanyName: string;
    proEmail: string;
    clientLabel: string;
    clientId?: string;
    category?: string;
    city?: string;
    hasQuote: boolean;
  }>
> {
  const store = await readStore();
  const pending = store.contactUnlocks
    .filter((u) => (u.claimStatus ?? "none") === "pending")
    .sort(
      (a, b) =>
        new Date(b.claimedAt ?? b.paidAt).getTime() -
        new Date(a.claimedAt ?? a.paidAt).getTime()
    );

  return pending.map((unlock) => {
    const pro = store.proRegistrations.find((p) => p.id === unlock.proId);
    const workRequest =
      (unlock.workRequestId
        ? store.workRequests.find((w) => w.id === unlock.workRequestId)
        : undefined) ??
      store.workRequests.find((w) => w.auctionId === unlock.auctionId);
    const client = findClientForWorkRequestInStore(store, workRequest);
    const clientLabel = workRequest
      ? `${workRequest.firstName} ${workRequest.lastName}`.trim()
      : "Client inconnu";
    return {
      unlock,
      proCompanyName: pro?.companyName ?? unlock.proId,
      proEmail: pro?.email ?? "",
      clientLabel,
      clientId: client?.id,
      category: workRequest?.category,
      city: workRequest?.city,
      hasQuote: false,
    };
  });
}

export async function resolveUnlockClaim(data: {
  unlockId: string;
  decision: "approved" | "rejected";
  adminNote?: string;
}): Promise<
  | {
      unlock: ContactUnlock;
      balance?: number;
      ghostClaimsUpheld?: number;
      clientBlocked?: boolean;
    }
  | { error: string }
> {
  const store = await readStore();
  const unlock = store.contactUnlocks.find((u) => u.id === data.unlockId);
  if (!unlock) return { error: "Signalement introuvable." };
  if ((unlock.claimStatus ?? "none") !== "pending") {
    return { error: "Ce signalement n’est pas en attente." };
  }

  if (data.decision === "rejected") {
    unlock.claimStatus = "rejected";
    unlock.claimResolvedAt = new Date().toISOString();
    if (data.adminNote?.trim()) {
      unlock.claimReason = [
        unlock.claimReason,
        `Admin: ${data.adminNote.trim()}`,
      ]
        .filter(Boolean)
        .join(" — ");
    }
    await writeStore(store);
    return { unlock };
  }

  const refunded = await applyUnlockRefundInStore(
    store,
    unlock,
    data.adminNote?.trim()
      ? `Recrédit anti-churn (admin) — ${data.adminNote.trim()}`
      : `Recrédit anti-churn — ${unlock.claimReason ?? UNLOCK_CLAIM_REASON_DEFAULT}`
  );
  if ("error" in refunded) return refunded;

  const workRequest =
    (unlock.workRequestId
      ? store.workRequests.find((w) => w.id === unlock.workRequestId)
      : undefined) ??
    store.workRequests.find((w) => w.auctionId === unlock.auctionId);
  const client = findClientForWorkRequestInStore(store, workRequest);
  const reputation = bumpClientGhostReputationInStore(store, client);

  await writeStore(store);
  return {
    unlock,
    balance: refunded.balance,
    ghostClaimsUpheld: reputation.ghostClaimsUpheld,
    clientBlocked: reputation.blocked,
  };
}

export async function setClientContactBlock(data: {
  clientId: string;
  blocked: boolean;
  adminNote?: string;
}): Promise<ClientAccount | { error: string }> {
  const store = await readStore();
  const client = store.clientAccounts.find((c) => c.id === data.clientId);
  if (!client) return { error: "Compte client introuvable." };

  client.blockedFromContact = data.blocked;
  client.blockedAt = data.blocked ? new Date().toISOString() : undefined;
  if (data.adminNote?.trim()) {
    client.adminNote = [
      client.adminNote,
      data.adminNote.trim(),
    ]
      .filter(Boolean)
      .join("\n");
  }
  await writeStore(store);
  return client;
}

/**
 * Suppression admin d'un compte client : retire le compte, anonymise les
 * demandes liées, purge tokens / notifs / challenges téléphone.
 */
export async function deleteClientAccountByAdmin(
  clientId: string
): Promise<{ ok: true; anonymizedRequests: number } | { error: string }> {
  const store = await readStore();
  const index = store.clientAccounts.findIndex((c) => c.id === clientId);
  if (index === -1) return { error: "Compte client introuvable." };

  const client = store.clientAccounts[index];
  const emailLower = client.email.toLowerCase();

  const requestIds: string[] = [];
  for (const req of store.workRequests) {
    const linked =
      req.clientId === clientId ||
      (!req.clientId && req.email.toLowerCase() === emailLower);
    if (!linked) continue;
    requestIds.push(req.id);
    req.clientId = undefined;
    req.firstName = "Compte";
    req.lastName = "supprimé";
    req.email = `deleted+${req.id.slice(0, 8)}@invalid.local`;
    req.phone = undefined;
    req.phoneVerifiedAt = undefined;
    req.companyName = undefined;
    req.clientSiret = undefined;
    req.addressLine = undefined;
    req.addressLine2 = undefined;
    req.photos = [];
  }

  store.clientAccounts.splice(index, 1);

  store.passwordResetTokens = store.passwordResetTokens.filter(
    (t) => !(t.userType === "client" && t.userId === clientId)
  );
  store.emailVerificationTokens = store.emailVerificationTokens.filter(
    (t) => !(t.userType === "client" && t.userId === clientId)
  );
  store.phoneVerificationChallenges = store.phoneVerificationChallenges.filter(
    (c) => c.clientId !== clientId
  );
  store.notifications = store.notifications.filter(
    (n) => !(n.audience === "client" && n.userId === clientId)
  );

  for (const q of store.proQuotes) {
    if (q.uploadedByClientId === clientId) {
      q.uploadedByClientId = undefined;
    }
  }

  await writeStore(store);

  const { removeRequestUploadDir } = await import("./uploads");
  await Promise.all(requestIds.map((id) => removeRequestUploadDir(id)));

  return { ok: true, anonymizedRequests: requestIds.length };
}

/**
 * Suppression admin d'un compte pro : retire le compte et le portefeuille,
 * anonymise l'historique marketplace, purge tokens / notifs.
 */
export async function deleteProAccountByAdmin(
  proId: string
): Promise<{ ok: true } | { error: string }> {
  const store = await readStore();
  const index = store.proRegistrations.findIndex((p) => p.id === proId);
  if (index === -1) return { error: "Compte professionnel introuvable." };

  store.proRegistrations.splice(index, 1);

  store.creditWallets = store.creditWallets.filter((w) => w.proId !== proId);
  store.creditTransactions = store.creditTransactions.filter(
    (t) => t.proId !== proId
  );

  for (const bid of store.bids) {
    if (bid.proId === proId) {
      bid.companyName = "[compte supprimé]";
      bid.devisProofUrl = undefined;
      bid.ocrSnippet = undefined;
    }
  }
  for (const quote of store.proQuotes) {
    if (quote.proId === proId) {
      quote.companyName = "[compte supprimé]";
      quote.proofUrl = undefined;
    }
  }

  store.passwordResetTokens = store.passwordResetTokens.filter(
    (t) => !(t.userType === "pro" && t.userId === proId)
  );
  store.emailVerificationTokens = store.emailVerificationTokens.filter(
    (t) => !(t.userType === "pro" && t.userId === proId)
  );
  store.notifications = store.notifications.filter(
    (n) => !(n.audience === "pro" && n.userId === proId)
  );

  for (const p of store.proRegistrations) {
    if (p.referredByProId === proId) {
      p.referredByProId = undefined;
    }
  }

  await writeStore(store);

  const { removeProUploadDir } = await import("./uploads");
  await removeProUploadDir(proId);

  return { ok: true };
}

export async function getBidsForAuction(auctionId: string): Promise<Bid[]> {
  const store = await readStore();
  return store.bids
    .filter((b) => b.auctionId === auctionId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function countProBidsForAuction(
  proId: string,
  auctionId: string
): Promise<number> {
  const store = await readStore();
  return store.bids.filter(
    (b) => b.proId === proId && b.auctionId === auctionId
  ).length;
}

export async function addBid(data: {
  auctionId: string;
  proId: string;
  companyName: string;
  amount: number;
  feeEur: number;
  stripeSessionId?: string;
  devisProofUrl?: string;
  ocrAmount?: number;
  ocrMatchedLabel?: string;
  ocrSnippet?: string;
  fromQuoteId?: string;
}): Promise<Bid> {
  const store = await readStore();
  const entry: Bid = {
    id: newId("bid"),
    ...data,
    createdAt: new Date().toISOString(),
  };
  store.bids.push(entry);
  await writeStore(store);
  return entry;
}

export async function getProRegistrationById(
  proId: string
): Promise<ProRegistration | null> {
  const store = await readStore();
  return store.proRegistrations.find((p) => p.id === proId) ?? null;
}

export async function getApprovedProById(proId: string): Promise<ProRegistration | null> {
  const pro = await getProRegistrationById(proId);
  if (!pro || pro.status !== "approved") return null;
  return pro;
}

/** Compte accessible via session pro (ou impersonation admin, tout statut). */
export async function getProForSession(session: {
  proId: string;
  impersonatedByAdmin?: boolean;
}): Promise<ProRegistration | null> {
  if (session.impersonatedByAdmin) {
    return getProRegistrationById(session.proId);
  }
  return getApprovedProById(session.proId);
}

export async function getQualificationLevelForPro(
  proId: string
): Promise<1 | 2 | 3> {
  const pro = await getApprovedProById(proId);
  const level = pro?.qualificationLevel ?? 1;
  return level === 0 ? 1 : level;
}

export async function mapBidsWithQualification<
  T extends { proId: string },
>(
  bids: T[],
  workCategoryLabel?: string
): Promise<
  Array<T & { qualificationLevel: 1 | 2 | 3; decennaleVerifiedLabels?: string[] }>
> {
  return Promise.all(
    bids.map(async (bid) => {
      const pro = await getApprovedProById(bid.proId);
      const raw = pro?.qualificationLevel ?? 1;
      return {
        ...bid,
        qualificationLevel: (raw === 0 ? 1 : raw) as 1 | 2 | 3,
        ...(workCategoryLabel && pro
          ? {
              decennaleVerifiedLabels: getValidatedDecennaleLabelsForWorkCategory(
                pro,
                workCategoryLabel
              ),
            }
          : {}),
      };
    })
  );
}

export async function mapQuotesWithQualification<
  T extends { proId: string },
>(
  quotes: T[],
  workCategoryLabel?: string
): Promise<
  Array<T & { qualificationLevel: 1 | 2 | 3; decennaleVerifiedLabels?: string[] }>
> {
  return Promise.all(
    quotes.map(async (quote) => {
      const pro = await getApprovedProById(quote.proId);
      const raw = pro?.qualificationLevel ?? 1;
      return {
        ...quote,
        qualificationLevel: (raw === 0 ? 1 : raw) as 1 | 2 | 3,
        ...(workCategoryLabel && pro
          ? {
              decennaleVerifiedLabels: getValidatedDecennaleLabelsForWorkCategory(
                pro,
                workCategoryLabel
              ),
            }
          : {}),
      };
    })
  );
}

export async function getBidsForPro(proId: string): Promise<Bid[]> {
  const store = await readStore();
  return store.bids
    .filter((b) => b.proId === proId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getContactUnlocksForPro(proId: string): Promise<ContactUnlock[]> {
  const store = await readStore();
  return store.contactUnlocks
    .filter((u) => u.proId === proId)
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
}

export type ProUnlockedContact = {
  unlockId: string;
  auctionId: string;
  paidAt: string;
  amountEur: number;
  category: string;
  city: string;
  department: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  companyName?: string;
  clientKind?: "individual" | "company" | "copropriete";
  workScope?: "privatif" | "commun";
};

/** Coordonnées clients débloquées par l'artisan (carnet Contacts). */
export async function getUnlockedContactsForPro(
  proId: string
): Promise<ProUnlockedContact[]> {
  const store = await readStore();
  const unlocks = store.contactUnlocks
    .filter((u) => u.proId === proId)
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

  const results: ProUnlockedContact[] = [];

  for (const unlock of unlocks) {
    const request = store.workRequests.find((r) => r.auctionId === unlock.auctionId);
    if (request) {
      results.push({
        unlockId: unlock.id,
        auctionId: unlock.auctionId,
        paidAt: unlock.paidAt,
        amountEur: unlock.amountEur,
        category: request.category,
        city: request.city,
        department: request.department,
        firstName: request.firstName,
        lastName: request.lastName,
        email: request.email,
        phone: request.phone?.trim() || "Non renseigné",
        address: formatWorkRequestAddress(request),
        companyName: request.companyName,
        clientKind: request.clientKind ?? "individual",
        workScope: request.workScope,
      });
      continue;
    }

    const staticContact = getClientContact(unlock.auctionId);
    if (!staticContact) continue;

    results.push({
      unlockId: unlock.id,
      auctionId: unlock.auctionId,
      paidAt: unlock.paidAt,
      amountEur: unlock.amountEur,
      category: "Projet",
      city: staticContact.postalCode.replace(/^\d+\s*/, "") || "—",
      department: staticContact.postalCode.slice(0, 2),
      firstName: staticContact.firstName,
      lastName: staticContact.lastName,
      email: staticContact.email,
      phone: staticContact.phone,
      address: `${staticContact.address}, ${staticContact.postalCode}`,
      companyName: staticContact.companyName,
      clientKind: staticContact.clientKind,
      workScope: staticContact.workScope,
    });
  }

  return results;
}

export async function getProDashboardStats(proId: string) {
  const store = await readStore();
  const bids = store.bids.filter((b) => b.proId === proId);
  const unlocks = store.contactUnlocks.filter((u) => u.proId === proId);
  const auctionIds = [...new Set(bids.map((b) => b.auctionId))];

  return {
    totalBids: bids.length,
    auctionsParticipated: auctionIds.length,
    contactUnlocks: unlocks.length,
    totalFeesEur: bids.reduce((sum, b) => sum + b.feeEur, 0),
    recentBids: bids.slice(0, 5),
    recentUnlocks: unlocks.slice(0, 5),
  };
}

export type { Bid, ContactUnlock };

export async function getClientById(clientId: string): Promise<ClientAccount | null> {
  const store = await readStore();
  return store.clientAccounts.find((c) => c.id === clientId) ?? null;
}

export async function getClientByEmail(email: string): Promise<ClientAccount | null> {
  const store = await readStore();
  return (
    store.clientAccounts.find((c) => c.email.toLowerCase() === email.toLowerCase()) ?? null
  );
}

export async function authenticateClient(
  email: string,
  password: string
): Promise<ClientAccount | null> {
  const client = await getClientByEmail(email);
  if (!client?.passwordHash) return null;
  if (!verifyPassword(password, client.passwordHash)) return null;
  return client;
}

export async function linkOrphanWorkRequests(clientId: string, email: string): Promise<void> {
  const store = await readStore();
  let changed = false;
  for (const request of store.workRequests) {
    if (!request.clientId && request.email.toLowerCase() === email.toLowerCase()) {
      request.clientId = clientId;
      changed = true;
    }
  }
  if (changed) await writeStore(store);
}

export async function ensureClientAccount(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  kind?: ClientKind;
  companyName?: string;
  siret?: string;
  siren?: string;
  companyVerified?: boolean;
}): Promise<{ client: ClientAccount; created: boolean } | { error: string }> {
  const store = await readStore();
  const emailLower = data.email.toLowerCase();
  const existing = store.clientAccounts.find((c) => c.email.toLowerCase() === emailLower);

  if (existing) {
    if (!verifyPassword(data.password, existing.passwordHash)) {
      return {
        error:
          "Un compte existe déjà avec cet email. Connectez-vous à votre espace ou utilisez le bon mot de passe.",
      };
    }
    if (data.phone && !existing.phone) {
      existing.phone = data.phone;
      await writeStore(store);
    }
    return { client: existing, created: false };
  }

  const passwordError = validatePassword(data.password);
  if (passwordError) return { error: passwordError };

  const kind = data.kind ?? "individual";
  const client: ClientAccount = {
    id: newId("client"),
    email: data.email.trim(),
    passwordHash: hashPassword(data.password),
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    phone: data.phone?.trim() || undefined,
    kind,
    companyName: kind === "company" ? data.companyName?.trim() : undefined,
    siret: kind === "company" ? data.siret : undefined,
    siren: kind === "company" ? data.siren : undefined,
    companyVerified: kind === "company" ? data.companyVerified === true : undefined,
    emailVerified: false,
    createdAt: new Date().toISOString(),
  };
  store.clientAccounts.push(client);
  await writeStore(store);
  return { client, created: true };
}

/** Comptes historiques sans champ = déjà considérés vérifiés. */
export function isEmailVerified(
  account: Pick<ClientAccount, "emailVerified"> | Pick<ProRegistration, "emailVerified">
): boolean {
  return account.emailVerified !== false;
}

export async function getWorkRequestsByClientId(clientId: string): Promise<WorkRequest[]> {
  const store = await readStore();
  return store.workRequests
    .filter((r) => r.clientId === clientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getWorkRequestForClient(
  requestId: string,
  clientId: string
): Promise<WorkRequest | null> {
  const store = await readStore();
  const request = store.workRequests.find((r) => r.id === requestId);
  if (!request || request.clientId !== clientId) return null;
  return request;
}

export async function selectBidForWorkRequest(
  requestId: string,
  clientId: string,
  bidId: string
): Promise<{ request: WorkRequest } | { error: string }> {
  const store = await readStore();
  const index = store.workRequests.findIndex((r) => r.id === requestId);
  if (index === -1) return { error: "Demande introuvable." };

  const request = store.workRequests[index];
  if (request.clientId !== clientId) return { error: "Accès refusé." };
  if (request.status !== "approved") {
    return { error: "L'enchère n'est pas encore active." };
  }
  if (!request.auctionId) return { error: "Aucune enchère associée." };

  const bid = store.bids.find((b) => b.id === bidId);
  if (!bid || bid.auctionId !== request.auctionId) {
    return { error: "Offre introuvable." };
  }

  store.workRequests[index] = {
    ...request,
    selectedBidId: bidId,
  };
  await writeStore(store);
  return { request: store.workRequests[index] };
}

export async function getProQuotesForAuction(auctionId: string): Promise<ProQuote[]> {
  const store = await readStore();
  const stored = store.proQuotes.filter((q) => q.auctionId === auctionId);
  const storedIds = new Set(stored.map((q) => q.id));
  const samples = getSampleQuotesForAuction(auctionId).filter((q) => !storedIds.has(q.id));
  return [...stored, ...samples].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getApprovedProQuotesForAuction(auctionId: string): Promise<ProQuote[]> {
  const quotes = await getProQuotesForAuction(auctionId);
  return quotes.filter((q) => q.status === "approved");
}

export async function getProQuoteByProAndAuction(
  proId: string,
  auctionId: string
): Promise<ProQuote | null> {
  const store = await readStore();
  const quote = store.proQuotes.find((q) => q.proId === proId && q.auctionId === auctionId);
  return quote ?? null;
}

export async function getProQuotesForPro(proId: string): Promise<ProQuote[]> {
  const store = await readStore();
  return store.proQuotes
    .filter((q) => q.proId === proId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export type ClientOfferRow = ProQuote & {
  projectLabel: string;
  workRequestId: string;
  canAttachProof: boolean;
};

/** Offres / devis liés aux demandes du particulier. */
export async function getOffersForClient(clientId: string): Promise<ClientOfferRow[]> {
  const store = await readStore();
  const myRequests = store.workRequests.filter((r) => r.clientId === clientId);
  const byId = Object.fromEntries(myRequests.map((r) => [r.id, r]));
  const requestIds = new Set(myRequests.map((r) => r.id));

  return store.proQuotes
    .filter((q) => requestIds.has(q.workRequestId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((q) => {
      const request = byId[q.workRequestId];
      return {
        ...q,
        workRequestId: q.workRequestId,
        projectLabel: request
          ? `${request.category} · ${request.city}`
          : "Demande",
        canAttachProof:
          q.submittedBy === "client" &&
          !q.proofUrl &&
          (q.status === "pending_moderation" ||
            q.status === "approved" ||
            q.status === "rejected"),
      };
    });
}

/** Joindre un justificatif à une offre déjà saisie par le particulier. */
export async function attachProofToClientQuote(
  quoteId: string,
  clientId: string,
  proofUrl: string
): Promise<ProQuote | { error: string }> {
  const store = await readStore();
  const index = store.proQuotes.findIndex((q) => q.id === quoteId);
  if (index === -1) return { error: "Offre introuvable." };

  const quote = store.proQuotes[index];
  const request = store.workRequests.find((r) => r.id === quote.workRequestId);
  if (!request || request.clientId !== clientId) {
    return { error: "Accès refusé." };
  }
  if (quote.submittedBy !== "client") {
    return { error: "Seul un prix saisi par vous peut recevoir un justificatif ici." };
  }
  if (quote.proofUrl) {
    return { error: "Un justificatif est déjà joint à cette offre." };
  }

  store.proQuotes[index] = {
    ...quote,
    proofUrl,
    uploadedByClientId: clientId,
  };
  await writeStore(store);
  return store.proQuotes[index];
}

export async function addProQuote(data: {
  workRequestId: string;
  auctionId: string;
  proId: string;
  companyName: string;
  visitDate: string;
  amount: number;
  description: string;
  proofUrl?: string;
  submittedBy?: "pro" | "client";
  uploadedByClientId?: string;
}): Promise<ProQuote | { error: string }> {
  const store = await readStore();
  const existing = store.proQuotes.find(
    (q) => q.proId === data.proId && q.auctionId === data.auctionId
  );

  if (existing && existing.status !== "rejected") {
    return {
      error:
        data.submittedBy === "client"
          ? "Un devis est déjà en cours ou validé pour cet artisan sur ce chantier."
          : "Vous avez déjà déposé un devis pour ce chantier.",
    };
  }

  const entry: ProQuote = {
    id: newId("quote"),
    workRequestId: data.workRequestId,
    auctionId: data.auctionId,
    proId: data.proId,
    companyName: data.companyName,
    visitDate: data.visitDate,
    amount: data.amount,
    description: data.description.trim(),
    proofUrl: data.proofUrl,
    submittedBy: data.submittedBy ?? "pro",
    uploadedByClientId: data.uploadedByClientId,
    status: "pending_moderation",
    createdAt: new Date().toISOString(),
  };

  if (existing?.status === "rejected") {
    const index = store.proQuotes.findIndex((q) => q.id === existing.id);
    store.proQuotes[index] = entry;
  } else {
    store.proQuotes.push(entry);
  }

  await writeStore(store);
  return entry;
}

/** Artisans ayant débloqué les coordonnées d'une enchère. */
export async function getUnlockedProsForAuction(
  auctionId: string
): Promise<Array<{ proId: string; companyName: string }>> {
  const store = await readStore();
  const unlocks = store.contactUnlocks.filter((u) => u.auctionId === auctionId);
  const seen = new Set<string>();
  const result: Array<{ proId: string; companyName: string }> = [];

  for (const unlock of unlocks) {
    if (seen.has(unlock.proId)) continue;
    seen.add(unlock.proId);
    const pro = store.proRegistrations.find((p) => p.id === unlock.proId);
    if (!pro || pro.status !== "approved") continue;
    result.push({ proId: pro.id, companyName: pro.companyName });
  }

  return result.sort((a, b) => a.companyName.localeCompare(b.companyName, "fr"));
}

/**
 * Artisans pour lesquels le particulier peut transmettre un devis hors site :
 * intérêt accepté et/ou coordonnées déjà débloquées.
 */
export async function getClientQuoteEligibleProsForAuction(
  auctionId: string
): Promise<Array<{ proId: string; companyName: string }>> {
  const store = await readStore();
  if (expireContactRequestsInStore(store)) await writeStore(store);
  const seen = new Set<string>();
  const result: Array<{ proId: string; companyName: string }> = [];

  const pushPro = (proId: string) => {
    if (seen.has(proId)) return;
    const pro = store.proRegistrations.find((p) => p.id === proId);
    if (!pro || pro.status !== "approved") return;
    seen.add(proId);
    result.push({ proId: pro.id, companyName: pro.companyName });
  };

  for (const req of store.contactRequests) {
    if (req.auctionId === auctionId && req.status === "accepted") {
      pushPro(req.proId);
    }
  }
  for (const unlock of store.contactUnlocks) {
    if (unlock.auctionId === auctionId) {
      pushPro(unlock.proId);
    }
  }

  return result.sort((a, b) => a.companyName.localeCompare(b.companyName, "fr"));
}

export async function canClientSubmitQuoteForPro(
  proId: string,
  auctionId: string
): Promise<boolean> {
  const unlocked = await hasContactUnlock(proId, auctionId);
  if (unlocked) return true;
  const accepted = await getAcceptedContactRequest(proId, auctionId);
  return accepted != null;
}

export async function updateProQuoteStatus(
  quoteId: string,
  status: "approved" | "rejected",
  adminNote?: string
): Promise<ProQuote | null> {
  const store = await readStore();
  const index = store.proQuotes.findIndex((q) => q.id === quoteId);
  if (index === -1) return null;

  store.proQuotes[index] = {
    ...store.proQuotes[index],
    status,
    reviewedAt: new Date().toISOString(),
    adminNote: adminNote?.trim() || undefined,
  };

  if (status === "approved") {
    const quote = store.proQuotes[index];
    const requestIndex = store.workRequests.findIndex((r) => r.id === quote.workRequestId);
    if (requestIndex !== -1 && store.workRequests[requestIndex].startPrice == null) {
      store.workRequests[requestIndex] = {
        ...store.workRequests[requestIndex],
        startPrice: quote.amount,
        startPriceQuoteId: quote.id,
      };
    }

    // Convertit le devis validé en offre indicative (sans crédit ni OCR).
    maybeCreateBidFromApprovedQuote(store, quote);
  }

  await writeStore(store);
  return store.proQuotes[index];
}

/**
 * À la validation admin d'un devis après visite : crée une offre indicative
 * au montant du devis si elle peut entrer dans l'enchère.
 * - 1er devis : fixe aussi le prix de départ, et constitue la 1re offre.
 * - Devis suivants : offre créée seulement si montant < prix actuel.
 */
function maybeCreateBidFromApprovedQuote(store: DataStore, quote: ProQuote): void {
  if (!quote.auctionId) return;

  const alreadyFromQuote = store.bids.some((b) => b.fromQuoteId === quote.id);
  if (alreadyFromQuote) return;

  const proBids = store.bids.filter(
    (b) => b.proId === quote.proId && b.auctionId === quote.auctionId
  );
  if (proBids.length >= MAX_BIDS_PER_AUCTION) return;

  const request = store.workRequests.find((r) => r.id === quote.workRequestId);
  const startPrice =
    request?.startPrice ??
    (request?.startPriceQuoteId === quote.id ? quote.amount : undefined) ??
    quote.amount;

  const auctionBids = store.bids.filter((b) => b.auctionId === quote.auctionId);
  const currentPrice =
    computeCurrentPrice(
      startPrice,
      auctionBids.map((b) => b.amount)
    ) ?? startPrice;

  const isOpeningOffer = auctionBids.length === 0 && quote.amount === startPrice;
  const canEnterAuction = quote.amount < currentPrice || isOpeningOffer;
  if (!canEnterAuction) return;

  store.bids.push({
    id: newId("bid"),
    auctionId: quote.auctionId,
    proId: quote.proId,
    companyName: quote.companyName,
    amount: quote.amount,
    feeEur: 0,
    createdAt: new Date().toISOString(),
    fromQuoteId: quote.id,
    ocrAmount: quote.amount,
    ocrMatchedLabel: "Devis après visite validé par l'admin",
  });
}

/** Rejoue la conversion devis → offre pour les devis déjà validés sans bid liée. */
export async function backfillBidsFromApprovedQuotes(): Promise<number> {
  const store = await readStore();
  const before = store.bids.length;
  for (const quote of store.proQuotes) {
    if (quote.status !== "approved") continue;
    maybeCreateBidFromApprovedQuote(store, quote);
  }
  const created = store.bids.length - before;
  if (created > 0) await writeStore(store);
  return created;
}

export async function selectQuoteForWorkRequest(
  requestId: string,
  clientId: string,
  quoteId: string
): Promise<{ request: WorkRequest } | { error: string }> {
  const store = await readStore();
  const index = store.workRequests.findIndex((r) => r.id === requestId);
  if (index === -1) return { error: "Demande introuvable." };

  const request = store.workRequests[index];
  if (request.clientId !== clientId) return { error: "Accès refusé." };
  if (request.status !== "approved") {
    return { error: "L'enchère n'est pas encore active." };
  }
  if (!request.auctionId) return { error: "Aucune enchère associée." };

  const quote = store.proQuotes.find((q) => q.id === quoteId);
  if (!quote || quote.auctionId !== request.auctionId) {
    return { error: "Devis introuvable." };
  }
  if (quote.status !== "approved") {
    return { error: "Ce devis n'est pas encore validé." };
  }

  store.workRequests[index] = {
    ...request,
    selectedQuoteId: quoteId,
  };
  await writeStore(store);
  return { request: store.workRequests[index] };
}

export async function getClientDashboardStats(clientId: string) {
  const requests = await getWorkRequestsByClientId(clientId);
  const pending = requests.filter((r) => r.status === "pending").length;
  const active = requests.filter(
    (r) => r.status === "approved" && !r.selectedQuoteId && !r.selectedBidId
  ).length;
  const chosen = requests.filter((r) => r.selectedQuoteId || r.selectedBidId).length;

  return {
    totalRequests: requests.length,
    pending,
    active,
    chosen,
    recentRequests: requests.slice(0, 5),
  };
}

export async function ensureWorkRequestShareToken(
  requestId: string,
  clientId: string
): Promise<string | null> {
  const request = await getWorkRequestForClient(requestId, clientId);
  if (!request || request.status !== "approved") return null;
  if (request.shareToken) return request.shareToken;

  const shareToken = createShareToken();
  await updateWorkRequest(requestId, { shareToken });
  return shareToken;
}

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 48 * 60 * 60 * 1000;

function createSecureTokenValue(): string {
  return randomBytes(32).toString("base64url");
}

export async function getProByEmail(email: string): Promise<ProRegistration | null> {
  const store = await readStore();
  return (
    store.proRegistrations.find((p) => p.email.toLowerCase() === email.toLowerCase()) ?? null
  );
}

export async function createPasswordResetToken(
  email: string,
  userType: PasswordResetUserType
): Promise<PasswordResetToken | null> {
  const store = await readStore();
  const emailLower = email.trim().toLowerCase();

  let userId: string | null = null;
  if (userType === "client") {
    userId = store.clientAccounts.find((c) => c.email.toLowerCase() === emailLower)?.id ?? null;
  } else {
    userId =
      store.proRegistrations.find((p) => p.email.toLowerCase() === emailLower)?.id ?? null;
  }

  if (!userId) return null;

  store.passwordResetTokens = store.passwordResetTokens.filter(
    (t) => !(t.userId === userId && t.userType === userType && !t.usedAt)
  );

  const token: PasswordResetToken = {
    token: createSecureTokenValue(),
    email: email.trim(),
    userType,
    userId,
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString(),
    createdAt: new Date().toISOString(),
  };

  store.passwordResetTokens.push(token);
  await writeStore(store);
  return token;
}

export async function createEmailVerificationToken(
  email: string,
  userType: PasswordResetUserType
): Promise<EmailVerificationToken | null> {
  const store = await readStore();
  const emailLower = email.trim().toLowerCase();

  if (userType === "client") {
    const client = store.clientAccounts.find((c) => c.email.toLowerCase() === emailLower);
    if (!client) return null;
    if (isEmailVerified(client)) return null;

    store.emailVerificationTokens = store.emailVerificationTokens.filter(
      (t) => !(t.userId === client.id && t.userType === "client" && !t.usedAt)
    );

    const token: EmailVerificationToken = {
      token: createSecureTokenValue(),
      email: client.email,
      userType: "client",
      userId: client.id,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString(),
      createdAt: new Date().toISOString(),
    };
    store.emailVerificationTokens.push(token);
    await writeStore(store);
    return token;
  }

  const pro = store.proRegistrations.find((p) => p.email.toLowerCase() === emailLower);
  if (!pro) return null;
  if (isEmailVerified(pro)) return null;

  store.emailVerificationTokens = store.emailVerificationTokens.filter(
    (t) => !(t.userId === pro.id && t.userType === "pro" && !t.usedAt)
  );

  const token: EmailVerificationToken = {
    token: createSecureTokenValue(),
    email: pro.email,
    userType: "pro",
    userId: pro.id,
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString(),
    createdAt: new Date().toISOString(),
  };
  store.emailVerificationTokens.push(token);
  await writeStore(store);
  return token;
}

export async function verifyEmailWithToken(
  token: string
): Promise<{ success: true; userType: PasswordResetUserType } | { error: string }> {
  const store = await readStore();
  const index = store.emailVerificationTokens.findIndex((t) => t.token === token);
  if (index === -1) return { error: "Lien de vérification invalide ou expiré." };

  const entry = store.emailVerificationTokens[index];
  if (entry.usedAt) return { error: "Ce lien a déjà été utilisé." };
  if (new Date(entry.expiresAt).getTime() <= Date.now()) {
    return { error: "Lien de vérification invalide ou expiré." };
  }

  const verifiedAt = new Date().toISOString();

  if (entry.userType === "client") {
    const clientIndex = store.clientAccounts.findIndex((c) => c.id === entry.userId);
    if (clientIndex === -1) return { error: "Compte introuvable." };
    store.clientAccounts[clientIndex].emailVerified = true;
    store.clientAccounts[clientIndex].emailVerifiedAt = verifiedAt;
  } else {
    const proIndex = store.proRegistrations.findIndex((p) => p.id === entry.userId);
    if (proIndex === -1) return { error: "Compte introuvable." };
    store.proRegistrations[proIndex].emailVerified = true;
    store.proRegistrations[proIndex].emailVerifiedAt = verifiedAt;
  }

  store.emailVerificationTokens[index].usedAt = verifiedAt;
  await writeStore(store);
  return { success: true, userType: entry.userType };
}

export async function getValidPasswordResetToken(
  token: string
): Promise<PasswordResetToken | null> {
  const store = await readStore();
  const entry = store.passwordResetTokens.find((t) => t.token === token);
  if (!entry || entry.usedAt) return null;
  if (new Date(entry.expiresAt).getTime() <= Date.now()) return null;
  return entry;
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ success: true } | { error: string }> {
  const passwordError = validatePassword(newPassword);
  if (passwordError) return { error: passwordError };

  const store = await readStore();
  const index = store.passwordResetTokens.findIndex((t) => t.token === token);
  if (index === -1) return { error: "Lien de réinitialisation invalide ou expiré." };

  const entry = store.passwordResetTokens[index];
  if (entry.usedAt) return { error: "Ce lien a déjà été utilisé." };
  if (new Date(entry.expiresAt).getTime() <= Date.now()) {
    return { error: "Lien de réinitialisation invalide ou expiré." };
  }

  const passwordHash = hashPassword(newPassword);

  if (entry.userType === "client") {
    const clientIndex = store.clientAccounts.findIndex((c) => c.id === entry.userId);
    if (clientIndex === -1) return { error: "Compte introuvable." };
    store.clientAccounts[clientIndex].passwordHash = passwordHash;
  } else {
    const proIndex = store.proRegistrations.findIndex((p) => p.id === entry.userId);
    if (proIndex === -1) return { error: "Compte introuvable." };
    store.proRegistrations[proIndex].passwordHash = passwordHash;
  }

  store.passwordResetTokens[index].usedAt = new Date().toISOString();
  await writeStore(store);
  return { success: true };
}

function purgeExpiredPhoneChallenges(store: DataStore): void {
  const now = Date.now();
  store.phoneVerificationChallenges = store.phoneVerificationChallenges.filter(
    (c) => new Date(c.expiresAt).getTime() > now
  );
}

export async function createPhoneVerificationChallenge(params: {
  clientId: string;
  phoneE164: string;
  codeHash: string;
  ttlMs: number;
  cooldownMs: number;
}): Promise<
  | { challenge: PhoneVerificationChallenge }
  | { error: string; status: number; cooldownSeconds?: number }
> {
  const store = await readStore();
  purgeExpiredPhoneChallenges(store);

  const recent = store.phoneVerificationChallenges
    .filter(
      (c) =>
        c.clientId === params.clientId && c.phoneE164 === params.phoneE164
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

  if (recent) {
    const elapsed = Date.now() - new Date(recent.createdAt).getTime();
    if (elapsed < params.cooldownMs) {
      const cooldownSeconds = Math.ceil((params.cooldownMs - elapsed) / 1000);
      return {
        error: `Patientez ${cooldownSeconds} s avant de renvoyer un code.`,
        status: 429,
        cooldownSeconds,
      };
    }
  }

  // Un seul challenge actif par client+numéro.
  store.phoneVerificationChallenges = store.phoneVerificationChallenges.filter(
    (c) =>
      !(c.clientId === params.clientId && c.phoneE164 === params.phoneE164)
  );

  const now = new Date();
  const challenge: PhoneVerificationChallenge = {
    id: newId("pver"),
    clientId: params.clientId,
    phoneE164: params.phoneE164,
    codeHash: params.codeHash,
    expiresAt: new Date(now.getTime() + params.ttlMs).toISOString(),
    attempts: 0,
    createdAt: now.toISOString(),
  };
  store.phoneVerificationChallenges.unshift(challenge);
  await writeStore(store);
  return { challenge };
}

/** Annule un challenge (ex. SMS non parti) pour ne pas bloquer le renvoi. */
export async function deletePhoneVerificationChallenge(params: {
  clientId: string;
  phoneE164: string;
}): Promise<void> {
  const store = await readStore();
  const before = store.phoneVerificationChallenges.length;
  store.phoneVerificationChallenges = store.phoneVerificationChallenges.filter(
    (c) =>
      !(c.clientId === params.clientId && c.phoneE164 === params.phoneE164)
  );
  if (store.phoneVerificationChallenges.length !== before) {
    await writeStore(store);
  }
}

export async function verifyPhoneChallengeCode(params: {
  clientId: string;
  phoneE164: string;
  codeHash: string;
  maxAttempts: number;
}): Promise<{ ok: true } | { error: string; status: number }> {
  const store = await readStore();
  purgeExpiredPhoneChallenges(store);

  const index = store.phoneVerificationChallenges.findIndex(
    (c) =>
      c.clientId === params.clientId && c.phoneE164 === params.phoneE164
  );
  if (index === -1) {
    return {
      error: "Aucun code en cours. Demandez un nouveau SMS.",
      status: 400,
    };
  }

  const challenge = store.phoneVerificationChallenges[index];
  if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
    store.phoneVerificationChallenges.splice(index, 1);
    await writeStore(store);
    return { error: "Code expiré. Demandez un nouveau SMS.", status: 400 };
  }

  if (challenge.attempts >= params.maxAttempts) {
    store.phoneVerificationChallenges.splice(index, 1);
    await writeStore(store);
    return {
      error: "Trop de tentatives. Demandez un nouveau SMS.",
      status: 429,
    };
  }

  if (challenge.codeHash !== params.codeHash) {
    store.phoneVerificationChallenges[index].attempts += 1;
    const left =
      params.maxAttempts - store.phoneVerificationChallenges[index].attempts;
    await writeStore(store);
    return {
      error:
        left > 0
          ? `Code incorrect. ${left} tentative${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""}.`
          : "Trop de tentatives. Demandez un nouveau SMS.",
      status: 400,
    };
  }

  store.phoneVerificationChallenges.splice(index, 1);
  await writeStore(store);
  return { ok: true };
}

export async function markGuestPhoneVerified(
  phoneE164: string,
  ttlMs = 2 * 60 * 60 * 1000
): Promise<GuestPhoneVerification> {
  const store = await readStore();
  const now = Date.now();
  store.guestPhoneVerifications = (store.guestPhoneVerifications ?? []).filter(
    (g) => new Date(g.expiresAt).getTime() > now && g.phoneE164 !== phoneE164
  );
  const entry: GuestPhoneVerification = {
    phoneE164,
    verifiedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
  };
  store.guestPhoneVerifications.unshift(entry);
  await writeStore(store);
  return entry;
}

export async function isGuestPhoneVerified(phoneE164: string): Promise<boolean> {
  const store = await readStore();
  const now = Date.now();
  const match = (store.guestPhoneVerifications ?? []).find(
    (g) =>
      g.phoneE164 === phoneE164 && new Date(g.expiresAt).getTime() > now
  );
  return Boolean(match);
}

export async function consumeGuestPhoneVerification(
  phoneE164: string
): Promise<boolean> {
  const store = await readStore();
  const now = Date.now();
  const list = store.guestPhoneVerifications ?? [];
  const index = list.findIndex(
    (g) =>
      g.phoneE164 === phoneE164 && new Date(g.expiresAt).getTime() > now
  );
  if (index === -1) return false;
  list.splice(index, 1);
  store.guestPhoneVerifications = list;
  await writeStore(store);
  return true;
}

export async function markClientPhoneVerified(
  clientId: string,
  phoneE164: string
): Promise<ClientAccount | null> {
  const store = await readStore();
  const index = store.clientAccounts.findIndex((c) => c.id === clientId);
  if (index === -1) return null;

  const verifiedAt = new Date().toISOString();

  store.clientAccounts[index] = {
    ...store.clientAccounts[index],
    phone: formatFrenchPhoneDisplay(phoneE164),
    phoneVerifiedE164: phoneE164,
    phoneVerifiedAt: verifiedAt,
  };
  await writeStore(store);
  return store.clientAccounts[index];
}

export async function getSmsCampaigns(): Promise<SmsCampaign[]> {
  const store = await readStore();
  return store.smsCampaigns.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getSmsCampaignsForWorkRequest(
  workRequestId: string
): Promise<SmsCampaign[]> {
  const campaigns = await getSmsCampaigns();
  return campaigns.filter((c) => c.workRequestId === workRequestId);
}

export async function addSmsCampaign(
  data: Omit<SmsCampaign, "id" | "createdAt">
): Promise<SmsCampaign> {
  const store = await readStore();
  const entry: SmsCampaign = {
    ...data,
    id: newId("sms"),
    createdAt: new Date().toISOString(),
  };
  store.smsCampaigns.unshift(entry);
  await writeStore(store);
  return entry;
}

export async function getSmsCampaignById(
  id: string
): Promise<SmsCampaign | null> {
  const store = await readStore();
  return store.smsCampaigns.find((c) => c.id === id) ?? null;
}

export async function updateSmsCampaign(
  id: string,
  patch: Partial<
    Pick<
      SmsCampaign,
      | "status"
      | "sentCount"
      | "failedCount"
      | "recipientCount"
      | "recipients"
      | "sentAt"
      | "message"
      | "scheduledForDate"
    >
  >
): Promise<SmsCampaign | null> {
  const store = await readStore();
  const index = store.smsCampaigns.findIndex((c) => c.id === id);
  if (index === -1) return null;
  store.smsCampaigns[index] = { ...store.smsCampaigns[index], ...patch };
  await writeStore(store);
  return store.smsCampaigns[index];
}

/** Lots en attente de validation (aucun envoi OVH encore). */
export async function getPendingReviewSmsCampaigns(): Promise<SmsCampaign[]> {
  const campaigns = await getSmsCampaigns();
  return campaigns.filter((c) => c.status === "pending_review");
}

export async function getPendingReviewForAcquisition(
  acquisitionId: string,
  scheduledForDate?: string
): Promise<SmsCampaign | null> {
  const dayKey = scheduledForDate ?? parisNextMarketingDayKey();
  const campaigns = await getSmsCampaigns();
  return (
    campaigns.find((c) => {
      if (c.status !== "pending_review") return false;
      if (c.acquisitionCampaignId !== acquisitionId) return false;
      const scheduled =
        c.scheduledForDate ?? parisDayKey(new Date(c.createdAt));
      return scheduled === dayKey;
    }) ?? null
  );
}

export async function getWorkRequestById(id: string): Promise<WorkRequest | null> {
  const store = await readStore();
  return store.workRequests.find((r) => r.id === id) ?? null;
}

const CONTACT_REQUEST_TTL_MS = 48 * 60 * 60 * 1000;

function expireContactRequestsInStore(store: DataStore): boolean {
  const now = Date.now();
  let changed = false;
  for (const req of store.contactRequests) {
    if (req.status === "pending" && new Date(req.expiresAt).getTime() < now) {
      req.status = "expired";
      req.decidedAt = new Date().toISOString();
      changed = true;
    }
  }
  return changed;
}

export async function getContactRequestByProAndAuction(
  proId: string,
  auctionId: string
): Promise<ContactRequest | null> {
  const store = await readStore();
  if (expireContactRequestsInStore(store)) await writeStore(store);
  return (
    store.contactRequests.find((r) => r.proId === proId && r.auctionId === auctionId) ??
    null
  );
}

export async function getAcceptedContactRequest(
  proId: string,
  auctionId: string
): Promise<ContactRequest | null> {
  const req = await getContactRequestByProAndAuction(proId, auctionId);
  return req?.status === "accepted" ? req : null;
}

/** Nombre d’artisans distincts acceptés pour une enchère. */
export async function countAcceptedArtisansForAuction(
  auctionId: string
): Promise<number> {
  const store = await readStore();
  if (expireContactRequestsInStore(store)) await writeStore(store);
  const pros = new Set<string>();
  for (const req of store.contactRequests) {
    if (req.auctionId === auctionId && req.status === "accepted") {
      pros.add(req.proId);
    }
  }
  return pros.size;
}

export async function createContactRequest(data: {
  auctionId: string;
  workRequestId: string;
  proId: string;
}): Promise<
  | {
      request: ContactRequest;
      autoAccepted: boolean;
      acceptedCount: number;
      maxAccepted: number;
    }
  | { error: string }
> {
  const store = await readStore();
  expireContactRequestsInStore(store);

  const existing = store.contactRequests.find(
    (r) => r.proId === data.proId && r.auctionId === data.auctionId
  );
  if (existing) {
    return {
      error:
        "Vous avez déjà manifesté votre intérêt pour cette offre. Une seule demande est autorisée.",
    };
  }

  const workRequest = store.workRequests.find((w) => w.id === data.workRequestId);
  if (!workRequest) {
    return { error: "Demande introuvable." };
  }

  const clientAccount = findClientForWorkRequestInStore(store, workRequest);
  if (clientAccount?.blockedFromContact) {
    return {
      error:
        "Ce client n’accepte plus de nouvelles demandes de contact (compte restreint).",
    };
  }

  const acceptedPros = new Set<string>();
  for (const r of store.contactRequests) {
    if (r.auctionId === data.auctionId && r.status === "accepted") {
      acceptedPros.add(r.proId);
    }
  }
  const maxSlots = resolveMaxContactArtisans(workRequest);
  if (isAcceptSlotsFull(acceptedPros.size, maxSlots)) {
    return {
      error: `Les ${maxSlots} places de contact sont déjà prises pour cette offre.`,
    };
  }

  // Option client « M'alerter » (défaut) : acceptation auto + compte dans le plafond.
  // Clients blacklistés : jamais d’auto-accept (défense en profondeur).
  const autoAccepted =
    !clientAccount?.blockedFromContact &&
    isSmsContactAlertsEnabled(workRequest);
  const now = new Date();
  const request: ContactRequest = {
    id: newId("creq"),
    auctionId: data.auctionId,
    workRequestId: data.workRequestId,
    proId: data.proId,
    status: autoAccepted ? "accepted" : "pending",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CONTACT_REQUEST_TTL_MS).toISOString(),
    ...(autoAccepted ? { decidedAt: now.toISOString() } : {}),
  };
  store.contactRequests.unshift(request);
  await writeStore(store);

  const acceptedCount = autoAccepted ? acceptedPros.size + 1 : acceptedPros.size;
  return {
    request,
    autoAccepted,
    acceptedCount,
    maxAccepted: maxSlots,
  };
}

export async function getContactRequestsForWorkRequest(
  workRequestId: string
): Promise<ContactRequest[]> {
  const store = await readStore();
  if (expireContactRequestsInStore(store)) await writeStore(store);
  return store.contactRequests
    .filter((r) => r.workRequestId === workRequestId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getContactRequestsForPro(proId: string): Promise<ContactRequest[]> {
  const store = await readStore();
  if (expireContactRequestsInStore(store)) await writeStore(store);
  return store.contactRequests.filter((r) => r.proId === proId);
}

export async function decideContactRequest(
  requestId: string,
  clientId: string,
  decision: "accepted" | "refused"
): Promise<{ request: ContactRequest } | { error: string }> {
  const store = await readStore();
  expireContactRequestsInStore(store);

  const index = store.contactRequests.findIndex((r) => r.id === requestId);
  if (index === -1) return { error: "Demande introuvable." };

  const req = store.contactRequests[index];
  const workRequest = store.workRequests.find((w) => w.id === req.workRequestId);
  if (!workRequest || workRequest.clientId !== clientId) {
    return { error: "Accès refusé." };
  }
  if (req.status !== "pending") {
    return { error: "Cette demande a déjà été traitée." };
  }
  if (new Date(req.expiresAt).getTime() < Date.now()) {
    store.contactRequests[index].status = "expired";
    store.contactRequests[index].decidedAt = new Date().toISOString();
    await writeStore(store);
    return { error: "Cette demande a expiré." };
  }

  if (decision === "accepted") {
    const acceptedPros = new Set<string>();
    for (const r of store.contactRequests) {
      if (r.auctionId === req.auctionId && r.status === "accepted") {
        acceptedPros.add(r.proId);
      }
    }
    const maxSlots = resolveMaxContactArtisans(workRequest);
    if (!acceptedPros.has(req.proId) && isAcceptSlotsFull(acceptedPros.size, maxSlots)) {
      return {
        error: `Vous avez déjà accepté ${maxSlots} artisan${maxSlots > 1 ? "s" : ""} pour cette offre (maximum autorisé).`,
      };
    }
  }

  store.contactRequests[index].status = decision;
  store.contactRequests[index].decidedAt = new Date().toISOString();
  await writeStore(store);
  return { request: store.contactRequests[index] };
}

/**
 * Remet en attente une demande refusée ou expirée (1 seul rappel par artisan / chantier).
 */
export async function recallContactRequest(
  requestId: string,
  clientId: string
): Promise<{ request: ContactRequest } | { error: string }> {
  const store = await readStore();
  expireContactRequestsInStore(store);

  const index = store.contactRequests.findIndex((r) => r.id === requestId);
  if (index === -1) return { error: "Demande introuvable." };

  const req = store.contactRequests[index];
  const workRequest = store.workRequests.find((w) => w.id === req.workRequestId);
  if (!workRequest || workRequest.clientId !== clientId) {
    return { error: "Accès refusé." };
  }
  if (req.status !== "refused" && req.status !== "expired") {
    return { error: "Seules les demandes refusées ou expirées peuvent être rappelées." };
  }
  if (req.clientRecallUsed) {
    return { error: "Vous avez déjà utilisé votre rappel unique pour cet artisan." };
  }

  const now = new Date();
  store.contactRequests[index] = {
    ...req,
    status: "pending",
    expiresAt: new Date(now.getTime() + CONTACT_REQUEST_TTL_MS).toISOString(),
    decidedAt: undefined,
    clientRecallUsed: true,
    recalledAt: now.toISOString(),
  };
  await writeStore(store);
  return { request: store.contactRequests[index] };
}

export async function getSmsSettings(): Promise<SmsCampaignSettings> {
  const store = await readStore();
  return normalizeSmsSettings(store.smsSettings);
}

export async function updateSmsSettings(
  patch: Partial<SmsCampaignSettings>
): Promise<SmsCampaignSettings> {
  const store = await readStore();
  const current = normalizeSmsSettings(store.smsSettings);
  const nextPatch = { ...patch };
  if (
    typeof nextPatch.smsPerDay !== "number" &&
    typeof nextPatch.defaultCampaignSize === "number"
  ) {
    nextPatch.smsPerDay = nextPatch.defaultCampaignSize;
  }
  store.smsSettings = normalizeSmsSettings({ ...current, ...nextPatch });
  await writeStore(store);
  return store.smsSettings;
}

export async function getSmsAcquisitionCampaigns(): Promise<
  SmsAcquisitionCampaign[]
> {
  const store = await readStore();
  return [...(store.smsAcquisitionCampaigns ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getActiveSmsAcquisitionCampaign(
  workRequestId: string
): Promise<SmsAcquisitionCampaign | null> {
  const all = await getSmsAcquisitionCampaigns();
  return (
    all.find(
      (c) =>
        c.workRequestId === workRequestId &&
        (c.status === "active" || c.status === "paused")
    ) ?? null
  );
}

export async function getSmsAcquisitionCampaignById(
  id: string
): Promise<SmsAcquisitionCampaign | null> {
  const store = await readStore();
  return (store.smsAcquisitionCampaigns ?? []).find((c) => c.id === id) ?? null;
}

export async function createSmsAcquisitionCampaign(data: {
  workRequestId: string;
  smsPerDay: number;
  trigger: SmsCampaignTrigger;
}): Promise<SmsAcquisitionCampaign> {
  const store = await readStore();
  if (!store.smsAcquisitionCampaigns) store.smsAcquisitionCampaigns = [];
  const now = new Date().toISOString();
  const entry: SmsAcquisitionCampaign = {
    id: newId("smsacq"),
    workRequestId: data.workRequestId,
    status: "active",
    smsPerDay: Math.max(1, Math.min(200, Math.floor(data.smsPerDay))),
    totalSent: 0,
    sentOnLastDate: 0,
    trigger: data.trigger,
    createdAt: now,
    updatedAt: now,
  };
  store.smsAcquisitionCampaigns.unshift(entry);
  await writeStore(store);
  return entry;
}

export async function updateSmsAcquisitionCampaign(
  id: string,
  patch: Partial<
    Pick<
      SmsAcquisitionCampaign,
      | "status"
      | "totalSent"
      | "lastSendDate"
      | "sentOnLastDate"
      | "completedAt"
      | "smsPerDay"
    >
  >
): Promise<SmsAcquisitionCampaign | null> {
  const store = await readStore();
  if (!store.smsAcquisitionCampaigns) store.smsAcquisitionCampaigns = [];
  const index = store.smsAcquisitionCampaigns.findIndex((c) => c.id === id);
  if (index === -1) return null;
  store.smsAcquisitionCampaigns[index] = {
    ...store.smsAcquisitionCampaigns[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);
  return store.smsAcquisitionCampaigns[index];
}

export async function setSmsAcquisitionStatus(
  id: string,
  status: SmsAcquisitionStatus
): Promise<SmsAcquisitionCampaign | null> {
  const completedAt =
    status === "completed" || status === "exhausted"
      ? new Date().toISOString()
      : undefined;
  return updateSmsAcquisitionCampaign(id, {
    status,
    ...(completedAt ? { completedAt } : {}),
  });
}

export async function getArtisanProspects(): Promise<ArtisanProspect[]> {
  const store = await readStore();
  return store.artisanProspects;
}

export async function upsertArtisanProspect(
  data: Omit<ArtisanProspect, "createdAt" | "updatedAt"> & {
    createdAt?: string;
  }
): Promise<ArtisanProspect> {
  const store = await readStore();
  const now = new Date().toISOString();
  const index = store.artisanProspects.findIndex((p) => p.siret === data.siret);
  if (index === -1) {
    const entry: ArtisanProspect = {
      ...data,
      createdAt: data.createdAt ?? now,
      updatedAt: now,
    };
    store.artisanProspects.push(entry);
    await writeStore(store);
    return entry;
  }
  store.artisanProspects[index] = {
    ...store.artisanProspects[index],
    ...data,
    updatedAt: now,
  };
  await writeStore(store);
  return store.artisanProspects[index];
}

/**
 * SIRET déjà touchés par un SMS marketing (prospect ou historique campagnes).
 * Ces artisans ne doivent plus être ciblés en prospection.
 */
export async function getMarketingSmsContactedSirets(): Promise<Set<string>> {
  const store = await readStore();
  const set = new Set<string>();
  for (const p of store.artisanProspects) {
    if (p.lastContactedAt) set.add(p.siret);
  }
  for (const campaign of store.smsCampaigns) {
    for (const r of campaign.recipients) {
      if (r.status === "sent" && r.siret) set.add(r.siret);
    }
  }
  return set;
}

/** Enregistre un envoi marketing réussi — exclusion définitive du canal SMS campagne. */
export async function markProspectsContacted(
  entries: Array<{
    siret: string;
    siren?: string;
    companyName: string;
    phone?: string;
    city?: string;
    department?: "59" | "62";
    nafCode?: string;
    source?: ArtisanProspect["source"];
  }>
): Promise<void> {
  if (entries.length === 0) return;
  const store = await readStore();
  const now = new Date().toISOString();

  for (const entry of entries) {
    const siret = entry.siret.trim();
    if (!/^\d{14}$/.test(siret)) continue;
    const index = store.artisanProspects.findIndex((p) => p.siret === siret);
    if (index === -1) {
      store.artisanProspects.push({
        siret,
        siren: entry.siren ?? siret.slice(0, 9),
        companyName: entry.companyName || "Entreprise",
        city: entry.city ?? "",
        department: entry.department ?? "59",
        nafCode: entry.nafCode,
        phone: entry.phone,
        source: entry.source ?? "gouv",
        lastContactedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      store.artisanProspects[index] = {
        ...store.artisanProspects[index],
        lastContactedAt: now,
        phone: entry.phone ?? store.artisanProspects[index].phone,
        companyName:
          entry.companyName || store.artisanProspects[index].companyName,
        updatedAt: now,
      };
    }
  }
  await writeStore(store);
}

export async function getProCreditBalance(proId: string): Promise<number> {
  const store = await readStore();
  return store.creditWallets.find((w) => w.proId === proId)?.balance ?? 0;
}

export async function getProCreditTransactions(
  proId: string
): Promise<ProCreditTransaction[]> {
  const store = await readStore();
  return store.creditTransactions
    .filter((t) => t.proId === proId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function applyCreditDelta(
  store: DataStore,
  data: {
    proId: string;
    type: CreditTxnType;
    amount: number;
    amountEur?: number;
    auctionId?: string;
    workRequestId?: string;
    stripeSessionId?: string;
    note?: string;
  }
): Promise<
  | { balance: number; transaction: ProCreditTransaction; alreadyApplied: boolean }
  | { error: string }
> {
  if (data.amount === 0) return { error: "Montant invalide." };

  let wallet = store.creditWallets.find((w) => w.proId === data.proId);
  if (!wallet) {
    wallet = {
      proId: data.proId,
      balance: 0,
      updatedAt: new Date().toISOString(),
    };
    store.creditWallets.push(wallet);
  }

  const next = Math.round((wallet.balance + data.amount) * 1000) / 1000;
  if (next < -0.0001) {
    return { error: "Solde insuffisant." };
  }
  const balanceAfter = Math.max(0, next);

  if (data.stripeSessionId) {
    const dup = store.creditTransactions.find(
      (t) => t.stripeSessionId === data.stripeSessionId
    );
    if (dup) {
      return {
        balance: wallet.balance,
        transaction: dup,
        alreadyApplied: true,
      };
    }
  }

  wallet.balance = balanceAfter;
  wallet.updatedAt = new Date().toISOString();

  const transaction: ProCreditTransaction = {
    id: newId("ctx"),
    proId: data.proId,
    type: data.type,
    amount: data.amount,
    amountEur: data.amountEur,
    balanceAfter,
    auctionId: data.auctionId,
    workRequestId: data.workRequestId,
    stripeSessionId: data.stripeSessionId,
    note: data.note,
    createdAt: new Date().toISOString(),
  };
  store.creditTransactions.unshift(transaction);
  return { balance: next, transaction, alreadyApplied: false };
}

export async function creditProWallet(data: {
  proId: string;
  type: CreditTxnType;
  amount: number;
  amountEur?: number;
  auctionId?: string;
  workRequestId?: string;
  stripeSessionId?: string;
  note?: string;
}): Promise<
  | { balance: number; transaction: ProCreditTransaction; alreadyApplied: boolean }
  | { error: string }
> {
  if (data.amount <= 0) return { error: "Le montant doit être positif." };
  const store = await readStore();
  const result = await applyCreditDelta(store, data);
  if ("error" in result) return result;
  await writeStore(store);
  return result;
}

export async function spendProCredit(data: {
  proId: string;
  type: "spend_unlock" | "spend_bid";
  /** Montant en euros à débiter. */
  credits?: number;
  /** Alias explicite euros (prioritaire si fourni). */
  amountEur?: number;
  auctionId?: string;
  workRequestId?: string;
  note?: string;
}): Promise<{ balance: number; transaction: ProCreditTransaction } | { error: string }> {
  const euros =
    Math.round(
      (typeof data.amountEur === "number" && data.amountEur > 0
        ? data.amountEur
        : (data.credits ?? 0)) * 1000
    ) / 1000;
  if (!(euros > 0)) {
    return { error: "Montant invalide." };
  }
  const store = await readStore();
  const result = await applyCreditDelta(store, {
    proId: data.proId,
    type: data.type,
    auctionId: data.auctionId,
    workRequestId: data.workRequestId,
    note: data.note,
    amountEur: euros,
    amount: -euros,
  });
  if ("error" in result) return result;
  await maybeGrantReferralRewardInStore(store, data.proId);
  await writeStore(store);
  return result;
}

function isEligibleReferrer(pro: ProRegistration | undefined): pro is ProRegistration {
  return Boolean(pro && pro.status === "approved" && pro.rcsVerified);
}

function allocateUniqueReferralCode(store: DataStore): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateReferralCode();
    const taken = store.proRegistrations.some(
      (p) => p.referralCode && normalizeReferralCode(p.referralCode) === code
    );
    if (!taken) return code;
  }
  throw new Error("REFERRAL_CODE_GENERATION_FAILED");
}

function ensureReferralCodeInStore(store: DataStore, proId: string): string | null {
  if (!REFERRAL_ENABLED) return null;
  const pro = store.proRegistrations.find((p) => p.id === proId);
  if (!isEligibleReferrer(pro)) return null;
  if (pro.referralCode) return normalizeReferralCode(pro.referralCode);
  const code = allocateUniqueReferralCode(store);
  pro.referralCode = code;
  return code;
}

export async function ensureProReferralCode(proId: string): Promise<string | null> {
  if (!REFERRAL_ENABLED) return null;
  const store = await readStore();
  const code = ensureReferralCodeInStore(store, proId);
  if (!code) return null;
  await writeStore(store);
  return code;
}

export async function findProByReferralCode(
  rawCode: string
): Promise<ProRegistration | null> {
  if (!REFERRAL_ENABLED) return null;
  const code = normalizeReferralCode(rawCode);
  if (!isValidReferralCodeFormat(code)) return null;
  const store = await readStore();
  const pro = store.proRegistrations.find(
    (p) => p.referralCode && normalizeReferralCode(p.referralCode) === code
  );
  return isEligibleReferrer(pro) ? pro : null;
}

export type ApplyReferralResult =
  | {
      ok: true;
      referrer: Pick<ProRegistration, "id" | "companyName" | "referralCode">;
    }
  | { ok: false; error: string };

export async function applyReferralCodeToPro(
  filleulProId: string,
  rawCode: string
): Promise<ApplyReferralResult> {
  if (!REFERRAL_ENABLED) {
    return { ok: false, error: "Le programme de parrainage n'est plus disponible." };
  }
  const code = normalizeReferralCode(rawCode);
  if (!code) return { ok: false, error: "Saisissez un code de parrainage." };
  if (!isValidReferralCodeFormat(code)) {
    return { ok: false, error: "Format de code invalide." };
  }

  const store = await readStore();
  const filleul = store.proRegistrations.find((p) => p.id === filleulProId);
  if (!filleul || filleul.status !== "approved") {
    return { ok: false, error: "Compte professionnel introuvable ou non approuvé." };
  }
  if (filleul.referredByProId) {
    return { ok: false, error: "Un code de parrainage a déjà été validé sur ce compte." };
  }
  if (filleul.referralRewardGrantedAt) {
    return { ok: false, error: "Ce compte a déjà déclenché une récompense de parrainage." };
  }

  const referrer = store.proRegistrations.find(
    (p) => p.referralCode && normalizeReferralCode(p.referralCode) === code
  );
  if (!isEligibleReferrer(referrer)) {
    return { ok: false, error: "Code de parrainage inconnu ou parrain non vérifié." };
  }
  if (referrer.id === filleulProId) {
    return { ok: false, error: "Vous ne pouvez pas utiliser votre propre code." };
  }

  filleul.referredByProId = referrer.id;
  filleul.referralCodeAppliedAt = new Date().toISOString();
  await maybeGrantReferralRewardInStore(store, filleulProId);
  await writeStore(store);

  return {
    ok: true,
    referrer: {
      id: referrer.id,
      companyName: referrer.companyName,
      referralCode: referrer.referralCode,
    },
  };
}

async function maybeGrantReferralRewardInStore(
  store: DataStore,
  spenderProId: string
): Promise<void> {
  if (!REFERRAL_ENABLED) return;
  const spender = store.proRegistrations.find((p) => p.id === spenderProId);
  if (!spender?.referredByProId || spender.referralRewardGrantedAt) return;

  const referrer = store.proRegistrations.find((p) => p.id === spender.referredByProId);
  if (!isEligibleReferrer(referrer)) return;

  const spentCredits = store.creditTransactions
    .filter(
      (t) =>
        t.proId === spenderProId &&
        (t.type === "spend_unlock" || t.type === "spend_bid")
    )
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  if (spentCredits < REFERRAL_SPEND_THRESHOLD) return;

  const credited = await applyCreditDelta(store, {
    proId: referrer.id,
    type: "referral_reward",
    amount: REFERRAL_REWARD_CREDITS,
    note: `Parrainage — ${spender.companyName} a dépensé ${REFERRAL_SPEND_THRESHOLD} €`,
  });
  if ("error" in credited) return;

  spender.referralRewardGrantedAt = new Date().toISOString();
}

export interface ProReferralStats {
  referralCode: string | null;
  referredBy: {
    proId: string;
    companyName: string;
    referralCode?: string;
    appliedAt?: string;
  } | null;
  rewardGrantedAt?: string;
  spendProgress: number;
  spendThreshold: number;
  rewardCredits: number;
  referrals: Array<{
    proId: string;
    companyName: string;
    appliedAt?: string;
    rewardGrantedAt?: string;
    spendProgress: number;
  }>;
  rewardsEarned: number;
}

export async function getProReferralStats(proId: string): Promise<ProReferralStats> {
  const store = await readStore();
  const existing = store.proRegistrations.find((p) => p.id === proId);
  const hadCode = Boolean(existing?.referralCode);
  const code = ensureReferralCodeInStore(store, proId);
  if (code && !hadCode) await writeStore(store);

  const pro = store.proRegistrations.find((p) => p.id === proId);
  const referrer = pro?.referredByProId
    ? store.proRegistrations.find((p) => p.id === pro.referredByProId)
    : undefined;

  const spendFor = (targetProId: string) =>
    store.creditTransactions
      .filter(
        (t) =>
          t.proId === targetProId &&
          (t.type === "spend_unlock" || t.type === "spend_bid")
      )
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const referrals = store.proRegistrations
    .filter((p) => p.referredByProId === proId)
    .map((p) => ({
      proId: p.id,
      companyName: p.companyName,
      appliedAt: p.referralCodeAppliedAt,
      rewardGrantedAt: p.referralRewardGrantedAt,
      spendProgress: Math.min(spendFor(p.id), REFERRAL_SPEND_THRESHOLD),
    }))
    .sort((a, b) => {
      const aTime = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
      const bTime = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
      return bTime - aTime;
    });

  return {
    referralCode: code,
    referredBy: referrer
      ? {
          proId: referrer.id,
          companyName: referrer.companyName,
          referralCode: referrer.referralCode,
          appliedAt: pro?.referralCodeAppliedAt,
        }
      : null,
    rewardGrantedAt: pro?.referralRewardGrantedAt,
    spendProgress: Math.min(spendFor(proId), REFERRAL_SPEND_THRESHOLD),
    spendThreshold: REFERRAL_SPEND_THRESHOLD,
    rewardCredits: REFERRAL_REWARD_CREDITS,
    referrals,
    rewardsEarned: referrals.filter((r) => r.rewardGrantedAt).length * REFERRAL_REWARD_CREDITS,
  };
}

const MAX_NOTIFICATIONS_PER_USER = 100;

export async function createAppNotification(data: {
  audience: NotificationAudience;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
}): Promise<AppNotification | null> {
  if (!data.userId) return null;
  const store = await readStore();
  const entry: AppNotification = {
    id: newId("notif"),
    audience: data.audience,
    userId: data.userId,
    kind: data.kind,
    title: data.title.trim(),
    body: data.body.trim(),
    href: data.href,
    createdAt: new Date().toISOString(),
  };
  store.notifications.unshift(entry);

  const mine = store.notifications.filter(
    (n) => n.audience === data.audience && n.userId === data.userId
  );
  if (mine.length > MAX_NOTIFICATIONS_PER_USER) {
    const dropIds = new Set(mine.slice(MAX_NOTIFICATIONS_PER_USER).map((n) => n.id));
    store.notifications = store.notifications.filter((n) => !dropIds.has(n.id));
  }

  await writeStore(store);
  return entry;
}

export async function getNotificationsForUser(
  audience: NotificationAudience,
  userId: string,
  limit = 50
): Promise<AppNotification[]> {
  const store = await readStore();
  return store.notifications
    .filter((n) => n.audience === audience && n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function getUnreadNotificationCount(
  audience: NotificationAudience,
  userId: string
): Promise<number> {
  const store = await readStore();
  return store.notifications.filter(
    (n) => n.audience === audience && n.userId === userId && !n.readAt
  ).length;
}

export async function markNotificationsRead(
  audience: NotificationAudience,
  userId: string,
  ids?: string[]
): Promise<number> {
  const store = await readStore();
  const now = new Date().toISOString();
  let changed = 0;
  for (const n of store.notifications) {
    if (n.audience !== audience || n.userId !== userId || n.readAt) continue;
    if (ids && ids.length > 0 && !ids.includes(n.id)) continue;
    n.readAt = now;
    changed += 1;
  }
  if (changed > 0) await writeStore(store);
  return changed;
}

/** Résout l'id compte particulier lié à une demande. */
export async function resolveClientUserIdForRequest(
  workRequest: WorkRequest
): Promise<string | null> {
  if (workRequest.clientId) return workRequest.clientId;
  const client = await getClientByEmail(workRequest.email);
  return client?.id ?? null;
}
