import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const ACTIVE_DB_PATH = path.join(DATA_DIR, "bodacc-active-procedures.json");
const PROGRESS_PATH = path.join(DATA_DIR, "bodacc-scan-progress.json");

export interface ActiveBodaccEntry {
  siren: string;
  checkedAt: string;
  nature?: string;
  dateParution?: string;
  announcementId?: string;
  url?: string;
  companyName?: string;
  city?: string;
  department?: string;
  siretSample?: string;
}

export interface ActiveBodaccDb {
  updatedAt: string;
  source: string;
  scannedSirens: number;
  activeCount: number;
  active: ActiveBodaccEntry[];
}

export interface BodaccScanProgress {
  updatedAt: string;
  checked: Record<string, "clear" | "active_procedure" | "unavailable">;
  stats: {
    clear: number;
    active_procedure: number;
    unavailable: number;
  };
}

const EMPTY_ACTIVE: ActiveBodaccDb = {
  updatedAt: "",
  source: "artisans-enrichment.json",
  scannedSirens: 0,
  activeCount: 0,
  active: [],
};

const EMPTY_PROGRESS: BodaccScanProgress = {
  updatedAt: "",
  checked: {},
  stats: { clear: 0, active_procedure: 0, unavailable: 0 },
};

async function readJsonSafe<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function readBodaccActiveDb(): Promise<ActiveBodaccDb> {
  return readJsonSafe(ACTIVE_DB_PATH, EMPTY_ACTIVE);
}

export async function readBodaccScanProgress(): Promise<BodaccScanProgress> {
  return readJsonSafe(PROGRESS_PATH, EMPTY_PROGRESS);
}

export type BodaccPreviewStatus =
  | "clear"
  | "active_procedure"
  | "unavailable"
  | "unchecked";

export interface BodaccPreviewRow {
  status: BodaccPreviewStatus;
  nature?: string;
  source: "scan" | "live";
}

function sirenKey(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 9);
}

/**
 * Statut BODACC pour une liste de SIREN : d’abord le scan local,
 * puis contrôle API des SIREN encore inconnus (lot SMS).
 */
export async function lookupBodaccForSirens(
  sirens: string[],
  options?: { liveCheckUnchecked?: boolean; liveLimit?: number }
): Promise<Map<string, BodaccPreviewRow>> {
  const keys = [
    ...new Set(sirens.map(sirenKey).filter((s) => s.length === 9)),
  ];
  const [progress, activeDb] = await Promise.all([
    readBodaccScanProgress(),
    readBodaccActiveDb(),
  ]);
  const activeBySiren = new Map(
    activeDb.active.map((row) => [sirenKey(row.siren), row])
  );

  const out = new Map<string, BodaccPreviewRow>();
  const unchecked: string[] = [];

  for (const siren of keys) {
    const active = activeBySiren.get(siren);
    if (active) {
      out.set(siren, {
        status: "active_procedure",
        nature: active.nature,
        source: "scan",
      });
      continue;
    }
    const scanned = progress.checked[siren];
    if (scanned) {
      out.set(siren, { status: scanned, source: "scan" });
      continue;
    }
    unchecked.push(siren);
    out.set(siren, { status: "unchecked", source: "scan" });
  }

  if (options?.liveCheckUnchecked === false || unchecked.length === 0) {
    return out;
  }

  const { checkBodaccCollectiveProcedures } = await import("./bodacc");
  const limit = Math.min(
    unchecked.length,
    Math.max(0, options?.liveLimit ?? 40)
  );
  const toCheck = unchecked.slice(0, limit);
  const concurrency = 6;

  for (let i = 0; i < toCheck.length; i += concurrency) {
    const chunk = toCheck.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map((siren) => checkBodaccCollectiveProcedures(siren))
    );
    for (const result of results) {
      const key = sirenKey(result.siren);
      out.set(key, {
        status: result.status,
        nature: result.latestBlocking?.nature,
        source: "live",
      });
    }
  }

  return out;
}
