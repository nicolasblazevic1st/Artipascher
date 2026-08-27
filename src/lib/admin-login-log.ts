import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { normalizeStoredClientIp } from "@/lib/request-client";

const LOG_PATH = path.join(process.cwd(), "data", "admin-login-log.json");
const MAX_ENTRIES = 500;

export type AdminLoginFailureReason =
  | "invalid_password"
  | "rate_limited"
  | "invalid_request";

export interface AdminLoginLogEntry {
  id: string;
  at: string;
  ip: string;
  userAgent: string;
  success: boolean;
  reason?: AdminLoginFailureReason | "ok";
}

interface AdminLoginLogDb {
  entries: AdminLoginLogEntry[];
}

const EMPTY: AdminLoginLogDb = { entries: [] };

let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function ensureLog(): Promise<void> {
  const dir = path.dirname(LOG_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(LOG_PATH);
  } catch {
    await fs.writeFile(LOG_PATH, JSON.stringify(EMPTY, null, 2), "utf-8");
  }
}

async function readLogDb(): Promise<AdminLoginLogDb> {
  await ensureLog();
  try {
    const raw = await fs.readFile(LOG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AdminLoginLogDb>;
    return { entries: parsed.entries ?? [] };
  } catch {
    return { ...EMPTY };
  }
}

async function writeLogDb(db: AdminLoginLogDb): Promise<void> {
  await ensureLog();
  await fs.writeFile(LOG_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export async function appendAdminLoginLog(
  entry: Omit<AdminLoginLogEntry, "id" | "at"> & { at?: string }
): Promise<AdminLoginLogEntry> {
  return enqueueWrite(async () => {
    const db = await readLogDb();
    const row: AdminLoginLogEntry = {
      id: randomBytes(8).toString("hex"),
      at: entry.at ?? new Date().toISOString(),
      ip: entry.ip,
      userAgent: entry.userAgent,
      success: entry.success,
      reason: entry.reason,
    };
    db.entries.unshift(row);
    if (db.entries.length > MAX_ENTRIES) {
      db.entries = db.entries.slice(0, MAX_ENTRIES);
    }
    await writeLogDb(db);
    return row;
  });
}

export async function listAdminLoginLog(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ entries: AdminLoginLogEntry[]; total: number }> {
  const db = await readLogDb();
  const limit = Math.min(200, Math.max(1, options?.limit ?? 50));
  const offset = Math.max(0, options?.offset ?? 0);
  return {
    total: db.entries.length,
    entries: db.entries.slice(offset, offset + limit),
  };
}

export async function listSuccessfulAdminLoginIps(): Promise<string[]> {
  const db = await readLogDb();
  const ips = new Set<string>();
  for (const entry of db.entries) {
    if (!entry.success) continue;
    const ip = normalizeStoredClientIp(entry.ip);
    if (ip) ips.add(ip);
  }
  return [...ips];
}

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_FAILURES = 5;

/** Bloque après trop d'échecs depuis la même IP (fenêtre glissante). */
export async function isAdminLoginRateLimited(ip: string): Promise<boolean> {
  if (ip === "unknown") return false;
  const db = await readLogDb();
  const since = Date.now() - RATE_LIMIT_WINDOW_MS;
  const failures = db.entries.filter(
    (e) =>
      e.ip === ip &&
      !e.success &&
      e.reason !== "rate_limited" &&
      new Date(e.at).getTime() >= since
  );
  return failures.length >= RATE_LIMIT_MAX_FAILURES;
}

export function adminLoginRateLimitMessage(): string {
  return "Trop de tentatives. Réessayez dans 15 minutes.";
}
