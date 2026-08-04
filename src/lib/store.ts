import { promises as fs } from "fs";
import path from "path";
import { hashPassword, verifyPassword, validatePassword } from "./password";
import { randomBytes } from "crypto";
import { createShareToken } from "./share";
import { getSampleQuotesForAuction } from "./sample-quotes";
import { getValidatedDecennaleLabelsForWorkCategory } from "./decennale-verification";
import {
  EMPTY_STORE,
  type Bid,
  type ClientAccount,
  type ContactUnlock,
  type DataStore,
  type DecennaleVerificationStatus,
  type ProQuote,
  type PasswordResetToken,
  type PasswordResetUserType,
  type ProDocument,
  type ProRegistration,
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
    bids: parsed.bids ?? [],
    proQuotes: parsed.proQuotes ?? [],
    passwordResetTokens: parsed.passwordResetTokens ?? [],
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
    (p) => p.email.toLowerCase() === data.email.toLowerCase()
  );
  if (emailTaken) {
    throw new Error("EMAIL_ALREADY_USED");
  }

  const entry: ProRegistration = {
    ...data,
    id: newId("pro"),
    status: "pending",
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
    Pick<ProRegistration, "status" | "adminNote" | "reviewedAt" | "qualificationLevel">
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

export async function addBid(data: {
  auctionId: string;
  proId: string;
  companyName: string;
  amount: number;
  feeEur: number;
  stripeSessionId?: string;
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

export async function getApprovedProById(proId: string): Promise<ProRegistration | null> {
  const store = await readStore();
  const pro = store.proRegistrations.find((p) => p.id === proId && p.status === "approved");
  return pro ?? null;
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
}): Promise<{ client: ClientAccount } | { error: string }> {
  const store = await readStore();
  const emailLower = data.email.toLowerCase();
  const existing = store.clientAccounts.find((c) => c.email.toLowerCase() === emailLower);

  if (existing) {
    if (!verifyPassword(data.password, existing.passwordHash)) {
      return {
        error:
          "Un compte existe déjà avec cet email. Connectez-vous à votre espace particulier ou utilisez le bon mot de passe.",
      };
    }
    return { client: existing };
  }

  const passwordError = validatePassword(data.password);
  if (passwordError) return { error: passwordError };

  const client: ClientAccount = {
    id: newId("client"),
    email: data.email.trim(),
    passwordHash: hashPassword(data.password),
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    createdAt: new Date().toISOString(),
  };
  store.clientAccounts.push(client);
  await writeStore(store);
  return { client };
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
  }

  await writeStore(store);
  return store.proQuotes[index];
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

function createPasswordResetTokenValue(): string {
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
    token: createPasswordResetTokenValue(),
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
