import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFParse } from "pdf-parse";
import { verifyWithRegistry } from "../src/lib/rcs";
import { evaluatePaymentNameCheck } from "../src/lib/payment-identity";
import { parseOcrHintsFromText } from "../src/lib/document-ocr";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "fixtures", "documents-test");
const fiche = JSON.parse(
  fs.readFileSync(path.join(dir, "fiche-entreprise-verifiable.json"), "utf8")
);
const siret = fiche.company.siret;

async function pdfText(file: string) {
  const buf = fs.readFileSync(path.join(dir, file));
  const parser = new PDFParse({ data: buf });
  const result = await parser.getText();
  await parser.destroy();
  return result.text ?? "";
}

console.log("=== TESTS TYPE PROD — documents verifiables ===\n");

const reg = await verifyWithRegistry(siret);
console.log("1) Registre gouv (verifyWithRegistry)");
console.log("   valid:", reg.valid, "|", reg.companyName, "|", reg.city, reg.department);
console.log("   dirigeants:", (reg.legalRepresentatives || []).map((d) => d.fullName).join(" · ") || "(aucun)");
if (!reg.valid || reg.department !== "59" && reg.department !== "62") {
  console.error("FAIL registre / zone");
  process.exit(1);
}
console.log("   OK\n");

const avisText = await pdfText("kbis-ou-avis-sirene.pdf");
const avisHints = parseOcrHintsFromText(avisText);
console.log("2) OCR avis SIRENE officiel INSEE");
console.log("   siren:", avisHints.siren, "| siret:", avisHints.siret);
console.log("   snippet:", (avisHints.rawSnippet || "").slice(0, 120));
const avisOk =
  avisHints.siren === fiche.company.siren ||
  (avisHints.siret || "").replace(/\s/g, "") === siret ||
  avisText.replace(/\s/g, "").includes(siret);
console.log(avisOk ? "   OK\n" : "   FAIL\n");

const rcText = await pdfText("rc-pro.pdf");
const rcHints = parseOcrHintsFromText(rcText);
console.log("3) OCR RC specimen aligne");
console.log("   siren:", rcHints.siren, "| insurer:", rcHints.insurer);
const rcOk = rcHints.siren === fiche.company.siren && /axa/i.test(rcText);
console.log(rcOk ? "   OK\n" : "   FAIL\n");

const decText = await pdfText("decennale.pdf");
const decHints = parseOcrHintsFromText(decText);
console.log("4) OCR decennale specimen aligne");
console.log("   siren:", decHints.siren, "| insurer:", decHints.insurer);
const decOk = decHints.siren === fiche.company.siren;
console.log(decOk ? "   OK\n" : "   FAIL\n");

const matchName = fiche.stripeCardTest.suggestedBillingNameMatch;
const mismatchName = fiche.stripeCardTest.suggestedBillingNameMismatch;
const m1 = evaluatePaymentNameCheck({
  cardName: matchName,
  companyName: reg.companyName,
  legalRepresentatives: reg.legalRepresentatives,
});
const m2 = evaluatePaymentNameCheck({
  cardName: mismatchName,
  companyName: reg.companyName,
  legalRepresentatives: reg.legalRepresentatives,
});
console.log("5) Soft-match CB (comme webhook Stripe)");
console.log("  ", matchName, "→", m1.status, m1.matchedAgainst || "");
console.log("  ", mismatchName, "→", m2.status);
const payOk = m1.status === "match" && m2.status === "mismatch";
console.log(payOk ? "   OK\n" : "   FAIL\n");

const all = reg.valid && avisOk && rcOk && decOk && payOk;
console.log(all ? "RESULTAT: TOUTES LES VERIFS OK" : "RESULTAT: ECHECS");
process.exit(all ? 0 : 1);
