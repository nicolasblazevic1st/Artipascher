/**
 * Smoke-test API ADEME RGE (open data).
 * Usage : npx tsx scripts/verify-rge.mts [siret]
 */
import {
  checkRgeBySiret,
  rgePublicSearchUrl,
} from "../src/lib/rge-verification";

const sampleRgeSiret = process.argv[2] || "82454695600023"; // EL ARCHITECTURE (Englos, 59)

console.log("=== ADEME RGE (Licence Ouverte / data.ademe.fr) ===\n");

const result = await checkRgeBySiret(sampleRgeSiret);
console.log("SIRET", sampleRgeSiret);
console.log("status:", result.status);
console.log("isRge:", result.isRge);
console.log("company:", result.companyName ?? "(n/a)");
console.log("domains:", result.domains?.join(" · ") ?? "(aucun)");
console.log("validUntil:", result.validUntil ?? "ouverte");
console.log("url:", rgePublicSearchUrl(sampleRgeSiret));
if (result.error) console.log("error:", result.error);

if (result.status === "unavailable") {
  console.log("\nFAIL — API ADEME indisponible");
  process.exit(1);
}

console.log(
  result.isRge
    ? "\nOK — mention RGE active"
    : "\nOK — réponse ADEME (pas de mention active pour ce SIRET)"
);
