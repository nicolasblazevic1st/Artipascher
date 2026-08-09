/**
 * Scan BODACC (procédures collectives) sur tous les SIREN de la base artisans.
 * Écrit uniquement les hits « procédure active » dans data/bodacc-active-procedures.json.
 *
 * Usage :
 *   npx tsx scripts/scan-bodacc-procedures.mts
 *   npx tsx scripts/scan-bodacc-procedures.mts --limit=200
 *   npx tsx scripts/scan-bodacc-procedures.mts --delay-ms=250 --concurrency=2
 *   npx tsx scripts/scan-bodacc-procedures.mts --reset   # recommence le progrès
 */
import { promises as fs } from "fs";
import path from "path";
import { checkBodaccCollectiveProcedures } from "../src/lib/bodacc";
import { readArtisansDb } from "../src/lib/artisans-db";

const DATA_DIR = path.join(process.cwd(), "data");
const PROGRESS_PATH = path.join(DATA_DIR, "bodacc-scan-progress.json");
const ACTIVE_DB_PATH = path.join(DATA_DIR, "bodacc-active-procedures.json");

interface ActiveBodaccEntry {
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

interface ActiveBodaccDb {
  updatedAt: string;
  source: "artisans-enrichment.json";
  scannedSirens: number;
  activeCount: number;
  active: ActiveBodaccEntry[];
}

interface ScanProgress {
  updatedAt: string;
  checked: Record<string, "clear" | "active_procedure" | "unavailable">;
  stats: {
    clear: number;
    active_procedure: number;
    unavailable: number;
  };
}

function parseArgs(argv: string[]) {
  let limit: number | undefined;
  let delayMs = 250;
  let concurrency = 2;
  let reset = false;
  for (const arg of argv) {
    if (arg === "--reset") reset = true;
    else if (arg.startsWith("--limit=")) {
      limit = Math.max(1, Number(arg.slice("--limit=".length)) || 0) || undefined;
    } else if (arg.startsWith("--delay-ms=")) {
      delayMs = Math.max(0, Number(arg.slice("--delay-ms=".length)) || 250);
    } else if (arg.startsWith("--concurrency=")) {
      concurrency = Math.min(
        5,
        Math.max(1, Number(arg.slice("--concurrency=".length)) || 2)
      );
    }
  }
  return { limit, delayMs, concurrency, reset };
}

async function readJsonSafe<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, data: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}

function emptyProgress(): ScanProgress {
  return {
    updatedAt: new Date().toISOString(),
    checked: {},
    stats: { clear: 0, active_procedure: 0, unavailable: 0 },
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const { limit, delayMs, concurrency, reset } = parseArgs(process.argv.slice(2));

  console.log("=== Scan BODACC → base procédures actives ===");
  console.log({ limit: limit ?? "all", delayMs, concurrency, reset });

  const db = await readArtisansDb();
  const bySiren = new Map<
    string,
    { companyName: string; city: string; department: string; siret: string }
  >();

  for (const a of db.artisans) {
    const siren = (a.siren || a.siret?.slice(0, 9) || "").replace(/\D/g, "");
    if (!/^\d{9}$/.test(siren)) continue;
    if (bySiren.has(siren)) continue;
    bySiren.set(siren, {
      companyName: a.companyName,
      city: a.city,
      department: a.department,
      siret: a.siret,
    });
  }

  const allSirens = [...bySiren.keys()].sort();
  console.log(`SIREN uniques dans la base : ${allSirens.length}`);

  let progress = reset
    ? emptyProgress()
    : await readJsonSafe<ScanProgress>(PROGRESS_PATH, emptyProgress());
  let activeDb = reset
    ? {
        updatedAt: new Date().toISOString(),
        source: "artisans-enrichment.json" as const,
        scannedSirens: 0,
        activeCount: 0,
        active: [] as ActiveBodaccEntry[],
      }
    : await readJsonSafe<ActiveBodaccDb>(ACTIVE_DB_PATH, {
        updatedAt: new Date().toISOString(),
        source: "artisans-enrichment.json",
        scannedSirens: 0,
        activeCount: 0,
        active: [],
      });

  const activeBySiren = new Map(activeDb.active.map((e) => [e.siren, e]));

  const pending = allSirens.filter((s) => !progress.checked[s]);
  const queue = limit ? pending.slice(0, limit) : pending;
  console.log(
    `Déjà scannés : ${Object.keys(progress.checked).length} · à faire maintenant : ${queue.length}`
  );

  if (queue.length === 0) {
    console.log("Rien à scanner.");
    console.log("Hits procédure active :", activeBySiren.size);
    console.log("Fichier :", ACTIVE_DB_PATH);
    return;
  }

  let done = 0;
  let idx = 0;
  const started = Date.now();

  async function persist() {
    progress.updatedAt = new Date().toISOString();
    activeDb = {
      updatedAt: progress.updatedAt,
      source: "artisans-enrichment.json",
      scannedSirens: Object.keys(progress.checked).length,
      activeCount: activeBySiren.size,
      active: [...activeBySiren.values()].sort((a, b) =>
        a.siren.localeCompare(b.siren)
      ),
    };
    await writeJson(PROGRESS_PATH, progress);
    await writeJson(ACTIVE_DB_PATH, activeDb);
  }

  async function worker() {
    while (idx < queue.length) {
      const i = idx++;
      const siren = queue[i]!;
      const check = await checkBodaccCollectiveProcedures(siren);
      const status = check.status;
      progress.checked[siren] = status;
      progress.stats[status] = (progress.stats[status] ?? 0) + 1;

      if (status === "active_procedure") {
        const meta = bySiren.get(siren);
        activeBySiren.set(siren, {
          siren,
          checkedAt: check.checkedAt,
          nature: check.latestBlocking?.nature,
          dateParution: check.latestBlocking?.dateParution,
          announcementId: check.latestBlocking?.id,
          url: check.latestBlocking?.url,
          companyName: meta?.companyName,
          city: meta?.city,
          department: meta?.department,
          siretSample: meta?.siret,
        });
        console.log(
          `  HIT ${siren} · ${meta?.companyName ?? "?"} · ${check.latestBlocking?.nature ?? "procédure"}`
        );
      }

      done++;
      if (done % 25 === 0 || done === queue.length) {
        const elapsed = (Date.now() - started) / 1000;
        const rate = done / Math.max(elapsed, 0.001);
        console.log(
          `… ${done}/${queue.length} (${rate.toFixed(1)}/s) · clear=${progress.stats.clear} active=${progress.stats.active_procedure} unavailable=${progress.stats.unavailable}`
        );
        await persist();
      }

      if (delayMs > 0) await sleep(delayMs);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  await persist();

  console.log("\nTerminé.");
  console.log("Stats session progress :", progress.stats);
  console.log("Procédures actives (fichier) :", activeBySiren.size);
  console.log("→", ACTIVE_DB_PATH);
  console.log("→", PROGRESS_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
