/**
 * Genere des PDF specimen (texte extractible, ASCII) pour tests inscription / OCR.
 * Usage: node scripts/generate-test-documents.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "fixtures", "documents-test");

const fiche = JSON.parse(
  fs.readFileSync(path.join(outDir, "fiche-entreprise.json"), "utf8")
);
const c = fiche.company;
const ins = fiche.insurance;

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
  const contentLines = ["BT", "/F1 10 Tf", "40 800 Td", "13 TL"];
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
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8");
}

const stamp = [
  "*** SPECIMEN / DOCUMENT DE TEST ARTIPASCHER - NON OFFICIEL ***",
  "Ne constitue pas un KBIS, une attestation d'assurance ni un document legal.",
  "",
];

const kbis = buildPdf([
  ...stamp,
  c.companyName,
  `Forme juridique : ${c.legalForm}`,
  `SIREN : ${c.siren}`,
  `SIRET du siege : ${c.siret}`,
  `Code APE / NAF : ${c.naf} - ${c.nafLabel}`,
  `Adresse du siege : ${c.address}, ${c.postalCode} ${c.city}`,
  `Departement : ${c.department}`,
  `Date d'immatriculation : ${c.createdAt}`,
  "Etat administratif : Active (simulation)",
  "",
  "Representants / dirigeants :",
  `${c.dirigeant.fullName} - ${c.dirigeant.role}`,
  "",
  `Extrait fictif emis le ${new Date().toLocaleDateString("fr-FR")}`,
  "Greffe / RNE : SPECIMEN TEST UNIQUEMENT",
]);

const rc = buildPdf([
  ...stamp,
  c.companyName,
  "ATTESTATION D'ASSURANCE RESPONSABILITE CIVILE PROFESSIONNELLE",
  "",
  `Assureur : ${ins.insurer}`,
  `N contrat : ${ins.contractRc}`,
  `Assure : ${c.companyName}`,
  `SIREN : ${c.siren}`,
  `SIRET : ${c.siret}`,
  `Adresse : ${c.address}, ${c.postalCode} ${c.city}`,
  `Activite couverte : ${c.nafLabel}`,
  `Validite jusqu'au : ${ins.validUntil}`,
  "",
  "La presente attestation est un SPECIMEN de test Artipascher.",
  "Elle ne confere aucune garantie d'assurance.",
]);

const decennale = buildPdf([
  ...stamp,
  c.companyName,
  "ATTESTATION D'ASSURANCE RESPONSABILITE CIVILE DECENNALE",
  "",
  `Assureur : ${ins.insurer}`,
  `N contrat : ${ins.contractDecennale}`,
  `Assure : ${c.companyName}`,
  `SIREN : ${c.siren}`,
  `SIRET : ${c.siret}`,
  `Adresse : ${c.address}, ${c.postalCode} ${c.city}`,
  `Activite / corps de metier couvert : ${ins.tradeCovered}`,
  "Travaux de peinture et vitrerie",
  `Validite jusqu'au : ${ins.validUntil}`,
  "",
  "La presente attestation est un SPECIMEN de test Artipascher.",
  "Elle ne confere aucune garantie decennale.",
]);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "kbis-specimen.pdf"), kbis);
fs.writeFileSync(path.join(outDir, "rc-pro-specimen.pdf"), rc);
fs.writeFileSync(path.join(outDir, "decennale-peinture-specimen.pdf"), decennale);

console.log("PDF generes dans", outDir);
console.log("- kbis-specimen.pdf");
console.log("- rc-pro-specimen.pdf");
console.log("- decennale-peinture-specimen.pdf");
console.log("Entreprise fictive:", c.companyName, "| SIRET", c.siret);
