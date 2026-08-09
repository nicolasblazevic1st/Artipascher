/**
 * Vérif type prod : dirigeants via API registre réelle + soft-match CB.
 * Usage: npx tsx scripts/verify-payment-identity-prod.mts
 */
import { verifyWithRegistry } from "../src/lib/rcs";
import { evaluatePaymentNameCheck } from "../src/lib/payment-identity";

/** Entreprises publiques (données ouvertes API gouv). */
const SIRETS = [
  "44306184100047", // GOOGLE FRANCE
  "55210055400017", // LA POSTE
];

async function run() {
  console.log("=== VERIF TYPE PROD — registre réel + soft-match CB ===\n");

  for (const siret of SIRETS) {
    const reg = await verifyWithRegistry(siret);
    console.log("--- SIRET", siret, "---");
    console.log("valid:", reg.valid);
    if (reg.error) console.log("error:", reg.error);
    console.log("entreprise:", reg.companyName);
    console.log("ville/dept:", reg.city, "/", reg.department);
    console.log("active:", reg.isActive);
    console.log("dirigeants (source: recherche-entreprises.api.gouv.fr):");
    console.log(JSON.stringify(reg.legalRepresentatives ?? [], null, 2));

    if (!reg.valid) {
      console.log("SKIP match\n");
      continue;
    }

    const reps = reg.legalRepresentatives ?? [];
    const firstPerson =
      reps.find((r) => r.kind !== "personne_morale") ?? reps[0];

    const scenarios: Array<{ label: string; cardName?: string }> = [
      {
        label: "CB = 1er dirigeant (paiement par le gérant)",
        cardName: firstPerson?.fullName,
      },
      {
        label: "CB = raison sociale",
        cardName: reg.companyName,
      },
      {
        label: "CB = tiers (ne correspond pas)",
        cardName: "Camille Testeur Inconnu",
      },
      {
        label: "CB absente (Stripe sans nom)",
        cardName: undefined,
      },
    ];

    for (const s of scenarios) {
      const check = evaluatePaymentNameCheck({
        cardName: s.cardName,
        companyName: reg.companyName,
        legalRepresentatives: reps,
      });
      console.log(" ", s.label);
      console.log(
        "   →",
        check.status,
        "| carte:",
        check.cardName ?? "(vide)",
        "| via:",
        check.matchedAgainst ?? "-"
      );
    }
    console.log("");
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
