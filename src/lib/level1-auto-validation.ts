import type { Level1ConsistencyIssue, Level1OcrHints } from "./store-types";
import type { DecennaleVerificationStatus, DocumentVerificationStatus } from "./store-types";
import type { ProDocument, ProRegistration, ProTradeSelection } from "./store-types";
import { isAllowedDepartment } from "./rcs";

const RC_KEYWORDS = [
  "responsabilit",
  "rc pro",
  "rc professionnelle",
  "assurance",
  "attestation",
];

const DECENNALE_KEYWORDS = [
  "decennale",
  "décennale",
  "garantie",
  "dommage",
  "ouvrage",
];

function hasBlockingIssues(issues: Level1ConsistencyIssue[] | undefined): boolean {
  return (issues ?? []).some((issue) => issue.severity === "error");
}

function textMatchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function documentHasReadableText(hints: Level1OcrHints | undefined): boolean {
  return Boolean(hints?.rawSnippet && hints.rawSnippet.trim().length > 20);
}

function sirenMatches(hints: Level1OcrHints | undefined, expectedSiren: string): boolean {
  return Boolean(hints?.siren && hints.siren === expectedSiren);
}

export function autoValidateRcDocument(
  doc: ProDocument,
  expectedSiren: string
): { status: DocumentVerificationStatus; reason?: string } {
  const issues = doc.consistencyIssues ?? [];

  if (hasBlockingIssues(issues)) {
    const first = issues.find((i) => i.severity === "error");
    return { status: "rejeté", reason: first?.message ?? "Incohérence détectée sur la RC pro." };
  }

  if (!documentHasReadableText(doc.ocrHints)) {
    return {
      status: "rejeté",
      reason:
        "RC pro illisible (PDF scanné ou image). Téléversez un PDF texte ou une photo nette.",
    };
  }

  const text = doc.ocrHints!.rawSnippet!;
  const sirenOk = sirenMatches(doc.ocrHints, expectedSiren);
  const hasInsurer = Boolean(doc.ocrHints?.insurer);
  const hasRcKeyword = textMatchesKeywords(text, RC_KEYWORDS);

  if (sirenOk || (hasInsurer && hasRcKeyword) || (sirenOk && hasInsurer)) {
    return { status: "validé" };
  }

  if (hasInsurer || hasRcKeyword) {
    return { status: "validé" };
  }

  return {
    status: "rejeté",
    reason: "RC pro : assureur ou SIREN non détecté dans le document.",
  };
}

export function autoValidateDecennaleDocument(
  hints: Level1OcrHints | undefined,
  issues: Level1ConsistencyIssue[] | undefined,
  expectedSiren: string,
  tradeLabel: string
): { status: DecennaleVerificationStatus; reason?: string } {
  if (hasBlockingIssues(issues)) {
    const first = issues?.find((i) => i.severity === "error");
    return {
      status: "non_couvert",
      reason: first?.message ?? `Décennale ${tradeLabel} : incohérence SIREN.`,
    };
  }

  if (!documentHasReadableText(hints)) {
    return {
      status: "non_couvert",
      reason: `Décennale « ${tradeLabel} » illisible. Téléversez un PDF texte ou une photo nette.`,
    };
  }

  const text = hints!.rawSnippet!;
  const sirenOk = sirenMatches(hints, expectedSiren);
  const hasInsurer = Boolean(hints?.insurer);
  const hasDecennaleKeyword = textMatchesKeywords(text, DECENNALE_KEYWORDS);

  if (sirenOk && (hasDecennaleKeyword || hasInsurer)) {
    return { status: "validé" };
  }

  if (sirenOk) {
    return { status: "validé" };
  }

  if (hasDecennaleKeyword && hasInsurer) {
    return { status: "validé" };
  }

  return {
    status: "non_couvert",
    reason: `Décennale « ${tradeLabel} » : SIREN ou mention décennale non détectée.`,
  };
}

export interface Level1AutoValidationResult {
  documents: ProDocument[];
  tradeSelections: ProTradeSelection[];
  certified: boolean;
  rejectionReasons: string[];
}

export function applyLevel1AutoValidation(
  pro: Pick<ProRegistration, "siren" | "rcsVerified" | "department" | "level1Audit">,
  documents: ProDocument[],
  tradeSelections: ProTradeSelection[]
): Level1AutoValidationResult {
  const rejectionReasons: string[] = [];

  if (!pro.rcsVerified) {
    rejectionReasons.push("SIREN non vérifié au registre.");
  }

  if (!isAllowedDepartment(pro.department) && !pro.level1Audit?.geoVerified) {
    rejectionReasons.push("Établissement hors zone 59 / 62.");
  }

  const validatedDocuments = documents.map((doc) => {
    if (doc.id !== "rc") return doc;

    const result = autoValidateRcDocument(doc, pro.siren);
    if (result.status === "rejeté" && result.reason) {
      rejectionReasons.push(result.reason);
    }
    return { ...doc, verificationStatus: result.status };
  });

  const validatedSelections = tradeSelections.map((selection) => {
    const result = autoValidateDecennaleDocument(
      selection.decennaleOcrHints,
      selection.decennaleConsistencyIssues,
      pro.siren,
      selection.tradeGroupLabel
    );
    if (result.status === "non_couvert" && result.reason) {
      rejectionReasons.push(result.reason);
    }
    return { ...selection, decennaleStatus: result.status };
  });

  const rcDoc = validatedDocuments.find((d) => d.id === "rc");
  const rcOk = rcDoc?.verificationStatus === "validé";
  const decennaleOk = validatedSelections.every((s) => s.decennaleStatus === "validé");
  const baseOk = Boolean(
    pro.rcsVerified &&
      (isAllowedDepartment(pro.department) || pro.level1Audit?.geoVerified)
  );

  const certified = baseOk && rcOk && decennaleOk && rejectionReasons.length === 0;

  return {
    documents: validatedDocuments,
    tradeSelections: validatedSelections,
    certified,
    rejectionReasons,
  };
}
