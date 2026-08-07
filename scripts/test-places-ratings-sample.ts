/**
 * Relance Places sur l’échantillon 100 avec notes Google (rating + avis).
 * Usage: npx --yes tsx scripts/test-places-ratings-sample.ts
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
};

async function main() {
  if (!isGooglePlacesEnabled()) {
    console.error("GOOGLE_PLACES_ENABLED / API_KEY manquants — abort.");
    process.exit(1);
  }

  const sample = JSON.parse(
    await fs.readFile(
      resolve(process.cwd(), "data/exports/nord-sample-100-metiers.json"),
      "utf8"
    )
  ) as Sample[];

  const results: Array<{
    siret: string;
    companyName: string;
    city: string;
    phone: string | null;
    website: string | null;
    rating: number | null;
    userRatingCount: number | null;
    matched: boolean;
    placeId?: string;
    requestsUsed: number;
    error?: string;
  }> = [];

  let withPhone = 0;
  let withRating = 0;
  let matched = 0;
  let requests = 0;
  let ratingSum = 0;
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
    if (res.phone) withPhone += 1;
    if (typeof res.rating === "number") {
      withRating += 1;
      ratingSum += res.rating;
    }

    results.push({
      siret: a.siret,
      companyName: a.companyName,
      city: a.city,
      phone: res.phone ?? null,
      website: res.website ?? null,
      rating: res.rating ?? null,
      userRatingCount: res.userRatingCount ?? null,
      matched: res.matched,
      placeId: res.placeId,
      requestsUsed: res.requestsUsed,
      error: res.error,
    });

    if (i % 10 === 0) {
      console.log(
        `… ${i}/${sample.length} | tél=${withPhone} | notes=${withRating} | match=${matched} | req=${requests}`
      );
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  const rated = results.filter((r) => typeof r.rating === "number");
  const avg =
    rated.length > 0
      ? (rated.reduce((s, r) => s + (r.rating as number), 0) / rated.length).toFixed(2)
      : "n/a";
  const withReviews = results.filter(
    (r) => typeof r.userRatingCount === "number" && (r.userRatingCount as number) > 0
  ).length;

  const summary = [
    `total searched: ${sample.length}`,
    `place matched: ${matched}`,
    `with phone: ${withPhone}`,
    `with rating: ${withRating}`,
    `with at least 1 review: ${withReviews}`,
    `avg rating (when present): ${avg}`,
    `hit rate rating: ${((withRating / sample.length) * 100).toFixed(1)}%`,
    `google requests used: ${requests}`,
  ].join("\n");

  const outPath = resolve(
    process.cwd(),
    "data/exports/nord-sample-100-places-ratings.json"
  );
  const summaryPath = resolve(
    process.cwd(),
    "data/exports/nord-sample-100-places-ratings-summary.txt"
  );

  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        searched: sample.length,
        matchedPlace: matched,
        withPhone,
        withRating,
        withReviews,
        avgRating: avg,
        requestsUsed: requests,
        results,
      },
      null,
      2
    )
  );
  await fs.writeFile(summaryPath, summary);

  console.log("\n=== SUMMARY ===");
  console.log(summary);
  console.log("Wrote", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
