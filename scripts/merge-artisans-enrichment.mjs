/**
 * Fusionne les contacts enrichis localement (Places, saisie admin) dans la base Git.
 * Usage: node scripts/merge-artisans-enrichment.mjs <backup.json> <target.json>
 */
import { promises as fs } from "fs";

const [backupPath, targetPath] = process.argv.slice(2);
if (!backupPath || !targetPath) {
  console.error("Usage: node scripts/merge-artisans-enrichment.mjs <backup> <target>");
  process.exit(1);
}

function pickContactFields(row) {
  return {
    phone: row.phone?.trim() || undefined,
    website: row.website?.trim() || undefined,
    googleRating: row.googleRating,
    googleUserRatingCount: row.googleUserRatingCount,
    googlePlaceId: row.googlePlaceId,
    enrichmentStatus: row.enrichmentStatus,
    enrichedAt: row.enrichedAt,
    lastVerifiedAt: row.lastVerifiedAt,
    lastSmsFailedAt: row.lastSmsFailedAt,
    optedOut: row.optedOut,
    lat: row.lat,
    lon: row.lon,
  };
}

function hasContactValue(fields) {
  return Boolean(
    fields.phone ||
      fields.website ||
      typeof fields.googleRating === "number" ||
      fields.googlePlaceId ||
      fields.enrichmentStatus === "enriched" ||
      fields.enrichmentStatus === "invalid_phone" ||
      fields.optedOut ||
      fields.lat != null ||
      fields.lon != null
  );
}

async function main() {
  const backup = JSON.parse(await fs.readFile(backupPath, "utf-8"));
  const target = JSON.parse(await fs.readFile(targetPath, "utf-8"));
  if (!Array.isArray(backup.artisans) || !Array.isArray(target.artisans)) {
    throw new Error("JSON invalide (artisans manquant)");
  }

  const bySiret = new Map(
    backup.artisans.map((a) => [String(a.siret), a])
  );
  let merged = 0;

  for (const artisan of target.artisans) {
    const prev = bySiret.get(String(artisan.siret));
    if (!prev) continue;
    const contact = pickContactFields(prev);
    if (!hasContactValue(contact)) continue;

    if (contact.phone) artisan.phone = contact.phone;
    if (contact.website) artisan.website = contact.website;
    if (typeof contact.googleRating === "number") {
      artisan.googleRating = contact.googleRating;
    }
    if (typeof contact.googleUserRatingCount === "number") {
      artisan.googleUserRatingCount = contact.googleUserRatingCount;
    }
    if (contact.googlePlaceId) artisan.googlePlaceId = contact.googlePlaceId;
    if (contact.enrichmentStatus && contact.enrichmentStatus !== "pending") {
      artisan.enrichmentStatus = contact.enrichmentStatus;
    }
    if (contact.enrichedAt) artisan.enrichedAt = contact.enrichedAt;
    if (contact.lastVerifiedAt) artisan.lastVerifiedAt = contact.lastVerifiedAt;
    if (contact.lastSmsFailedAt) artisan.lastSmsFailedAt = contact.lastSmsFailedAt;
    if (contact.optedOut) artisan.optedOut = contact.optedOut;
    if (contact.lat != null && contact.lon != null) {
      artisan.lat = contact.lat;
      artisan.lon = contact.lon;
    }
    artisan.updatedAt = new Date().toISOString();
    merged += 1;
  }

  if (Array.isArray(backup.quotaTracking) && backup.quotaTracking.length > 0) {
    if (!Array.isArray(target.quotaTracking)) target.quotaTracking = [];
    const byMonth = new Map(
      target.quotaTracking.map((row) => [String(row.monthKey), row])
    );
    for (const prev of backup.quotaTracking) {
      const key = String(prev.monthKey ?? "");
      if (!key) continue;
      const cur = byMonth.get(key);
      const prevUsed =
        (prev.requestsProduction ?? 0) + (prev.requestsEnrichment ?? 0);
      const curUsed = cur
        ? (cur.requestsProduction ?? 0) + (cur.requestsEnrichment ?? 0)
        : 0;
      if (!cur) {
        target.quotaTracking.push(prev);
        byMonth.set(key, prev);
        continue;
      }
      if (prevUsed >= curUsed) {
        Object.assign(cur, prev);
      }
    }
  }

  await fs.writeFile(targetPath, JSON.stringify(target, null, 2), "utf-8");
  console.log(`Fusion terminée: ${merged.toLocaleString("fr-FR")} fiches avec données locales conservées.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
