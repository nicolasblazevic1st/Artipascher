/**
 * Telecharge des documents VERIFIABLES publics + genere attestations de test
 * alignees sur une vraie entreprise 59 (donnees registre / INSEE).
 *
 * Sources:
 * - Avis de situation SIRENE (INSEE) — PDF officiel gratuit
 * - Modele attestation decennale (Service-Public) — modele officiel
 * - Attestations RC / decennale remplies = SPECIMEN de test (pas de vraie police)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "fixtures", "documents-test");
fs.mkdirSync(outDir, { recursive: true });

/** Entreprise publique active en 59 (registre gouv). */
const SIRET = "61712011800170";

function ascii(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ");
}

function escapePdf(text) {
  return ascii(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdf(lines) {
  const contentLines = ["BT", "/F1 10 Tf", "40 800 Td", "12 TL"];
  lines.forEach((line, i) => {
    const safe = escapePdf(line);
    if (i === 0) contentLines.push(`(${safe}) Tj`);
    else contentLines.push("T*", `(${safe}) Tj`);
  });
  contentLines.push("ET");
  const stream = contentLines.join("\n");
  const objects = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n"
  );
  objects.push(
    `4 0 obj<< /Length ${Buffer.byteLength(stream, "utf8")} >>stream\n${stream}\nendstream\nendobj\n`
  );
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8");
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download fail ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

console.log("1) Avis SIRENE officiel INSEE…");
const inseeSize = await download(
  `https://api-avis-situation-sirene.insee.fr/identification/pdf/${SIRET}`,
  path.join(outDir, "01-avis-situation-sirene-INSEE.pdf")
);
console.log("   OK", inseeSize, "octets");

console.log("2) Modele decennale officiel Service-Public…");
const spSize = await download(
  "https://entreprendre.service-public.gouv.fr/telecharger-pdf?path=aHR0cHM6Ly9lbnRyZXByZW5kcmUuc2VydmljZS1wdWJsaWMuZ291di5mci92b3Nkcm9pdHMvUjQ0ODY4",
  path.join(outDir, "02-modele-decennale-service-public.pdf")
);
console.log("   OK", spSize, "octets");

console.log("3) Donnees registre gouv…");
const regJson = await fetch(
  `https://recherche-entreprises.api.gouv.fr/search?q=${SIRET}&page=1&per_page=1`
).then((r) => r.json());
const company = regJson.results?.[0];
if (!company) throw new Error("Entreprise introuvable au registre");

const dirigeants = (company.dirigeants || [])
  .map((d) => {
    const fullName = d.denomination
      ? d.denomination
      : [d.prenoms, d.nom].filter(Boolean).join(" ");
    return {
      fullName: (fullName || "").trim(),
      role: d.qualite || undefined,
      kind: d.denomination && !d.nom ? "personne_morale" : "personne_physique",
    };
  })
  .filter((d) => d.fullName);

const firstPerson =
  dirigeants.find((d) => d.kind === "personne_physique") || dirigeants[0];

const profile = {
  source: {
    avisSirene: "https://avis-situation-sirene.insee.fr/ (PDF API INSEE)",
    modeleDecennale: "https://entreprendre.service-public.gouv.fr/vosdroits/R44868",
    registre: "https://recherche-entreprises.api.gouv.fr/",
  },
  company: {
    companyName: company.nom_complet,
    siret: SIRET,
    siren: SIRET.slice(0, 9),
    city: company.siege?.libelle_commune,
    postalCode: company.siege?.code_postal,
    department: (company.siege?.code_postal || "").slice(0, 2),
    address: company.siege?.adresse || company.siege?.geo_adresse,
    naf: company.activite_principale || company.siege?.activite_principale,
    legalRepresentatives: dirigeants,
  },
  stripeCardTest: {
    number: "4242 4242 4242 4242",
    expiry: "12/34",
    cvc: "123",
    suggestedBillingNameMatch: firstPerson?.fullName || null,
    suggestedBillingNameMismatch: "Camille Testeur Inconnu",
  },
  warning:
    "Les attestations RC/decennale generees sont des SPECIMENS de test Artipascher (pas de vraie police). L'avis SIRENE et le modele Service-Public sont des documents officiels publics.",
};

fs.writeFileSync(
  path.join(outDir, "fiche-entreprise-verifiable.json"),
  JSON.stringify(profile, null, 2)
);

const stamp = [
  "*** SPECIMEN TEST ARTIPASCHER — PAS UNE VRAIE ATTESTATION D'ASSURANCE ***",
  "Rempli a partir de donnees publiques (INSEE / registre) pour tests OCR uniquement.",
  "",
];

const c = profile.company;
const rc = buildPdf([
  ...stamp,
  c.companyName,
  "ATTESTATION D'ASSURANCE RESPONSABILITE CIVILE PROFESSIONNELLE (SPECIMEN)",
  "",
  "Assureur : AXA (fictif pour test)",
  "N contrat : RC-TEST-ARTIPASCHER-001",
  `Assure : ${c.companyName}`,
  `SIREN : ${c.siren}`,
  `SIRET : ${c.siret}`,
  `Adresse : ${c.address || ""}`,
  `${c.postalCode || ""} ${c.city || ""}`,
  `Activite : ${c.naf || ""}`,
  "Validite jusqu'au : 31/12/2026",
  "",
  "Document de test — aucune garantie d'assurance.",
]);

const dec = buildPdf([
  ...stamp,
  c.companyName,
  "ATTESTATION D'ASSURANCE RESPONSABILITE CIVILE DECENNALE (SPECIMEN)",
  "Base: modele officiel Service-Public R44868 — champs remplis pour test OCR",
  "",
  "Assureur : AXA (fictif pour test)",
  "N contrat : DEC-TEST-ARTIPASCHER-001",
  `Assure : ${c.companyName}`,
  `SIREN : ${c.siren}`,
  `SIRET : ${c.siret}`,
  `Adresse : ${c.address || ""}`,
  `${c.postalCode || ""} ${c.city || ""}`,
  "Activite / corps de metier couvert : Travaux publics / peinture",
  "Validite jusqu'au : 31/12/2026",
  "",
  "Document de test — aucune garantie decennale.",
]);

fs.writeFileSync(path.join(outDir, "03-rc-pro-specimen-aligne-registre.pdf"), rc);
fs.writeFileSync(path.join(outDir, "04-decennale-specimen-aligne-registre.pdf"), dec);

// Copie pratique sous noms courts pour upload
fs.copyFileSync(
  path.join(outDir, "01-avis-situation-sirene-INSEE.pdf"),
  path.join(outDir, "kbis-ou-avis-sirene.pdf")
);
fs.copyFileSync(
  path.join(outDir, "03-rc-pro-specimen-aligne-registre.pdf"),
  path.join(outDir, "rc-pro.pdf")
);
fs.copyFileSync(
  path.join(outDir, "04-decennale-specimen-aligne-registre.pdf"),
  path.join(outDir, "decennale.pdf")
);

console.log("\nProfil:");
console.log(JSON.stringify(profile.company, null, 2));
console.log("\nFichiers prets dans", outDir);
console.log("- kbis-ou-avis-sirene.pdf  (OFFICIEL INSEE)");
console.log("- rc-pro.pdf               (specimen aligne SIRET reel)");
console.log("- decennale.pdf            (specimen aligne SIRET reel)");
console.log("- 02-modele-decennale-service-public.pdf (OFFICIEL SP)");
