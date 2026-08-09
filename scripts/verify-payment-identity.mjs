/**
 * Vérifs locales (données fictives) — soft-match CB ↔ dirigeants / entreprise.
 * Usage: node scripts/verify-payment-identity.mjs
 */

function normalizePersonName(value) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  return normalizePersonName(value)
    .split(" ")
    .filter((t) => t.length >= 2);
}

function softNamesMatch(a, b) {
  const na = normalizePersonName(a);
  const nb = normalizePersonName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return false;
  const setB = new Set(tb);
  const shared = ta.filter((t) => setB.has(t));
  if (shared.length >= 2) return true;
  if (shared.length === 1 && (ta.length === 1 || tb.length === 1)) return true;
  return false;
}

function evaluatePaymentNameCheck({ cardName, companyName, legalRepresentatives }) {
  const checkedAt = new Date().toISOString();
  const name = cardName?.trim() || undefined;
  if (!name) {
    return { status: "unavailable", cardName: undefined, matchedAgainst: undefined, checkedAt };
  }
  for (const rep of legalRepresentatives ?? []) {
    if (softNamesMatch(name, rep.fullName)) {
      return {
        status: "match",
        cardName: name,
        matchedAgainst: `dirigeant:${rep.fullName}`,
        checkedAt,
      };
    }
  }
  if (softNamesMatch(name, companyName)) {
    return {
      status: "match",
      cardName: name,
      matchedAgainst: `entreprise:${companyName}`,
      checkedAt,
    };
  }
  return {
    status: "mismatch",
    cardName: name,
    matchedAgainst: undefined,
    checkedAt,
  };
}

function mapGouvDirigeants(dirigeants) {
  if (!dirigeants?.length) return [];
  const mapped = [];
  for (const d of dirigeants) {
    const isMoral =
      d.type_dirigeant === "personne morale" ||
      d.type_dirigeant === "personne_morale" ||
      Boolean(d.denomination && !d.nom);
    const fullName = isMoral
      ? (d.denomination ?? "").trim()
      : [d.prenoms, d.nom].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    if (!fullName) continue;
    mapped.push({
      fullName,
      role: d.qualite?.trim() || undefined,
      kind: isMoral ? "personne_morale" : "personne_physique",
    });
  }
  const seen = new Set();
  return mapped.filter((rep) => {
    const key = rep.fullName.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const cases = [
  {
    title: "Match dirigeant exact (casse différente)",
    input: {
      cardName: "JEAN DUPONT",
      companyName: "DUPONT PEINTURE NORD SAS",
      legalRepresentatives: [{ fullName: "Jean Dupont", role: "Gérant" }],
    },
    expect: "match",
  },
  {
    title: "Match dirigeant avec accents",
    input: {
      cardName: "Marie Helene Lefevre",
      companyName: "LEFEVRE ELEC",
      legalRepresentatives: [{ fullName: "Marie-Hélène Lefèvre", role: "Présidente" }],
    },
    expect: "match",
  },
  {
    title: "Match raison sociale (carte pro au nom société)",
    input: {
      cardName: "SAS Artisan Test Nord",
      companyName: "SAS ARTISAN TEST NORD",
      legalRepresentatives: [{ fullName: "Paul Martin", role: "Gérant" }],
    },
    expect: "match",
  },
  {
    title: "Mismatch — carte d'un tiers",
    input: {
      cardName: "Alice Bernard",
      companyName: "DUPONT PEINTURE NORD SAS",
      legalRepresentatives: [{ fullName: "Jean Dupont", role: "Gérant" }],
    },
    expect: "mismatch",
  },
  {
    title: "Unavailable — pas de nom CB",
    input: {
      cardName: undefined,
      companyName: "DUPONT PEINTURE NORD SAS",
      legalRepresentatives: [{ fullName: "Jean Dupont", role: "Gérant" }],
    },
    expect: "unavailable",
  },
  {
    title: "Match partiel prénom+nom inversés / ordre",
    input: {
      cardName: "Dupont Jean",
      companyName: "DUPONT PEINTURE",
      legalRepresentatives: [{ fullName: "Jean Dupont", role: "Gérant" }],
    },
    expect: "match",
  },
];

let failed = 0;
console.log("=== Soft-match CB ↔ dirigeants (exemples fictifs) ===\n");
for (const c of cases) {
  const result = evaluatePaymentNameCheck(c.input);
  const ok = result.status === c.expect;
  if (!ok) failed += 1;
  console.log(`${ok ? "OK" : "FAIL"} | ${c.title}`);
  console.log(`     attendu=${c.expect} obtenu=${result.status}`);
  if (result.cardName) console.log(`     carte=${result.cardName}`);
  if (result.matchedAgainst) console.log(`     via=${result.matchedAgainst}`);
  console.log("");
}

console.log("=== Mapping dirigeants API (payload fictif) ===\n");
const mapped = mapGouvDirigeants([
  {
    nom: "DUPONT",
    prenoms: "Jean",
    qualite: "Gérant",
    type_dirigeant: "personne physique",
  },
  {
    denomination: "HOLDING FICTIVE NORD",
    qualite: "Associé unique",
    type_dirigeant: "personne morale",
  },
  {
    nom: "DUPONT",
    prenoms: "Jean",
    qualite: "Gérant",
    type_dirigeant: "personne physique",
  },
]);
const mapOk =
  mapped.length === 2 &&
  mapped[0].fullName === "Jean DUPONT" &&
  mapped[1].fullName === "HOLDING FICTIVE NORD" &&
  mapped[1].kind === "personne_morale";
if (!mapOk) failed += 1;
console.log(`${mapOk ? "OK" : "FAIL"} | mapping + dédup`);
console.log(JSON.stringify(mapped, null, 2));

console.log("\n=== Scénario inscription fictive ===\n");
const fakePro = {
  companyName: "MARTIN COUVERTURE 59",
  siret: "12345678900012",
  legalRepresentatives: mapGouvDirigeants([
    {
      nom: "MARTIN",
      prenoms: "Lucie",
      qualite: "Gérante",
      type_dirigeant: "personne physique",
    },
  ]),
};
const payOk = evaluatePaymentNameCheck({
  cardName: "Lucie Martin",
  companyName: fakePro.companyName,
  legalRepresentatives: fakePro.legalRepresentatives,
});
const payBad = evaluatePaymentNameCheck({
  cardName: "Compte Inconnu",
  companyName: fakePro.companyName,
  legalRepresentatives: fakePro.legalRepresentatives,
});
const scenarioOk = payOk.status === "match" && payBad.status === "mismatch";
if (!scenarioOk) failed += 1;
console.log(
  `${scenarioOk ? "OK" : "FAIL"} | pro fictif → CB gérante = ${payOk.status}, CB tiers = ${payBad.status}`
);

console.log(`\nRésultat: ${failed === 0 ? "TOUTES LES VERIFS OK" : `${failed} échec(s)`}`);
process.exit(failed === 0 ? 0 : 1);
