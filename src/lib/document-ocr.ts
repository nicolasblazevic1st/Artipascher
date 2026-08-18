import { promises as fs } from "fs";
import path from "path";

import type { Level1ConsistencyIssue, Level1OcrHints } from "./store-types";

/**
 * Extraction documents pro : PDF texte uniquement (pdf-parse), puis regex.
 * Pas d’OCR image / Tesseract — les attestations doivent être le PDF original.
 */

const SIREN_PATTERN = /\b(\d{3}\s?\d{3}\s?\d{3})\b/g;
const SIRET_PATTERN = /\b(\d{3}\s?\d{3}\s?\d{3}\s?\d{5})\b/g;
const DATE_PATTERN =
  /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}\s+(?:janv|févr|fevr|mars|avr|mai|juin|juil|août|aout|sept|oct|nov|déc|dec)[a-z.]*\s+\d{4})\b/gi;

const INSURER_KEYWORDS = [
  "axa",
  "allianz",
  "maif",
  "macif",
  "groupama",
  "generali",
  "swiss life",
  "smabtp",
  "mila",
  "april",
  "covéa",
  "covea",
  "zurich",
  "hiscox",
  // Génériques en dernier (souvent présents sans nom de marque).
  "assureur",
  "assurance",
];

function normalizeDigits(value: string): string {
  return value.replace(/\s/g, "");
}

function normalizeCompanyName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function companyNamesMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const na = normalizeCompanyName(a);
  const nb = normalizeCompanyName(b);
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
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

async function extractPdfText(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath);
    return extractPdfTextFromBuffer(buffer);
  } catch {
    return "";
  }
}

async function extractTextFromUpload(fileUrl: string): Promise<string> {
  const relative = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl;
  const filePath = path.join(process.cwd(), "public", relative);
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    return extractPdfText(filePath);
  }

  // Image / scan : pas d’extraction — seuls les PDF texte + regex sont utilisés.
  return "";
}

export function parseOcrHintsFromText(text: string): Level1OcrHints {
  const hints: Level1OcrHints = {};

  if (!text.trim()) {
    return hints;
  }

  const siretMatches = [...text.matchAll(SIRET_PATTERN)].map((m) => normalizeDigits(m[1]));
  const sirenMatches = [...text.matchAll(SIREN_PATTERN)].map((m) => normalizeDigits(m[1]));

  if (siretMatches[0]) hints.siret = siretMatches[0];
  if (sirenMatches[0]) hints.siren = sirenMatches[0];
  if (!hints.siren && hints.siret) hints.siren = hints.siret.slice(0, 9);

  const dateMatches = [...text.matchAll(DATE_PATTERN)].map((m) => m[1]);
  if (dateMatches.length > 0) {
    hints.validUntil = dateMatches[dateMatches.length - 1];
  }

  const lower = text.toLowerCase();
  for (const keyword of INSURER_KEYWORDS) {
    if (lower.includes(keyword)) {
      hints.insurer = keyword;
      break;
    }
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 8 && line.length < 120);
  if (lines[0]) hints.companyName = lines[0];

  hints.rawSnippet = text.replace(/\s+/g, " ").trim().slice(0, 280);
  return hints;
}

export async function analyzeDocumentFile(fileUrl: string): Promise<Level1OcrHints> {
  const text = await extractTextFromUpload(fileUrl);
  return parseOcrHintsFromText(text);
}

/** Analyse un PDF en mémoire (bac à sable admin — pas de fichier public). */
export async function analyzeDocumentBuffer(
  buffer: Buffer,
  filename: string
): Promise<{ hints: Level1OcrHints; textLength: number }> {
  const ext = path.extname(filename).toLowerCase();
  if (ext !== ".pdf") {
    return { hints: {}, textLength: 0 };
  }
  const text = await extractPdfTextFromBuffer(buffer);
  return {
    hints: parseOcrHintsFromText(text),
    textLength: text.trim().length,
  };
}

export function checkDocumentConsistency(
  hints: Level1OcrHints | undefined,
  expected: { siren: string; siret: string; companyName: string },
  documentLabel: string
): Level1ConsistencyIssue[] {
  if (!hints?.rawSnippet) {
    return [
      {
        field: documentLabel,
        message:
          "Texte non lisible — utilisez le PDF original de l’assureur (pas une photo ni un scan).",
        severity: "warning",
      },
    ];
  }

  const issues: Level1ConsistencyIssue[] = [];

  if (hints.siren && hints.siren !== expected.siren) {
    issues.push({
      field: "SIREN",
      message: `SIREN détecté (${hints.siren}) ≠ registre (${expected.siren}).`,
      severity: "error",
    });
  }

  if (hints.siret && hints.siret !== expected.siret) {
    issues.push({
      field: "SIRET",
      message: `SIRET détecté (${hints.siret}) ≠ registre (${expected.siret}).`,
      severity: "warning",
    });
  }

  if (
    hints.companyName &&
    !companyNamesMatch(hints.companyName, expected.companyName)
  ) {
    issues.push({
      field: "Raison sociale",
      message: `Nom détecté (« ${hints.companyName.slice(0, 40)}… ») différent du registre.`,
      severity: "warning",
    });
  }

  if (issues.length === 0 && hints.siren === expected.siren) {
    issues.push({
      field: documentLabel,
      message: "Cohérence SIREN OK avec le registre.",
      severity: "warning",
    });
  }

  return issues;
}
