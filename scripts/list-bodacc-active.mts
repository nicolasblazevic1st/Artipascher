/**
 * Consulte la base locale des procédures BODACC actives.
 *
 * Usage :
 *   npm run bodacc:list
 *   npm run bodacc:list -- --dept=59
 *   npm run bodacc:list -- --q=peinture
 *   npm run bodacc:list -- --siren=007120082
 *   npm run bodacc:list -- --csv > data/exports/bodacc-actifs.csv
 *   npm run bodacc:stats
 */
import { promises as fs } from "fs";
import path from "path";

const ACTIVE_DB_PATH = path.join(
  process.cwd(),
  "data",
  "bodacc-active-procedures.json"
);
const PROGRESS_PATH = path.join(
  process.cwd(),
  "data",
  "bodacc-scan-progress.json"
);

interface Entry {
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

interface ActiveDb {
  updatedAt: string;
  scannedSirens: number;
  activeCount: number;
  active: Entry[];
}

function parseArgs(argv: string[]) {
  let dept: string | undefined;
  let q: string | undefined;
  let siren: string | undefined;
  let csv = false;
  let statsOnly = false;
  let limit = 50;
  for (const arg of argv) {
    if (arg === "--csv") csv = true;
    else if (arg === "--stats") statsOnly = true;
    else if (arg.startsWith("--dept=")) dept = arg.slice("--dept=".length);
    else if (arg.startsWith("--q=")) q = arg.slice("--q=".length).toLowerCase();
    else if (arg.startsWith("--siren="))
      siren = arg.slice("--siren=".length).replace(/\D/g, "");
    else if (arg.startsWith("--limit="))
      limit = Math.max(1, Number(arg.slice("--limit=".length)) || 50);
  }
  return { dept, q, siren, csv, statsOnly, limit };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  // npm run bodacc:stats → argv may not include --stats if using separate script entry
  if (process.env.npm_lifecycle_event === "bodacc:stats") {
    args.statsOnly = true;
  }

  let db: ActiveDb;
  try {
    db = JSON.parse(await fs.readFile(ACTIVE_DB_PATH, "utf-8")) as ActiveDb;
  } catch {
    console.error("Fichier introuvable :", ACTIVE_DB_PATH);
    console.error("Lance d'abord : npm run scan:bodacc");
    process.exit(1);
  }

  let progressStats: Record<string, number> | null = null;
  try {
    const pr = JSON.parse(await fs.readFile(PROGRESS_PATH, "utf-8")) as {
      stats?: Record<string, number>;
      checked?: Record<string, string>;
    };
    progressStats = pr.stats ?? null;
    if (!progressStats && pr.checked) {
      progressStats = { clear: 0, active_procedure: 0, unavailable: 0 };
      for (const s of Object.values(pr.checked)) {
        progressStats[s] = (progressStats[s] ?? 0) + 1;
      }
    }
  } catch {
    /* optional */
  }

  console.log("=== BODACC procédures actives (local) ===");
  console.log(`Fichier : ${ACTIVE_DB_PATH}`);
  console.log(`MAJ     : ${db.updatedAt}`);
  console.log(`Actifs  : ${db.activeCount}`);
  console.log(`Scannés : ${db.scannedSirens}`);
  if (progressStats) {
    console.log(
      `Progress: clear=${progressStats.clear ?? 0} active=${progressStats.active_procedure ?? 0} unavailable=${progressStats.unavailable ?? 0}`
    );
  }

  if (args.statsOnly) {
    const byDept: Record<string, number> = {};
    for (const e of db.active) {
      const d = e.department || "?";
      byDept[d] = (byDept[d] ?? 0) + 1;
    }
    console.log("\nPar département :");
    for (const [d, n] of Object.entries(byDept).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${d} : ${n}`);
    }
    return;
  }

  let rows = [...db.active];
  if (args.siren) {
    rows = rows.filter((e) => e.siren.includes(args.siren!));
  }
  if (args.dept) {
    rows = rows.filter((e) => e.department === args.dept);
  }
  if (args.q) {
    rows = rows.filter((e) => {
      const hay = `${e.companyName ?? ""} ${e.city ?? ""} ${e.nature ?? ""} ${e.siren}`.toLowerCase();
      return hay.includes(args.q!);
    });
  }

  rows.sort((a, b) => (b.dateParution ?? "").localeCompare(a.dateParution ?? ""));

  if (args.csv) {
    const header = [
      "siren",
      "companyName",
      "city",
      "department",
      "nature",
      "dateParution",
      "url",
      "siretSample",
    ];
    console.log(header.join(";"));
    for (const e of rows) {
      console.log(
        [
          e.siren,
          csvEscape(e.companyName),
          csvEscape(e.city),
          e.department ?? "",
          csvEscape(e.nature),
          e.dateParution ?? "",
          e.url ?? "",
          e.siretSample ?? "",
        ].join(";")
      );
    }
    return;
  }

  console.log(`\nRésultats filtrés : ${rows.length}`);
  const shown = rows.slice(0, args.limit);
  for (const e of shown) {
    console.log("—".repeat(60));
    console.log(
      `${e.companyName ?? "?"} · ${e.city ?? "?"} (${e.department ?? "?"})`
    );
    console.log(`SIREN ${e.siren}${e.siretSample ? ` · SIRET ${e.siretSample}` : ""}`);
    console.log(`${e.nature ?? "Procédure"}${e.dateParution ? ` · ${e.dateParution}` : ""}`);
    if (e.url) console.log(e.url);
  }
  if (rows.length > shown.length) {
    console.log(
      `\n… ${rows.length - shown.length} autres (augmente avec --limit=${rows.length})`
    );
  }
}

function csvEscape(value?: string) {
  const v = (value ?? "").replace(/"/g, '""');
  return `"${v}"`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
