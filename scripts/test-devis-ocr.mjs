/**
 * Smoke test extraction / matching OCR devis.
 * Usage : node scripts/test-devis-ocr.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Compile-free reimplementation mirror for quick check (logic duplicated from devis-ocr)
function parseFrenchMoneyToCents(raw) {
  let s = raw.replace(/\u00a0/g, " ").trim();
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) s = s.replace(/\./g, "").replace(/\s/g, "").replace(",", ".");
  else if (hasComma) s = s.replace(/\s/g, "").replace(",", ".");
  else {
    s = s.replace(/\s/g, "");
    const parts = s.split(".");
    if (parts.length > 2) {
      const dec = parts.pop();
      s = parts.join("") + (dec.length <= 2 ? `.${dec}` : dec);
    }
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

const MONEY_TOKEN =
  "(\\d{1,3}(?:[ .\\u00a0]\\d{3})+(?:[.,]\\d{1,2})?|\\d+[.,]\\d{1,2}|\\d+)";
const labeled = new RegExp(
  `(?:total\\s*(?:ttc|t\\.?t\\.?c\\.?)|montant\\s*(?:ttc|t\\.?t\\.?c\\.?)|net\\s*[àa]\\s*payer)\\s*[:\\-]?\\s*${MONEY_TOKEN}\\s*(?:€|eur|euros)?`,
  "gi"
);

function match(text, expectedCents) {
  for (const m of text.matchAll(labeled)) {
    const cents = parseFrenchMoneyToCents(m[1]);
    if (cents === expectedCents) return { ok: true, cents };
    if (cents != null) return { ok: false, cents };
  }
  return { ok: false, cents: null };
}

const cases = [
  ["Total TTC : 2 480,00 €", 248000, true],
  ["TOTAL TTC 2480€", 248000, true],
  ["Montant TTC : 1.234,56 EUR", 123456, true],
  ["Total TTC : 2 480,01 €", 248000, false],
  ["Net à payer 999,99 €", 99999, true],
];

let failed = 0;
for (const [text, cents, expectOk] of cases) {
  const r = match(text, cents);
  const ok = r.ok === expectOk;
  console.log(ok ? "OK " : "FAIL", JSON.stringify(text), "→", r, "expectedOk=", expectOk);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`\n${failed} cas en échec`);
  process.exit(1);
}
console.log("\nTous les cas OK");
void require;
