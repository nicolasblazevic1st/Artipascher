import { promises as fs } from "fs";
import path from "path";

import { parseFrenchMoneyToCents } from "./money";

/** Ordre important : milliers avec séparateurs avant les entiers bruts (évite « 248 » dans « 2480 »). */
const MONEY_TOKEN =
  "(\\d{1,3}(?:[ .\\u00a0]\\d{3})+(?:[.,]\\d{1,2})?|\\d+[.,]\\d{1,2}|\\d+)";

const LABELED_TOTAL_PATTERNS: RegExp[] = [
  new RegExp(
    `(?:total\\s*(?:ttc|t\\.?t\\.?c\\.?)|montant\\s*(?:ttc|t\\.?t\\.?c\\.?)|net\\s*[àa]\\s*payer|total\\s*[àa]\\s*payer|reste\\s*[àa]\\s*payer|prix\\s*ttc)\\s*[:\\-]?\\s*${MONEY_TOKEN}\\s*(?:€|eur|euros)?`,
    "gi"
  ),
  new RegExp(
    `${MONEY_TOKEN}\\s*(?:€|eur|euros)?\\s*(?:ttc|t\\.?t\\.?c\\.?)`,
    "gi"
  ),
];

const ANY_MONEY_PATTERN = new RegExp(
  `${MONEY_TOKEN}\\s*(?:€|eur|euros)`,
  "gi"
);

export interface DevisOcrMatchResult {
  ok: boolean;
  error?: string;
  ocrAmountCents?: number;
  ocrAmountEuros?: number;
  matchedLabel?: string;
  rawSnippet?: string;
  extractedTextLength: number;
}

async function extractPdfTextFromBuffer(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text ?? "";
  } catch {
    return "";
  }
}

export async function extractTextFromDevisBuffer(
  buffer: Buffer,
  fileNameOrMime: string
): Promise<string> {
  const lower = fileNameOrMime.toLowerCase();
  if (lower.includes("pdf") || lower.endsWith(".pdf")) {
    return extractPdfTextFromBuffer(buffer);
  }
  return "";
}

export async function extractTextFromDevisFileUrl(fileUrl: string): Promise<string> {
  const relative = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl;
  const filePath = path.join(process.cwd(), "public", relative);
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".pdf") return "";
  try {
    const buffer = await fs.readFile(filePath);
    return extractPdfTextFromBuffer(buffer);
  } catch {
    return "";
  }
}

function collectLabeledTotals(text: string): Array<{ cents: number; label: string }> {
  const found: Array<{ cents: number; label: string }> = [];
  for (const pattern of LABELED_TOTAL_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const token = match[1];
      const cents = parseFrenchMoneyToCents(token);
      if (cents != null && cents >= 100) {
        found.push({ cents, label: match[0].replace(/\s+/g, " ").trim().slice(0, 80) });
      }
    }
  }
  return found;
}

function collectAllMoneyAmounts(text: string): number[] {
  const centsList: number[] = [];
  const seen = new Set<number>();
  ANY_MONEY_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(ANY_MONEY_PATTERN)) {
    const cents = parseFrenchMoneyToCents(match[1]);
    if (cents != null && cents >= 100 && !seen.has(cents)) {
      seen.add(cents);
      centsList.push(cents);
    }
  }
  // Montants sans symbole € mais avec virgule décimale (lignes de devis)
  const bare = text.matchAll(
    /(?<![.\d])(\d{1,3}(?:[ .\u00a0]\d{3})+[.,]\d{2}|\d+[.,]\d{2})(?![.\d])/g
  );
  for (const match of bare) {
    const cents = parseFrenchMoneyToCents(match[1]);
    if (cents != null && cents >= 100 && !seen.has(cents)) {
      seen.add(cents);
      centsList.push(cents);
    }
  }
  return centsList;
}

/**
 * Vérifie que le texte OCR du devis contient un montant TTC égal à `expectedCents`
 * (égalité stricte au centime près).
 */
export function verifyDevisTextMatchesAmount(
  text: string,
  expectedCents: number
): DevisOcrMatchResult {
  const normalized = text.replace(/\r/g, "");
  const snippet = normalized.replace(/\s+/g, " ").trim().slice(0, 280);
  const base = { extractedTextLength: normalized.trim().length, rawSnippet: snippet };

  if (!normalized.trim()) {
    return {
      ok: false,
      error:
        "Impossible d'extraire le texte du devis. Fournissez un PDF texte (non scanné) contenant le montant TTC.",
      ...base,
    };
  }

  const labeled = collectLabeledTotals(normalized);
  if (labeled.length > 0) {
    const exact = labeled.find((l) => l.cents === expectedCents);
    if (exact) {
      return {
        ok: true,
        ocrAmountCents: exact.cents,
        ocrAmountEuros: exact.cents / 100,
        matchedLabel: exact.label,
        ...base,
      };
    }
    const shown = labeled[0];
    return {
      ok: false,
      error: `Montant OCR du devis (${(shown.cents / 100).toFixed(2).replace(".", ",")} €) ≠ enchère (${(expectedCents / 100).toFixed(2).replace(".", ",")} €). Ils doivent être identiques au centime près.`,
      ocrAmountCents: shown.cents,
      ocrAmountEuros: shown.cents / 100,
      matchedLabel: shown.label,
      ...base,
    };
  }

  const all = collectAllMoneyAmounts(normalized);
  if (all.includes(expectedCents)) {
    return {
      ok: true,
      ocrAmountCents: expectedCents,
      ocrAmountEuros: expectedCents / 100,
      matchedLabel: "montant détecté dans le devis",
      ...base,
    };
  }

  if (all.length === 0) {
    return {
      ok: false,
      error:
        "Aucun montant en euros détecté dans le devis. Le PDF doit indiquer clairement le total TTC.",
      ...base,
    };
  }

  const nearest = all.reduce((best, c) =>
    Math.abs(c - expectedCents) < Math.abs(best - expectedCents) ? c : best
  );

  return {
    ok: false,
    error: `Aucun montant du devis ne correspond à votre enchère (${(expectedCents / 100).toFixed(2).replace(".", ",")} €) au centime près. Montant le plus proche détecté : ${(nearest / 100).toFixed(2).replace(".", ",")} €.`,
    ocrAmountCents: nearest,
    ocrAmountEuros: nearest / 100,
    ...base,
  };
}

export async function verifyDevisFileMatchesAmount(
  buffer: Buffer,
  fileNameOrMime: string,
  expectedCents: number
): Promise<DevisOcrMatchResult> {
  const text = await extractTextFromDevisBuffer(buffer, fileNameOrMime);
  return verifyDevisTextMatchesAmount(text, expectedCents);
}
