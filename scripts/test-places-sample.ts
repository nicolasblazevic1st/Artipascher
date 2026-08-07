/**
 * Test Places/Maps sur l’échantillon nord-sample-100-metiers.json
 * Usage: npx --yes tsx scripts/test-places-sample.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import { promises as fs } from "fs";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { isGooglePlacesEnabled, lookupPlacePhone } from "../src/lib/google-places";

type Sample = {
  siret: string;
  companyName: string;
  city: string;
  postalCode: string;
  addressLine?: string;
  nafCode: string;
};

async function main() {
  if (!isGooglePlacesEnabled()) {
    console.error("GOOGLE_PLACES_ENABLED / API_KEY manquants — abort.");
    process.exit(1);
  }

  const samplePath = resolve(
    process.cwd(),
    "data/exports/nord-sample-100-metiers.json"
  );
  const sample = JSON.parse(await fs.readFile(samplePath, "utf8")) as Sample[];

  const results: Array<{
    siret: string;
    companyName: string;
    city: string;
    phone: string | null;
    website: string | null;
    matched: boolean;
    requestsUsed: number;
    error?: string;
  }> = [];

  let found = 0;
  let matched = 0;
  let requests = 0;
  let i = 0;

  for (const a of sample) {
    i += 1;
    const res = await lookupPlacePhone({
      companyName: a.companyName,
      addressLine: a.addressLine,
      postalCode: a.postalCode,
      city: a.city,
    });
    requests += res.requestsUsed;
    if (res.matched) matched += 1;
    if (res.phone) found += 1;

    results.push({
      siret: a.siret,
      companyName: a.companyName,
      city: a.city,
      phone: res.phone ?? null,
      website: res.website ?? null,
      matched: res.matched,
      requestsUsed: res.requestsUsed,
      error: res.error,
    });

    if (i % 10 === 0) {
      console.log(
        `… ${i}/${sample.length} | tél=${found} | match=${matched} | req=${requests}`
      );
    }
    // petit délai pour rester polite
    await new Promise((r) => setTimeout(r, 120));
  }

  const out = {
    searched: sample.length,
    withPhone: found,
    matchedPlace: matched,
    withoutPhone: sample.length - found,
    hitRatePhone: `${((found / sample.length) * 100).toFixed(1)}%`,
    hitRateMatch: `${((matched / sample.length) * 100).toFixed(1)}%`,
    requestsUsed: requests,
    results,
  };

  const outPath = resolve(
    process.cwd(),
    "data/exports/nord-sample-100-places.json"
  );
  const summaryPath = resolve(
    process.cwd(),
    "data/exports/nord-sample-100-places-summary.txt"
  );
  await fs.writeFile(outPath, JSON.stringify(out, null, 2));
  await fs.writeFile(
    summaryPath,
    [
      `total searched: ${out.searched}`,
      `place matched: ${out.matchedPlace}`,
      `with phone: ${out.withPhone}`,
      `without phone: ${out.withoutPhone}`,
      `hit rate phone: ${out.hitRatePhone}`,
      `hit rate match: ${out.hitRateMatch}`,
      `google requests used: ${out.requestsUsed}`,
    ].join("\n")
  );

  console.log("\n=== SUMMARY ===");
  console.log(await fs.readFile(summaryPath, "utf8"));
  console.log("Wrote", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
