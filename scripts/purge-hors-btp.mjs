/**
 * Supprime de data/artisans-enrichment.json les établissements
 * dont le NAF principal n'est pas l'un des 22 codes des 16 métiers plateforme.
 *
 * Usage: node scripts/purge-hors-btp.mjs [--dry-run]
 */
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DB_PATH = path.join(ROOT, "data", "artisans-enrichment.json");

const CATEGORY_NAF = {
  Peinture: ["43.34Z"],
  Plomberie: ["43.22A", "43.22B"],
  Électricité: ["43.21A"],
  Maçonnerie: ["43.99C", "43.11Z"],
  Isolation: ["43.29A", "43.29B"],
  "Chauffage / Pompe à chaleur": ["43.22B", "43.21A"],
  "Rénovation énergétique": ["43.21A", "43.29A", "43.34Z"],
  "Rénovation complète": ["43.99C", "41.20A", "43.34Z"],
  "Menuiserie (fenêtres, portes, volets)": ["43.32A", "43.32B"],
  "Toiture / Couverture": ["43.91A", "43.91B"],
  "Carrelage / Revêtements de sol": ["43.33Z"],
  "Placo / Cloisons": ["43.31Z", "43.29B"],
  "Extérieur / Aménagement paysager": ["81.30Z", "43.99C"],
  Terrassement: ["43.12A", "43.12B"],
  Serrurerie: ["43.32B", "25.11Z"],
  "Nettoyage / Multi-services": ["81.21Z", "81.22Z", "81.29B"],
};

const PLATFORM_CATEGORY_NAF = new Set(
  Object.values(CATEGORY_NAF)
    .flat()
    .map((c) => c.toUpperCase())
);

function normalizeNaf(naf) {
  return String(naf ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s/g, "");
}

/** Uniquement les 22 NAF des 16 métiers. */
function isAcquisitionNaf(naf) {
  return PLATFORM_CATEGORY_NAF.has(normalizeNaf(naf));
}

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
    const next = [...merged].sort();
    if (next.length) a.nafSecondaryCodes = next;
    else delete a.nafSecondaryCodes;
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const raw = await fs.readFile(DB_PATH, "utf-8");
  const db = JSON.parse(raw);
  if (!Array.isArray(db.artisans)) {
    throw new Error("artisans-enrichment.json invalide");
  }

  const before = db.artisans.length;
  const removedByNaf = new Map();
  const kept = [];

  for (const a of db.artisans) {
    const naf = normalizeNaf(a.nafCode);
    if (!isAcquisitionNaf(naf)) {
      removedByNaf.set(naf, (removedByNaf.get(naf) ?? 0) + 1);
      continue;
    }
    kept.push(a);
  }

  db.artisans = kept;
  computeNafSecondaryForArtisans(db.artisans);

  const after = db.artisans.length;
  const removed = before - after;
  const activeAfter = db.artisans.filter((a) => a.status === "active").length;

  console.log(
    dryRun ? "Mode DRY-RUN" : "Mode WRITE",
    `\nAvant: ${before} établissements`,
    `\nSupprimés (hors 22 NAF métiers): ${removed}`,
    `\nAprès: ${after} (${activeAfter} actifs)`
  );

  const top = [...removedByNaf.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  if (top.length) {
    console.log("\nTop NAF supprimés:");
    for (const [naf, count] of top) {
      console.log(`  ${naf}: ${count}`);
    }
  }

  if (!dryRun) {
    const now = new Date().toISOString();
    for (const a of db.artisans) {
      a.updatedAt = now;
    }
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    console.log(`\nÉcrit: ${DB_PATH}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
