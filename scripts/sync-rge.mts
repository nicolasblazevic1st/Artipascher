/**
 * Synchronise l’annuaire RGE ADEME (59 / 62) sur la base artisans + dossiers pros.
 * Usage : npm run sync:rge
 */
import { syncRgeDirectory } from "../src/lib/rge-sync";

console.log("=== Sync RGE ADEME (59 / 62) ===\n");
const result = await syncRgeDirectory();
console.log(JSON.stringify(result, null, 2));
if (result.errors.length > 0) {
  process.exitCode = 1;
}
