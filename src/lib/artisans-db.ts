import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import {
  EMPTY_ARTISANS_DB,
  type ArtisansEnrichmentDb,
  type EnrichedArtisan,
  type EnrichmentJob,
  type EnrichmentJobKind,
  type QuotaTracking,
} from "./artisans-types";

const DB_PATH = path.join(process.cwd(), "data", "artisans-enrichment.json");

let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function isRetryableFsError(err: unknown): boolean {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code)
      : "";
  return code === "EBUSY" || code === "EPERM" || code === "EACCES" || code === "EAGAIN";
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function withFsRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isRetryableFsError(err) || attempt === 7) throw err;
      await sleep(40 * (attempt + 1));
    }
  }
  throw last instanceof Error ? last : new Error(`${label} failed`);
}

async function ensureDb(): Promise<void> {
  const dir = path.dirname(DB_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(EMPTY_ARTISANS_DB, null, 2), "utf-8");
  }
}

export async function readArtisansDb(): Promise<ArtisansEnrichmentDb> {
  await ensureDb();
  const raw = await withFsRetry("readArtisansDb", () =>
    fs.readFile(DB_PATH, "utf-8")
  );
  try {
    const parsed = JSON.parse(raw) as Partial<ArtisansEnrichmentDb>;
    return {
      artisans: parsed.artisans ?? [],
      quotaTracking: parsed.quotaTracking ?? [],
      jobs: parsed.jobs ?? [],
    };
  } catch {
    return { ...EMPTY_ARTISANS_DB, artisans: [], quotaTracking: [], jobs: [] };
  }
}

async function writeArtisansDb(db: ArtisansEnrichmentDb): Promise<void> {
  await ensureDb();
  const payload = JSON.stringify(db, null, 2);
  // Windows: éviter rename-overwrite (EPERM) et réessayer si le fichier est verrouillé (EBUSY).
  await withFsRetry("writeArtisansDb", async () => {
    const tmp = `${DB_PATH}.${process.pid}.${Date.now()}.${randomBytes(2).toString("hex")}.tmp`;
    try {
      await fs.writeFile(tmp, payload, "utf-8");
      await fs.copyFile(tmp, DB_PATH);
    } finally {
      await fs.unlink(tmp).catch(() => undefined);
    }
  });
}

export function currentMonthKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function currentDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysInMonth(date = new Date()): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function defaultMonthlyLimit(): number {
  const n = Number(process.env.GOOGLE_PLACES_MONTHLY_QUOTA ?? 5000);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5000;
}

export function isPaidOverageEnabled(): boolean {
  return process.env.GOOGLE_PLACES_PAID_OVERAGE === "true";
}

export async function getOrCreateQuota(monthKey?: string): Promise<QuotaTracking> {
  return enqueueWrite(async () => {
    const db = await readArtisansDb();
    const key = monthKey ?? currentMonthKey();
    let row = db.quotaTracking.find((q) => q.monthKey === key);
    if (!row) {
      row = {
        monthKey: key,
        monthlyLimit: defaultMonthlyLimit(),
        requestsProduction: 0,
        requestsEnrichment: 0,
        dailyProductionLog: {},
        enrichmentCarryover: 0,
        enrichmentPaused: false,
        paidOverageEnabled: isPaidOverageEnabled(),
        updatedAt: new Date().toISOString(),
      };
      db.quotaTracking.push(row);
      await writeArtisansDb(db);
    } else {
      row.paidOverageEnabled = isPaidOverageEnabled();
      row.monthlyLimit = defaultMonthlyLimit();
    }
    return { ...row };
  });
}

export async function updateQuota(
  mutate: (q: QuotaTracking) => void
): Promise<QuotaTracking> {
  return enqueueWrite(async () => {
    const db = await readArtisansDb();
    const key = currentMonthKey();
    let row = db.quotaTracking.find((q) => q.monthKey === key);
    if (!row) {
      row = {
        monthKey: key,
        monthlyLimit: defaultMonthlyLimit(),
        requestsProduction: 0,
        requestsEnrichment: 0,
        dailyProductionLog: {},
        enrichmentCarryover: 0,
        enrichmentPaused: false,
        paidOverageEnabled: isPaidOverageEnabled(),
        updatedAt: new Date().toISOString(),
      };
      db.quotaTracking.push(row);
    }
    mutate(row);
    row.updatedAt = new Date().toISOString();
    row.paidOverageEnabled = isPaidOverageEnabled();
    row.monthlyLimit = defaultMonthlyLimit();
    await writeArtisansDb(db);
    return { ...row };
  });
}

export async function upsertArtisan(
  data: Omit<EnrichedArtisan, "createdAt" | "updatedAt"> & {
    createdAt?: string;
  },
  options?: { preserveContact?: boolean }
): Promise<EnrichedArtisan> {
  return enqueueWrite(async () => {
    const db = await readArtisansDb();
    const now = new Date().toISOString();
    const index = db.artisans.findIndex((a) => a.siret === data.siret);
    const preserve = options?.preserveContact !== false;

    if (index === -1) {
      const entry: EnrichedArtisan = {
        ...data,
        createdAt: data.createdAt ?? now,
        updatedAt: now,
      };
      db.artisans.push(entry);
      await writeArtisansDb(db);
      return entry;
    }

    const existing = db.artisans[index];
    const next: EnrichedArtisan = {
      ...existing,
      ...data,
      phone: preserve && existing.phone ? existing.phone : data.phone,
      website: preserve && existing.website ? existing.website : data.website,
      enrichmentStatus:
        preserve && existing.phone && data.enrichmentStatus === "pending"
          ? existing.enrichmentStatus
          : data.enrichmentStatus ?? existing.enrichmentStatus,
      enrichedAt: existing.enrichedAt,
      lastVerifiedAt: existing.lastVerifiedAt,
      lastSmsFailedAt: existing.lastSmsFailedAt,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    // Explicit contact overwrite when preserveContact=false
    if (!preserve) {
      next.phone = data.phone;
      next.website = data.website;
      next.enrichmentStatus = data.enrichmentStatus;
      next.enrichedAt = data.enrichedAt;
      next.lastVerifiedAt = data.lastVerifiedAt;
    }
    db.artisans[index] = next;
    await writeArtisansDb(db);
    return next;
  });
}

export async function updateArtisanBySiret(
  siret: string,
  patch: Partial<EnrichedArtisan>
): Promise<EnrichedArtisan | null> {
  return enqueueWrite(async () => {
    const db = await readArtisansDb();
    const index = db.artisans.findIndex((a) => a.siret === siret);
    if (index === -1) return null;
    db.artisans[index] = {
      ...db.artisans[index],
      ...patch,
      siret: db.artisans[index].siret,
      updatedAt: new Date().toISOString(),
    };
    await writeArtisansDb(db);
    return db.artisans[index];
  });
}

export async function getArtisanBySiret(
  siret: string
): Promise<EnrichedArtisan | null> {
  const db = await readArtisansDb();
  return db.artisans.find((a) => a.siret === siret) ?? null;
}

export async function listArtisans(filter?: {
  department?: "59" | "62";
  status?: EnrichedArtisan["status"];
  enrichmentStatus?: EnrichedArtisan["enrichmentStatus"];
}): Promise<EnrichedArtisan[]> {
  const db = await readArtisansDb();
  return db.artisans.filter((a) => {
    if (filter?.department && a.department !== filter.department) return false;
    if (filter?.status && a.status !== filter.status) return false;
    if (filter?.enrichmentStatus && a.enrichmentStatus !== filter.enrichmentStatus)
      return false;
    return true;
  });
}

export async function markArtisansClosed(
  sirets: string[],
  closedAt = new Date().toISOString()
): Promise<number> {
  if (sirets.length === 0) return 0;
  return enqueueWrite(async () => {
    const db = await readArtisansDb();
    const set = new Set(sirets);
    let n = 0;
    for (const a of db.artisans) {
      if (set.has(a.siret) && a.status === "active") {
        a.status = "closed";
        a.closedAt = closedAt;
        a.updatedAt = closedAt;
        n += 1;
      }
    }
    if (n > 0) await writeArtisansDb(db);
    return n;
  });
}

export async function addEnrichmentJob(
  data: Omit<EnrichmentJob, "id"> & { id?: string }
): Promise<EnrichmentJob> {
  return enqueueWrite(async () => {
    const db = await readArtisansDb();
    const job: EnrichmentJob = {
      id: data.id ?? `job-${Date.now()}-${randomBytes(3).toString("hex")}`,
      kind: data.kind,
      ranAt: data.ranAt,
      requestsSpent: data.requestsSpent,
      processed: data.processed,
      skipped: data.skipped,
      errors: data.errors.slice(0, 50),
      note: data.note,
    };
    db.jobs.unshift(job);
    db.jobs = db.jobs.slice(0, 100);
    await writeArtisansDb(db);
    return job;
  });
}

export async function getArtisansStats() {
  const db = await readArtisansDb();
  const quota = await getOrCreateQuota();
  const active = db.artisans.filter((a) => a.status === "active");
  const withPhone = active.filter((a) => Boolean(a.phone?.trim()));
  const pending = active.filter((a) => a.enrichmentStatus === "pending");
  const invalid = active.filter((a) => a.enrichmentStatus === "invalid_phone");
  const used = quota.requestsProduction + quota.requestsEnrichment;
  return {
    total: db.artisans.length,
    active: active.length,
    closed: db.artisans.length - active.length,
    withPhone: withPhone.length,
    pendingEnrichment: pending.length,
    invalidPhone: invalid.length,
    geocoded: active.filter((a) => a.lat != null && a.lon != null).length,
    quota,
    remaining: Math.max(0, quota.monthlyLimit - used),
    recentJobs: db.jobs.slice(0, 10),
  };
}

export type { EnrichmentJobKind };
