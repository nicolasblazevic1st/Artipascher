/**
 * Import local StockEtablissement (data.gouv / INSEE) → base artisans NPC.
 *
 * Usage:
 *   node scripts/import-sirene-stock.mjs --dry-run
 *   node scripts/import-sirene-stock.mjs --write
 *   node scripts/import-sirene-stock.mjs --write --skip-download
 *
 * Note: le ZIP national fait ~2.6 Go. Pour un bootstrap plus rapide sans dump :
 *   npx tsx scripts/bootstrap-artisans-api.ts

 * Télécharge (si besoin) StockEtablissement + StockUniteLegale dans data/sirene/,
 * filtre 59/62 + univers NAF acquisition, affiche les stats, optionnellement
 * écrit dans data/artisans-enrichment.json (préserve téléphones existants).
 */
import { createReadStream, existsSync, promises as fs } from "fs";
import { createInterface } from "readline";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SIRENE_DIR = path.join(ROOT, "data", "sirene");
const EXTRAS_PATH = path.join(ROOT, "data", "acquisition-naf-extras.json");

const DATASET_API =
  "https://www.data.gouv.fr/api/1/datasets/base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret/";
/** IDs stables data.gouv (redirect vers le ZIP du mois). */
const RESOURCE_ETAB = "0651fb76-bcf3-4f6a-a38d-bc04fa708576";
const RESOURCE_UL = "825f4199-cadd-486c-ac46-a65a8ea1a047";

const ADJACENT = new Set([
  "25.11Z",
  "81.21Z",
  "81.22Z",
  "81.29B",
  "81.30Z",
]);

const PLATFORM_CATEGORY_NAF = new Set([
  "43.34Z",
  "43.22A",
  "43.22B",
  "43.21A",
  "43.99C",
  "43.11Z",
  "43.29A",
  "43.29B",
  "41.20A",
  "43.32A",
  "43.32B",
  "43.91A",
  "43.91B",
  "43.33Z",
  "43.31Z",
  "81.30Z",
  "43.12A",
  "43.12B",
  "25.11Z",
  "81.21Z",
  "81.22Z",
  "81.29B",
]);

function normalizeNaf(code) {
  return String(code ?? "")
    .trim()
    .toUpperCase();
}

async function loadExtras() {
  // Conservé pour compat CLI ; l'acquisition ignore les extras (22 NAF métiers seuls).
  try {
    const raw = await fs.readFile(EXTRAS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeNaf).filter(Boolean);
  } catch {
    return [];
  }
}

/** Uniquement les 22 NAF des 16 métiers plateforme. */
function isAcquisitionNaf(naf, _extras) {
  return PLATFORM_CATEGORY_NAF.has(normalizeNaf(naf));
}

function isMapped(naf) {
  return PLATFORM_CATEGORY_NAF.has(normalizeNaf(naf));
}

function deptFromPostal(postal) {
  const p = String(postal ?? "").replace(/\D/g, "");
  if (p.startsWith("59")) return "59";
  if (p.startsWith("62")) return "62";
  return null;
}

/** NAF secondaires = autres APET actifs du même SIREN (+ APEN si déjà posé). */
function computeNafSecondaryForArtisans(artisans) {
  const bySiren = new Map();
  for (const a of artisans) {
    if (a.status !== "active") continue;
    const code = normalizeNaf(a.nafCode);
    if (!code) continue;
    if (!bySiren.has(a.siren)) bySiren.set(a.siren, new Set());
    bySiren.get(a.siren).add(code);
  }
  for (const a of artisans) {
    const primary = normalizeNaf(a.nafCode);
    const merged = new Set(
      (a.nafSecondaryCodes ?? []).map(normalizeNaf).filter(Boolean)
    );
    merged.delete(primary);
    const sibling = bySiren.get(a.siren);
    if (sibling) {
      for (const code of sibling) {
        if (code !== primary) merged.add(code);
      }
    }
    a.nafSecondaryCodes =
      merged.size > 0 ? [...merged].sort((x, y) => x.localeCompare(y)) : undefined;
  }
}

/** Parse CSV line (INSEE: comma-separated, optional quotes). */
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function buildAddress(row) {
  const num = row.numeroVoieEtablissement?.trim() ?? "";
  const type = row.typeVoieEtablissement?.trim() ?? "";
  const voie = row.libelleVoieEtablissement?.trim() ?? "";
  const complement = row.complementAdresseEtablissement?.trim() ?? "";
  const street = [num, type, voie].filter(Boolean).join(" ").trim();
  return [street, complement].filter(Boolean).join(", ");
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function resolveStockUrls() {
  try {
    const res = await fetch(DATASET_API);
    if (!res.ok) throw new Error(`dataset api ${res.status}`);
    const data = await res.json();
    const resources = Array.isArray(data.resources) ? data.resources : [];
    const pick = (pred) => {
      const hit = resources.find(pred);
      // Préférer l’URL static directe (plus fiable que /api/.../r/ qui streame mal)
      return hit?.url || hit?.latest || null;
    };
    const etab =
      pick(
        (r) =>
          /StockEtablissement/i.test(r.title || "") &&
          String(r.format || "").toLowerCase() === "zip" &&
          !/historique|parquet/i.test(r.title || "")
      ) || `https://www.data.gouv.fr/api/1/datasets/r/${RESOURCE_ETAB}`;
    const ul =
      pick(
        (r) =>
          /StockUniteLegale/i.test(r.title || "") &&
          String(r.format || "").toLowerCase() === "zip" &&
          !/historique|parquet/i.test(r.title || "")
      ) || `https://www.data.gouv.fr/api/1/datasets/r/${RESOURCE_UL}`;
    return { etab, ul };
  } catch {
    return {
      etab: "https://static.data.gouv.fr/resources/base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret/20260801-073219/stock-stocketablissement-csv.zip",
      ul: "https://static.data.gouv.fr/resources/base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret/20260801-072607/stock-stockunitelegale-csv.zip",
    };
  }
}

async function downloadFile(url, dest) {
  if (existsSync(dest)) {
    const st = await fs.stat(dest);
    if (st.size > 1_000_000) {
      console.log(`  déjà présent: ${path.basename(dest)} (${(st.size / 1e6).toFixed(1)} Mo)`);
      return;
    }
  }
  console.log(`  téléchargement ${url}`);
  const tmp = `${dest}.partial`;
  try {
    await fs.unlink(tmp).catch(() => undefined);
    // curl gère mieux les gros fichiers + redirects que fetch+pipeline sous Windows
    await execFileAsync(
      "curl.exe",
      ["-L", "--fail", "--retry", "3", "--retry-delay", "5", "-o", tmp, url],
      { maxBuffer: 10 * 1024 * 1024 }
    );
    const st = await fs.stat(tmp);
    if (st.size < 1_000_000) {
      throw new Error(`Fichier trop petit (${st.size} octets)`);
    }
    await fs.rename(tmp, dest);
    console.log(`  OK ${(st.size / 1e6).toFixed(1)} Mo → ${path.basename(dest)}`);
  } catch (err) {
    console.warn(`  curl échoué (${err instanceof Error ? err.message : err}), fallback fetch…`);
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`Download failed ${res.status} ${url}`);
    if (!res.body) throw new Error("Pas de body HTTP");
    const { createWriteStream } = await import("fs");
    const { pipeline } = await import("stream/promises");
    const { Readable } = await import("stream");
    await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
    const st = await fs.stat(tmp);
    await fs.rename(tmp, dest);
    console.log(`  OK ${(st.size / 1e6).toFixed(1)} Mo → ${path.basename(dest)}`);
  }
}

async function unzip(zipPath, outDir) {
  await ensureDir(outDir);
  if (process.platform === "win32") {
    await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${outDir.replace(/'/g, "''")}' -Force`,
      ],
      { maxBuffer: 20 * 1024 * 1024 }
    );
  } else {
    await execFileAsync("unzip", ["-o", zipPath, "-d", outDir], {
      maxBuffer: 20 * 1024 * 1024,
    });
  }
}

async function findCsv(dir, needles) {
  const entries = await fs.readdir(dir);
  const lowerNeedles = needles.map((n) => n.toLowerCase());
  const hit = entries.find((e) => {
    if (!e.toLowerCase().endsWith(".csv")) return false;
    const low = e.toLowerCase();
    return lowerNeedles.some((n) => low.includes(n));
  });
  if (!hit) throw new Error(`CSV (${needles.join("|")}) introuvable dans ${dir}: ${entries.join(", ")}`);
  return path.join(dir, hit);
}

async function streamCsv(filePath, onRow) {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });
  let headers = null;
  let lineNo = 0;
  for await (const line of rl) {
    lineNo += 1;
    if (!line) continue;
    const cols = parseCsvLine(line);
    if (!headers) {
      headers = cols.map((h) => h.replace(/^\uFEFF/, "").trim());
      continue;
    }
    const row = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = cols[i] ?? "";
    }
    await onRow(row, lineNo);
    if (lineNo % 500_000 === 0) {
      console.log(`  … ${lineNo.toLocaleString("fr-FR")} lignes lues`);
    }
  }
  return lineNo;
}

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run") || !argv.includes("--write"),
    write: argv.includes("--write"),
    skipDownload: argv.includes("--skip-download"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  // --write implies not dry-run
  const dryRun = args.write ? false : true;

  console.log("=== Import SIRENE stock (local) ===");
  console.log(dryRun ? "Mode: DRY-RUN (pas d’écriture DB)" : "Mode: WRITE → artisans-enrichment.json");

  const extrasList = await loadExtras();
  const extras = new Set(extrasList);
  console.log(`Extras NAF: ${extrasList.length ? extrasList.join(", ") : "(aucun)"}`);

  await ensureDir(SIRENE_DIR);
  const etabZip = path.join(SIRENE_DIR, "StockEtablissement_utf8.zip");
  const ulZip = path.join(SIRENE_DIR, "StockUniteLegale_utf8.zip");
  const etabDir = path.join(SIRENE_DIR, "etablissement");
  const ulDir = path.join(SIRENE_DIR, "unitelegale");

  if (!args.skipDownload) {
    console.log("Résolution URLs data.gouv…");
    const urls = await resolveStockUrls();
    console.log(`  Etablissement: ${urls.etab}`);
    console.log(`  UniteLegale: ${urls.ul}`);
    console.log("Téléchargement…");
    await downloadFile(urls.etab, etabZip);
    await downloadFile(urls.ul, ulZip);
  }

  const needUnzipEtab =
    !existsSync(etabDir) ||
    !(await fs.readdir(etabDir)).some((f) => f.endsWith(".csv"));
  const needUnzipUl =
    !existsSync(ulDir) ||
    !(await fs.readdir(ulDir)).some((f) => f.endsWith(".csv"));

  if (needUnzipEtab) {
    console.log("Extraction StockEtablissement…");
    await unzip(etabZip, etabDir);
  }
  if (needUnzipUl) {
    console.log("Extraction StockUniteLegale…");
    await unzip(ulZip, ulDir);
  }

  const etabCsv = await findCsv(etabDir, ["stocketablissement", "etablissement"]);
  const ulCsv = await findCsv(ulDir, ["stockunitelegale", "unitelegale"]);
  console.log(`CSV établissements: ${etabCsv}`);
  console.log(`CSV unités légales: ${ulCsv}`);

  /** @type {Map<string, object>} */
  const matched = new Map();
  const byDept = { "59": 0, "62": 0 };
  const byNaf = new Map();
  let scanned = 0;
  let kept = 0;

  console.log("Filtrage établissements 59/62 + NAF acquisition…");
  await streamCsv(etabCsv, async (row) => {
    scanned += 1;
    if (row.etatAdministratifEtablissement !== "A") return;
    const postal = row.codePostalEtablissement ?? "";
    const dept = deptFromPostal(postal);
    if (!dept) return;
    const naf = normalizeNaf(row.activitePrincipaleEtablissement);
    if (!isAcquisitionNaf(naf, extras)) return;

    const siret = String(row.siret ?? "").trim();
    if (!/^\d{14}$/.test(siret)) return;
    const siren = siret.slice(0, 9);

    matched.set(siret, {
      siret,
      siren,
      companyName:
        (row.denominationUsuelleEtablissement || "").trim() ||
        (row.enseigne1Etablissement || "").trim() ||
        "",
      addressLine: buildAddress(row),
      postalCode: postal.trim(),
      city: (row.libelleCommuneEtablissement || "").trim(),
      department: dept,
      nafCode: naf,
      companyCreatedAt: (row.dateCreationEtablissement || "").trim() || undefined,
      status: "active",
      enrichmentStatus: "pending",
      source: "import",
    });
    kept += 1;
    byDept[dept] += 1;
    byNaf.set(naf, (byNaf.get(naf) ?? 0) + 1);
  });

  console.log(`Lignes lues: ${scanned.toLocaleString("fr-FR")}`);
  console.log(`Établissements retenus: ${kept.toLocaleString("fr-FR")}`);

  const sirensNeeded = new Set([...matched.values()].map((r) => r.siren));
  /** @type {Map<string, string>} */
  const names = new Map();
  /** @type {Map<string, string>} */
  const apenBySiren = new Map();
  console.log(`Résolution noms (unités légales) pour ${sirensNeeded.size.toLocaleString("fr-FR")} SIREN…`);
  await streamCsv(ulCsv, async (row) => {
    const siren = String(row.siren ?? "").trim();
    if (!sirensNeeded.has(siren)) return;
    const name =
      (row.denominationUniteLegale || "").trim() ||
      [row.prenom1UniteLegale, row.nomUniteLegale].filter(Boolean).join(" ").trim() ||
      (row.nomUsageUniteLegale || "").trim();
    if (name) names.set(siren, name);
    const apen = normalizeNaf(row.activitePrincipaleUniteLegale ?? "");
    if (apen) apenBySiren.set(siren, apen);
  });

  let named = 0;
  for (const row of matched.values()) {
    if (!row.companyName) {
      const n = names.get(row.siren);
      if (n) {
        row.companyName = n;
        named += 1;
      } else {
        row.companyName = `Établissement ${row.siret}`;
      }
    } else if (names.has(row.siren) && row.companyName.length < 3) {
      row.companyName = names.get(row.siren);
      named += 1;
    }
  }
  console.log(`Noms complétés via unité légale: ${named.toLocaleString("fr-FR")}`);

  for (const row of matched.values()) {
    const apen = apenBySiren.get(row.siren);
    const primary = normalizeNaf(row.nafCode);
    if (apen && apen !== primary) {
      row.nafSecondaryCodes = [apen];
    }
  }
  computeNafSecondaryForArtisans([...matched.values()]);

  const topNaf = [...byNaf.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  let unmapped = 0;
  const unmappedNaf = new Map();
  for (const [naf, count] of byNaf) {
    if (!isMapped(naf)) {
      unmapped += count;
      unmappedNaf.set(naf, count);
    }
  }
  const topUnmapped = [...unmappedNaf.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  const estBytes = kept * 450;
  console.log("\n--- Stats ---");
  console.log(`Total: ${kept.toLocaleString("fr-FR")}`);
  console.log(`  59: ${byDept["59"].toLocaleString("fr-FR")}`);
  console.log(`  62: ${byDept["62"].toLocaleString("fr-FR")}`);
  console.log(`Hors catégories plateforme: ${unmapped.toLocaleString("fr-FR")}`);
  console.log(`Taille JSON estimée: ~${(estBytes / 1e6).toFixed(1)} Mo`);
  console.log("\nTop NAF:");
  for (const [naf, count] of topNaf) {
    console.log(
      `  ${naf}  ${String(count).padStart(6)}  ${isMapped(naf) ? "mappé" : "HORS CAT"}`
    );
  }
  if (topUnmapped.length) {
    console.log("\nTop NAF hors catégories:");
    for (const [naf, count] of topUnmapped) {
      console.log(`  ${naf}  ${String(count).padStart(6)}`);
    }
  }

  if (dryRun) {
    console.log("\nDry-run terminé. Relancer avec --write pour écrire la base.");
    return;
  }

  // Écriture via le module TS compilé runtime (tsx) ou require transpile — on écrit le JSON directement
  // pour éviter une dépendance tsx obligatoire.
  console.log("\nÉcriture data/artisans-enrichment.json…");
  const dbPath = path.join(ROOT, "data", "artisans-enrichment.json");
  let db = { artisans: [], quotaTracking: [], jobs: [] };
  try {
    const raw = await fs.readFile(dbPath, "utf-8");
    db = JSON.parse(raw);
    if (!Array.isArray(db.artisans)) db.artisans = [];
    if (!Array.isArray(db.quotaTracking)) db.quotaTracking = [];
    if (!Array.isArray(db.jobs)) db.jobs = [];
  } catch {
    // new
  }

  const now = new Date().toISOString();
  const bySiret = new Map(db.artisans.map((a, i) => [a.siret, i]));
  let inserted = 0;
  let updated = 0;

  for (const row of matched.values()) {
    const index = bySiret.get(row.siret);
    if (index == null) {
      db.artisans.push({
        ...row,
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now,
      });
      bySiret.set(row.siret, db.artisans.length - 1);
      inserted += 1;
    } else {
      const existing = db.artisans[index];
      db.artisans[index] = {
        ...existing,
        ...row,
        phone: existing.phone || row.phone,
        website: existing.website || row.website,
        enrichmentStatus:
          existing.phone && row.enrichmentStatus === "pending"
            ? existing.enrichmentStatus
            : row.enrichmentStatus,
        enrichedAt: existing.enrichedAt,
        lastVerifiedAt: existing.lastVerifiedAt,
        lastSmsFailedAt: existing.lastSmsFailedAt,
        optedOut: existing.optedOut,
        createdAt: existing.createdAt,
        updatedAt: now,
        lastSeenAt: now,
      };
      updated += 1;
    }
  }

  computeNafSecondaryForArtisans(db.artisans);

  db.jobs = [
    {
      id: `job-import-${Date.now()}`,
      kind: "sirene_weekly",
      ranAt: now,
      requestsSpent: 0,
      processed: inserted + updated,
      skipped: 0,
      errors: [],
      note: `stock-import inserted=${inserted} updated=${updated} total=${kept}`,
    },
    ...(db.jobs ?? []),
  ].slice(0, 100);

  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  const payload = JSON.stringify(db, null, 2);
  const tmp = `${dbPath}.${process.pid}.tmp`;
  await fs.writeFile(tmp, payload, "utf-8");
  await fs.copyFile(tmp, dbPath);
  await fs.unlink(tmp).catch(() => undefined);

  console.log(
    `Écrit: inserted=${inserted} updated=${updated} total_actifs_import=${kept}`
  );
  console.log(`Fichier: ${dbPath} (${(payload.length / 1e6).toFixed(1)} Mo)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
