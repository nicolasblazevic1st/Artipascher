/**
 * Remplit les notes Google manquantes (Places) autour d’un point.
 * Usage:
 *   node scripts/fill-missing-google-ratings.mjs
 * Env: GOOGLE_PLACES_ENABLED=true + GOOGLE_PLACES_API_KEY
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync } from "fs";
import { resolve } from "path";
import { randomBytes } from "crypto";

const ROOT = resolve(process.cwd());
const DB_PATH = resolve(ROOT, "data/artisans-enrichment.json");
const ENV_PATH = resolve(ROOT, ".env.local");

const ORIGIN = { lat: 51.013, lon: 2.303 }; // Grande-Synthe
const RADIUS_KM = 40;
const NAF = new Set(["43.32A", "43.32B"]);
const LIMIT = Number(process.env.PLACES_FILL_LIMIT ?? 80);

function loadEnv() {
  try {
    for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const eq = trimmed.indexOf("=");
      const key = trimmed.slice(0, eq);
      const value = trimmed.slice(eq + 1);
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* ignore */
  }
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function collectNaf(a) {
  return [a.nafCode, ...(a.nafSecondaryCodes ?? [])].map((c) =>
    String(c ?? "")
      .trim()
      .toUpperCase()
  );
}

async function lookupPlace(key, artisan) {
  const textQuery = [artisan.companyName, artisan.addressLine, artisan.postalCode, artisan.city]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!textQuery) return { ok: false, requestsUsed: 0 };

  let requestsUsed = 0;
  const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName",
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "fr",
      regionCode: "FR",
      maxResultCount: 1,
    }),
  });
  requestsUsed += 1;
  const searchRaw = await searchRes.text();
  if (!searchRes.ok || !searchRaw.trim()) {
    return { ok: false, requestsUsed, error: `search ${searchRes.status}` };
  }
  let searchData;
  try {
    searchData = JSON.parse(searchRaw);
  } catch {
    return { ok: false, requestsUsed, error: "search json" };
  }
  const placeId = searchData.places?.[0]?.id;
  if (!placeId) return { ok: true, matched: false, requestsUsed };

  const detailsRes = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "id,nationalPhoneNumber,internationalPhoneNumber,websiteUri,rating,userRatingCount",
      },
    }
  );
  requestsUsed += 1;
  const detailsRaw = await detailsRes.text();
  if (!detailsRes.ok || !detailsRaw.trim()) {
    return { ok: false, requestsUsed, placeId, error: `details ${detailsRes.status}` };
  }
  let details;
  try {
    details = JSON.parse(detailsRaw);
  } catch {
    return { ok: false, requestsUsed, placeId, error: "details json" };
  }
  return {
    ok: true,
    matched: true,
    requestsUsed,
    placeId,
    phone: details.nationalPhoneNumber || details.internationalPhoneNumber,
    website: details.websiteUri,
    rating: typeof details.rating === "number" ? details.rating : undefined,
    userRatingCount:
      typeof details.userRatingCount === "number"
        ? details.userRatingCount
        : undefined,
  };
}

async function main() {
  loadEnv();
  const enabled = process.env.GOOGLE_PLACES_ENABLED === "true";
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!enabled || !key) {
    console.error("Places non configuré.");
    process.exit(1);
  }

  const db = JSON.parse(readFileSync(DB_PATH, "utf8"));
  const now = new Date().toISOString();
  const targets = db.artisans
    .filter((a) => {
      if (a.status !== "active" || a.optedOut) return false;
      if (a.department !== "59" && a.department !== "62") return false;
      if (!collectNaf(a).some((c) => NAF.has(c))) return false;
      if (!a.phone?.trim()) return false;
      if (typeof a.googleRating === "number") return false;
      if (typeof a.lat !== "number" || typeof a.lon !== "number") return false;
      return haversineKm(ORIGIN, { lat: a.lat, lon: a.lon }) <= RADIUS_KM;
    })
    .sort(
      (a, b) =>
        haversineKm(ORIGIN, { lat: a.lat, lon: a.lon }) -
        haversineKm(ORIGIN, { lat: b.lat, lon: b.lon })
    )
    .slice(0, LIMIT);

  console.log("targets", targets.length, "limit", LIMIT);
  let requests = 0;
  let withRating = 0;
  let matched = 0;
  let errors = 0;

  for (const artisan of targets) {
    const res = await lookupPlace(key, artisan);
    requests += res.requestsUsed ?? 0;
    if (res.error) {
      errors += 1;
      continue;
    }
    if (res.matched) matched += 1;
    if (res.phone) artisan.phone = artisan.phone || res.phone;
    if (res.website) artisan.website = artisan.website || res.website;
    if (res.placeId) artisan.googlePlaceId = res.placeId;
    if (typeof res.rating === "number") {
      artisan.googleRating = res.rating;
      artisan.googleUserRatingCount = res.userRatingCount;
      withRating += 1;
    }
    artisan.enrichmentStatus = res.phone
      ? "enriched"
      : res.matched
        ? artisan.enrichmentStatus
        : "no_match";
    artisan.enrichedAt = now;
    artisan.lastVerifiedAt = now;
    artisan.updatedAt = now;
    await new Promise((r) => setTimeout(r, 80));
  }

  const tmp = `${DB_PATH}.${process.pid}.${randomBytes(2).toString("hex")}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  try {
    renameSync(tmp, DB_PATH);
  } catch {
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    unlinkSync(tmp);
  }

  console.log({ requests, matched, withRating, errors });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
