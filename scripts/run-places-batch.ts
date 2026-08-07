/**
 * Premier batch enrichissement Places (budget journalier).
 * Usage: npx --yes tsx scripts/run-places-batch.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { runDailyPlacesEnrichment } from "../src/lib/places-quota";
import { getArtisansStats } from "../src/lib/artisans-db";
import { isGooglePlacesEnabled } from "../src/lib/google-places";

async function main() {
  console.log("Places enabled:", isGooglePlacesEnabled());
  if (!isGooglePlacesEnabled()) {
    console.log("GOOGLE_PLACES_ENABLED / API_KEY manquants — skip.");
    process.exit(0);
  }
  const before = await getArtisansStats();
  console.log("Avant:", {
    withPhone: before.withPhone,
    pending: before.pendingEnrichment,
    remaining: before.remaining,
  });
  const result = await runDailyPlacesEnrichment();
  const after = await getArtisansStats();
  console.log("Résultat batch:", result);
  console.log("Après:", {
    withPhone: after.withPhone,
    pending: after.pendingEnrichment,
    remaining: after.remaining,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
