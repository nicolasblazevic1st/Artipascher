/**
 * Retire une note Google trop douteuse (mauvais appariement Places).
 * Usage:
 *   node scripts/clear-wrong-google-rating.mjs 85051986900018
 *   node scripts/clear-wrong-google-rating.mjs 85051986900018 --phone
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync } from "fs";
import { resolve } from "path";
import { randomBytes } from "crypto";

const args = process.argv.slice(2);
const clearPhone = args.includes("--phone");
const siret = String(args.find((arg) => !arg.startsWith("--")) ?? "").replace(
  /\D/g,
  ""
);
if (siret.length < 9) {
  console.error(
    "Usage: node scripts/clear-wrong-google-rating.mjs <siret> [--phone]"
  );
  process.exit(1);
}

const DB_PATH = resolve(process.cwd(), "data/artisans-enrichment.json");
const db = JSON.parse(readFileSync(DB_PATH, "utf8"));
const artisan = (db.artisans ?? []).find(
  (row) => String(row.siret ?? "").replace(/\D/g, "") === siret
);
if (!artisan) {
  console.error("SIRET introuvable", siret);
  process.exit(1);
}

console.log({
  name: artisan.companyName,
  city: artisan.city,
  rating: artisan.googleRating,
  reviews: artisan.googleUserRatingCount,
  placeId: artisan.googlePlaceId,
  phone: artisan.phone,
});

delete artisan.googleRating;
delete artisan.googleUserRatingCount;
delete artisan.googlePlaceId;
if (clearPhone) delete artisan.phone;
artisan.enrichmentStatus = "no_match";
artisan.updatedAt = new Date().toISOString();

const tmp = `${DB_PATH}.${process.pid}.${randomBytes(2).toString("hex")}.tmp`;
writeFileSync(tmp, JSON.stringify(db, null, 2));
try {
  renameSync(tmp, DB_PATH);
} catch {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  unlinkSync(tmp);
}

console.log("cleared");
