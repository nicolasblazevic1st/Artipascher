/**
 * Bootstrap base artisans via API recherche-entreprises (sans dump 2.6 Go).
 * Usage: npx --yes tsx scripts/bootstrap-artisans-api.ts
 */
import { syncSireneWeekly } from "../src/lib/sirene-extract";
import { getArtisansStats } from "../src/lib/artisans-db";
import { isMappedToPlatformCategory } from "../src/lib/acquisition-naf";
import { listArtisans } from "../src/lib/artisans-db";

async function main() {
  console.log("=== Bootstrap artisans NPC via API (full, sans géocode) ===");
  const started = Date.now();
  const result = await syncSireneWeekly({
    full: true,
    geocodeMissing: false,
    markMissingClosed: false,
  });
  const stats = await getArtisansStats();
  const active = await listArtisans({ status: "active" });
  const unmapped = active.filter((a) => !isMappedToPlatformCategory(a.nafCode));

  console.log("\n--- Résultat sync ---");
  console.log(result);
  console.log("\n--- Stats DB ---");
  console.log({
    total: stats.total,
    active: stats.active,
    withPhone: stats.withPhone,
    pendingEnrichment: stats.pendingEnrichment,
    unmappedCategory: unmapped.length,
    byDepartment: stats.byDepartment,
    topNaf: stats.topNaf,
  });
  console.log(`Durée: ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
