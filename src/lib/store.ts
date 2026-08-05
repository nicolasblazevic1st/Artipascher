import { promises as fs } from "fs";
import path from "path";
import { hashPassword, verifyPassword, validatePassword } from "./password";
import { randomBytes } from "crypto";
import { computeCurrentPrice, MAX_BIDS_PER_AUCTION } from "./auctions";
import {
  generateReferralCode,
  isValidReferralCodeFormat,
  normalizeReferralCode,
} from "./referral";
import { createShareToken } from "./share";
import { getSampleQuotesForAuction } from "./sample-quotes";
import { getValidatedDecennaleLabelsForWorkCategory } from "./decennale-verification";
import {
  DEFAULT_SMS_SETTINGS,
  EMPTY_STORE,
  REFERRAL_REWARD_CREDITS,
  REFERRAL_SPEND_THRESHOLD,
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
  type ProCreditTransaction,
  type ProCreditWallet,
  type ProQuote,
  type PasswordResetToken,
  type PasswordResetUserType,
  type ProDocument,
  type ProRegistration,
  type SmsCampaign,
  type SmsCampaignSettings,
  type WorkRequest,
} from "./store-types";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

/** Anciennes demandes stockées avec `budget` avant migration vers startPrice. */
type LegacyWorkRequest = WorkRequest & { budget?: number };

function normalizeWorkRequest(request: LegacyWorkRequest): WorkRequest {
  const { budget, ...rest } = request;
  return {
    ...rest,
    startPrice: rest.startPrice ?? budget,
  };
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
  return {
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
    smsCampaigns: parsed.smsCampaigns ?? [],
    smsSettings: {
      ...DEFAULT_SMS_SETTINGS,
      ...(parsed.smsSettings ?? {}),
    },
    creditWallets: parsed.creditWallets ?? [],
    creditTransactions: parsed.creditTransactions ?? [],
  };
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
  const entry: WorkRequest = {
    ...data,
    photos: data.photos ?? [],
    id: newId("req"),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  store.workRequests.unshift(entry);
  await writeStore(store);
  return entry;
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
    >
  >
): Promise<ProRegistration | null> {
  const store = await readStore();
  const index = store.proRegistrations.findIndex((p) => p.id === id);
  if (index === -1) return null;
  store.proRegistrations[index] = {
    ...store.proRegistrations[index],
    ...patch,
    reviewedAt: patch.reviewedAt ?? new Date().toISOString(),
  };
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
  pro.qualificationLevel = 1;

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

  return {
    pendingPros,
    pendingRequests,
    pendingQuotes,
    approvedPros,
    totalPros: store.proRegistrations.length,
    totalClients: store.clientAccounts.length,
    totalRequests: store.workRequests.length,
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

export async function authenticatePro(
  email: string,
  password: string
): Promise<ProRegistration | null> {
  const pro = await getApprovedProByEmail(email);
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

export async function addContactUnlock(data: {
  proId: string;
  auctionId: string;
  amountEur: number;
  stripeSessionId?: string;
}) {
  const store = await readStore();
  const existing = store.contactUnlocks.find(
    (u) => u.proId === data.proId && u.auctionId === data.auctionId
  );
  if (existing) return existing;

  const entry = {
    id: newId("unlock"),
    ...data,
    paidAt: new Date().toISOString(),
  };
  store.contactUnlocks.push(entry);
  await writeStore(store);
  return entry;
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

export async function getQualificationLevelForPro(proId: string): Promise<1 | 2 | 3> {
  const pro = await getApprovedProById(proId);
  return pro?.qualificationLevel ?? 1;
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
      return {
        ...bid,
        qualificationLevel: pro?.qualificationLevel ?? 1,
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
      return {
        ...quote,
        qualificationLevel: pro?.qualificationLevel ?? 1,
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

export async function addProQuote(data: {
  workRequestId: string;
  auctionId: string;
  proId: string;
  companyName: string;
  visitDate: string;
  amount: number;
  description: string;
}): Promise<ProQuote | { error: string }> {
  const store = await readStore();
  const existing = store.proQuotes.find(
    (q) => q.proId === data.proId && q.auctionId === data.auctionId
  );

  if (existing && existing.status !== "rejected") {
    return { error: "Vous avez déjà déposé un devis pour ce chantier." };
  }

  const entry: ProQuote = {
    id: newId("quote"),
    ...data,
    description: data.description.trim(),
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
    if (requestIndex !== -1 && store.workRequests[requestIndex].startPriceQuoteId == null) {
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

export async function createContactRequest(data: {
  auctionId: string;
  workRequestId: string;
  proId: string;
}): Promise<{ request: ContactRequest } | { error: string }> {
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

  const now = new Date();
  const request: ContactRequest = {
    id: newId("creq"),
    auctionId: data.auctionId,
    workRequestId: data.workRequestId,
    proId: data.proId,
    status: "pending",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CONTACT_REQUEST_TTL_MS).toISOString(),
  };
  store.contactRequests.unshift(request);
  await writeStore(store);
  return { request };
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

  store.contactRequests[index].status = decision;
  store.contactRequests[index].decidedAt = new Date().toISOString();
  await writeStore(store);
  return { request: store.contactRequests[index] };
}

export async function getSmsSettings(): Promise<SmsCampaignSettings> {
  const store = await readStore();
  return { ...DEFAULT_SMS_SETTINGS, ...(store.smsSettings ?? {}) };
}

export async function updateSmsSettings(
  patch: Partial<SmsCampaignSettings>
): Promise<SmsCampaignSettings> {
  const store = await readStore();
  store.smsSettings = {
    ...DEFAULT_SMS_SETTINGS,
    ...(store.smsSettings ?? {}),
    ...patch,
  };
  await writeStore(store);
  return store.smsSettings;
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

export async function markProspectsContacted(sirets: string[]): Promise<void> {
  if (sirets.length === 0) return;
  const store = await readStore();
  const now = new Date().toISOString();
  const set = new Set(sirets);
  let changed = false;
  for (const p of store.artisanProspects) {
    if (set.has(p.siret)) {
      p.lastContactedAt = now;
      p.updatedAt = now;
      changed = true;
    }
  }
  if (changed) await writeStore(store);
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
    auctionId?: string;
    workRequestId?: string;
    stripeSessionId?: string;
    note?: string;
  }
): Promise<{ balance: number; transaction: ProCreditTransaction } | { error: string }> {
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

  const next = wallet.balance + data.amount;
  if (next < 0) {
    return { error: "Solde de crédits insuffisant." };
  }

  if (data.stripeSessionId) {
    const dup = store.creditTransactions.find(
      (t) => t.stripeSessionId === data.stripeSessionId
    );
    if (dup) {
      return { balance: wallet.balance, transaction: dup };
    }
  }

  wallet.balance = next;
  wallet.updatedAt = new Date().toISOString();

  const transaction: ProCreditTransaction = {
    id: newId("ctx"),
    proId: data.proId,
    type: data.type,
    amount: data.amount,
    balanceAfter: next,
    auctionId: data.auctionId,
    workRequestId: data.workRequestId,
    stripeSessionId: data.stripeSessionId,
    note: data.note,
    createdAt: new Date().toISOString(),
  };
  store.creditTransactions.unshift(transaction);
  return { balance: next, transaction };
}

export async function creditProWallet(data: {
  proId: string;
  type: CreditTxnType;
  amount: number;
  auctionId?: string;
  workRequestId?: string;
  stripeSessionId?: string;
  note?: string;
}): Promise<{ balance: number; transaction: ProCreditTransaction } | { error: string }> {
  if (data.amount <= 0) return { error: "Le crédit doit être positif." };
  const store = await readStore();
  const result = await applyCreditDelta(store, data);
  if ("error" in result) return result;
  await writeStore(store);
  return result;
}

export async function spendProCredit(data: {
  proId: string;
  type: "spend_unlock" | "spend_bid";
  auctionId?: string;
  workRequestId?: string;
  note?: string;
}): Promise<{ balance: number; transaction: ProCreditTransaction } | { error: string }> {
  const store = await readStore();
  const result = await applyCreditDelta(store, {
    ...data,
    amount: -1,
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
  const pro = store.proRegistrations.find((p) => p.id === proId);
  if (!isEligibleReferrer(pro)) return null;
  if (pro.referralCode) return normalizeReferralCode(pro.referralCode);
  const code = allocateUniqueReferralCode(store);
  pro.referralCode = code;
  return code;
}

export async function ensureProReferralCode(proId: string): Promise<string | null> {
  const store = await readStore();
  const code = ensureReferralCodeInStore(store, proId);
  if (!code) return null;
  await writeStore(store);
  return code;
}

export async function findProByReferralCode(
  rawCode: string
): Promise<ProRegistration | null> {
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
    note: `Parrainage — ${spender.companyName} a dépensé ${REFERRAL_SPEND_THRESHOLD} crédits`,
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
