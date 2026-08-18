/**
 * Backfill GPS artisans via BAN (CLI).
 * Usage: npx --yes tsx scripts/backfill-artisan-geocode.ts [--limit=500] [--loop]
 */
import { backfillArtisanGeocodes } from "../src/lib/artisans-geocode-backfill";
import { getArtisansStats } from "../src/lib/artisans-db";

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 500;
const loop = args.includes("--loop");

async function main() {
  const before = await getArtisansStats();
  console.log(
    `Avant: ${before.geocoded}/${before.active} géocodés (${before.withoutGeocode} sans GPS)`
  );

  let pass = 0;
  do {
    pass += 1;
    const result = await backfillArtisanGeocodes({
      limit: Number.isFinite(limit) && limit > 0 ? limit : 500,
      delayMs: 40,
    });
    console.log(
      `Pass ${pass}: attempted=${result.attempted} geocoded=${result.geocoded} failed=${result.failed} remaining=${result.remaining}`
    );
    if (!loop || result.remaining === 0 || result.attempted === 0) break;
  } while (true);

  const after = await getArtisansStats();
  console.log(
    `Après: ${after.geocoded}/${after.active} géocodés (${after.withoutGeocode} sans GPS)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
