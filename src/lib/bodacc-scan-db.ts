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
