/**
 * Smoke-test API BODACC (procédures collectives).
 * Usage : npx tsx scripts/verify-bodacc.mts [siren]
 */
import {
  analyzeBodaccCollectiveRecords,
  checkBodaccCollectiveProcedures,
} from "../src/lib/bodacc";

const healthySiren = "617120118"; // RAMERY — attendu clear
const distressedSiren = process.argv[2] || "919948430"; // exemple avec RJ connu

console.log("=== BODACC (Licence Ouverte 2.0 / DILA) ===\n");

const healthy = await checkBodaccCollectiveProcedures(healthySiren);
console.log("1) Entreprise saine", healthySiren);
console.log("   status:", healthy.status, "| examined:", healthy.examinedCount);
console.log(healthy.status === "clear" ? "   OK\n" : "   FAIL (attendu clear)\n");

const bad = await checkBodaccCollectiveProcedures(distressedSiren);
console.log("2) Entreprise avec annonces collective", distressedSiren);
console.log("   status:", bad.status);
console.log("   blocking:", bad.latestBlocking?.nature, bad.latestBlocking?.dateParution);
console.log("   url:", bad.latestBlocking?.url ?? "(n/a)");
console.log(
  bad.status === "active_procedure" ? "   OK\n" : "   FAIL (attendu active_procedure)\n"
);

const closed = analyzeBodaccCollectiveRecords([
  {
    id: "close",
    dateparution: "2025-06-01",
    jugement: JSON.stringify({
      nature: "Jugement de clôture pour extinction du passif",
      date: "2025-06-01",
    }),
  },
  {
    id: "open",
    dateparution: "2024-01-01",
    jugement: JSON.stringify({
      nature: "Jugement d'ouverture de redressement judiciaire",
      date: "2024-01-01",
    }),
  },
]);
console.log("3) Heuristique clôture > ouverture");
console.log(
  !closed.hasActiveProcedure
    ? "   OK (plus de procédure active)\n"
    : "   FAIL\n"
);

const ok =
  healthy.status === "clear" &&
  bad.status === "active_procedure" &&
  !closed.hasActiveProcedure;

console.log(ok ? "RESULTAT: OK" : "RESULTAT: ECHECS");
process.exit(ok ? 0 : 1);
