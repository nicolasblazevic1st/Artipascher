import { promises as fs } from "fs";
import path from "path";
import { listSuccessfulAdminLoginIps } from "@/lib/admin-login-log";
import { normalizeStoredClientIp } from "@/lib/request-client";

const DB_PATH = path.join(process.cwd(), "data", "admin-known-ips.json");
const RETENTION_DAYS = 90;
const MAX_IPS = 200;
const REMEMBER_COOLDOWN_MS = 10 * 60 * 1000;
const LIST_CACHE_MS = 30_000;

interface KnownAdminIp {
  ip: string;
  lastSeenAt: string;
}

interface KnownAdminIpsDb {
  ips: KnownAdminIp[];
}

const EMPTY: KnownAdminIpsDb = { ips: [] };

let writeQueue: Promise<void> = Promise.resolve();
const lastRemember = new Map<string, number>();
let listCache: { at: number; ips: Set<string> } | null = null;

function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function ensureDb(): Promise<void> {
  const dir = path.dirname(DB_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(EMPTY), "utf-8");
  }
}

function prune(rows: KnownAdminIp[], now = Date.now()): KnownAdminIp[] {
  const cutoff = now - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const kept = rows.filter((row) => {
    const t = Date.parse(row.lastSeenAt);
    return Number.isFinite(t) && t >= cutoff && Boolean(normalizeStoredClientIp(row.ip));
  });
  if (kept.length <= MAX_IPS) return kept;
  return kept
    .slice()
    .sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt))
    .slice(0, MAX_IPS);
}

async function readDb(): Promise<KnownAdminIpsDb> {
  await ensureDb();
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<KnownAdminIpsDb>;
    return { ips: Array.isArray(parsed.ips) ? prune(parsed.ips) : [] };
  } catch {
    return { ips: [] };
  }
}

async function writeDb(db: KnownAdminIpsDb): Promise<void> {
  await ensureDb();
  await fs.writeFile(DB_PATH, JSON.stringify(db), "utf-8");
}

/** Remember an IP that reached the admin panel or logged in. */
export async function rememberAdminAccessIp(raw: string): Promise<void> {
  const ip = normalizeStoredClientIp(raw);
  if (!ip) return;
  const now = Date.now();
  if ((lastRemember.get(ip) ?? 0) > now - REMEMBER_COOLDOWN_MS) return;
  lastRemember.set(ip, now);

  await enqueueWrite(async () => {
    const db = await readDb();
    const at = new Date().toISOString();
    const index = db.ips.findIndex((row) => row.ip === ip);
    if (index >= 0) db.ips[index] = { ip, lastSeenAt: at };
    else db.ips.push({ ip, lastSeenAt: at });
    db.ips = prune(db.ips);
    await writeDb(db);
    listCache = null;
  });
}

export async function listKnownAdminIps(): Promise<Set<string>> {
  if (listCache && Date.now() - listCache.at < LIST_CACHE_MS) {
    return listCache.ips;
  }
  const db = await readDb();
  const ips = new Set<string>();
  for (const row of db.ips) {
    const ip = normalizeStoredClientIp(row.ip);
    if (ip) ips.add(ip);
  }
  for (const ip of await listSuccessfulAdminLoginIps()) {
    ips.add(ip);
  }
  listCache = { at: Date.now(), ips };
  return ips;
}
