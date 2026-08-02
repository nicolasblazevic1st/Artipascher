import { promises as fs } from "fs";
import path from "path";
import { hashPassword, verifyPassword, validatePassword } from "./password";
import { createShareToken } from "./share";
import {
  EMPTY_STORE,
  type Bid,
  type ClientAccount,
  type ContactUnlock,
  type DataStore,
  type ProRegistration,
  type WorkRequest,
} from "./store-types";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

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
    workRequests: parsed.workRequests ?? [],
    contactUnlocks: parsed.contactUnlocks ?? [],
    bids: parsed.bids ?? [],
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

export async function updateProRegistration(
  id: string,
  patch: Partial<Pick<ProRegistration, "status" | "adminNote" | "reviewedAt">>
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

  return {
    pendingPros,
    pendingRequests,
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

export async function getClientDashboardStats(clientId: string) {
  const requests = await getWorkRequestsByClientId(clientId);
  const pending = requests.filter((r) => r.status === "pending").length;
  const active = requests.filter(
    (r) => r.status === "approved" && !r.selectedBidId
  ).length;
  const chosen = requests.filter((r) => r.selectedBidId).length;

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
