/**
 * Recalcule nafSecondaryCodes (autres APET du même SIREN) sur la base locale.
 * Usage: node scripts/backfill-naf-secondary.mjs
 */
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "artisans-enrichment.json");

function normalizeNaf(code) {
  return String(code ?? "")
    .trim()
    .toUpperCase();
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
  let withSecondary = 0;
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
    if (a.nafSecondaryCodes?.length) withSecondary += 1;
  }
  return withSecondary;
}

async function main() {
  const raw = await fs.readFile(DB_PATH, "utf-8");
  const db = JSON.parse(raw);
  if (!Array.isArray(db.artisans)) {
    throw new Error("artisans-enrichment.json invalide");
  }
  const count = computeNafSecondaryForArtisans(db.artisans);
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  console.log(`NAF secondaires recalculés pour ${count.toLocaleString("fr-FR")} établissements.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
