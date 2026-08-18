import {
  checkBodaccCollectiveProcedures,
  type BodaccProcedureCheck,
} from "./bodacc";
import {
  analyzeDocumentFile,
  checkDocumentConsistency,
} from "./document-ocr";
import { defaultDocumentVerificationStatus } from "./level1-certification";
import { applyLevel1AutoValidation } from "./level1-auto-validation";
import { defaultDecennaleStatus, resolveSelectionGuaranteeType } from "./decennale-verification";
import { tradeRequiresGuaranteeDocument } from "./trade-guarantees";
import type {
  BodaccVerificationSnapshot,
  ProDocument,
  ProLevel1Audit,
  ProRegistration,
  ProTradeSelection,
} from "./store-types";

export async function enrichProDocumentsWithOcr(
  pro: Pick<ProRegistration, "siren" | "siret" | "companyName">,
  documents: ProDocument[]
): Promise<ProDocument[]> {
  return Promise.all(
    documents.map(async (doc) => {
      const ocrHints = await analyzeDocumentFile(doc.fileUrl);
      const consistencyIssues = checkDocumentConsistency(
        ocrHints,
        {
          siren: pro.siren,
          siret: pro.siret,
          companyName: pro.companyName,
        },
        doc.label
      );
      return {
        ...doc,
        verificationStatus:
          doc.id === "rc"
            ? defaultDocumentVerificationStatus()
            : (doc.verificationStatus ?? defaultDocumentVerificationStatus()),
        ocrHints,
        consistencyIssues,
      };
    })
  );
}

export async function enrichTradeSelectionsWithOcr(
  pro: Pick<ProRegistration, "siren" | "siret" | "companyName">,
  selections: ProTradeSelection[]
): Promise<ProTradeSelection[]> {
  return Promise.all(
    selections.map(async (selection) => {
      const guaranteeType = resolveSelectionGuaranteeType(selection);
      if (!tradeRequiresGuaranteeDocument(guaranteeType)) {
        return {
          ...selection,
          guaranteeType,
          decennaleStatus: "validé" as const,
        };
      }

      if (!selection.decennaleDocument) {
        return {
          ...selection,
          guaranteeType,
          decennaleStatus: defaultDecennaleStatus(),
        };
      }

      const ocrHints = await analyzeDocumentFile(selection.decennaleDocument.fileUrl);
      const decennaleConsistencyIssues = checkDocumentConsistency(
        ocrHints,
        {
          siren: pro.siren,
          siret: pro.siret,
          companyName: pro.companyName,
        },
        `Garantie ${selection.tradeGroupLabel}`
      );

      return {
        ...selection,
        guaranteeType,
        decennaleStatus: defaultDecennaleStatus(),
        decennaleOcrHints: ocrHints,
        decennaleConsistencyIssues,
      };
    })
  );
}

function snapshotBodacc(check: BodaccProcedureCheck): BodaccVerificationSnapshot {
  return {
    status: check.status,
    checkedAt: check.checkedAt,
    hasActiveProcedure: check.hasActiveProcedure,
    nature: check.latestBlocking?.nature,
    dateParution: check.latestBlocking?.dateParution,
    announcementId: check.latestBlocking?.id,
    url: check.latestBlocking?.url,
    error: check.error,
  };
}

/**
 * OCR + BODACC + suggestion auto.
 * Ne certifie plus automatiquement : les docs restent « en attente »
 * pour validation manuelle admin (sauf refus dur BODACC côté appelant).
 */
export async function processLevel1Documents(
  pro: Pick<
    ProRegistration,
    "siren" | "siret" | "companyName" | "rcsVerified" | "department" | "level1Audit"
  >,
  documents: ProDocument[],
  tradeSelections: ProTradeSelection[]
) {
  const [documentsWithOcr, selectionsWithOcr, bodaccCheck] = await Promise.all([
    enrichProDocumentsWithOcr(pro, documents),
    enrichTradeSelectionsWithOcr(pro, tradeSelections),
    checkBodaccCollectiveProcedures(pro.siren),
  ]);

  const bodacc = snapshotBodacc(bodaccCheck);

  // Suggestion OCR uniquement — ne pas appliquer les statuts auto.
  const suggestion = applyLevel1AutoValidation(
    pro,
    documentsWithOcr,
    selectionsWithOcr
  );

  const documentsPending = documentsWithOcr.map((doc) =>
    doc.id === "rc"
      ? { ...doc, verificationStatus: defaultDocumentVerificationStatus() }
      : doc
  );
  const selectionsPending = selectionsWithOcr.map((selection) => ({
    ...selection,
    decennaleStatus: defaultDecennaleStatus(),
  }));

  const rejectionReasons: string[] = [];
  if (bodacc.status === "active_procedure") {
    const nature = bodacc.nature ?? "procédure collective";
    const when = bodacc.dateParution ? ` (${bodacc.dateParution})` : "";
    rejectionReasons.push(`BODACC : ${nature}${when}.`);
  }

  if (bodacc.status === "unavailable") {
    console.warn("[level1] BODACC indisponible à l'inscription", bodacc.error);
  }

  const level1Audit = buildLevel1AuditFromEnrichment(
    {
      ...pro,
      companyName: pro.companyName,
      siret: pro.siret,
      siren: pro.siren,
      rcsVerified: pro.rcsVerified,
      department: pro.department as "59" | "62",
      level1Audit: pro.level1Audit,
    } as ProRegistration,
    documentsPending,
    selectionsPending,
    bodacc,
    {
      wouldCertify:
        suggestion.certified && bodacc.status !== "active_procedure",
      reasons: [
        ...suggestion.rejectionReasons,
        ...(bodacc.status === "active_procedure" ? rejectionReasons : []),
      ],
      suggestedAt: new Date().toISOString(),
    }
  );

  return {
    documents: documentsPending,
    tradeSelections: selectionsPending,
    /** Toujours false — certification = action admin. */
    certified: false as const,
    /** Blocage dur (BODACC procédure active). */
    blocked: bodacc.status === "active_procedure",
    rejectionReasons,
    ocrSuggest: level1Audit.ocrSuggest,
    level1Audit,
    bodacc,
  };
}

export function buildLevel1AuditFromEnrichment(
  pro: ProRegistration,
  documents: ProDocument[],
  tradeSelections: ProTradeSelection[],
  bodacc?: BodaccVerificationSnapshot,
  ocrSuggest?: ProLevel1Audit["ocrSuggest"]
): ProLevel1Audit {
  const globalIssues = [
    ...(documents.flatMap((d) => d.consistencyIssues ?? [])),
    ...(tradeSelections.flatMap((s) => s.decennaleConsistencyIssues ?? [])),
  ].filter((issue) => issue.severity === "error");

  if (bodacc?.status === "active_procedure") {
    globalIssues.push({
      field: "BODACC",
      message: `Procédure collective : ${bodacc.nature ?? "signalement BODACC"}${
        bodacc.dateParution ? ` (${bodacc.dateParution})` : ""
      }.`,
      severity: "error",
    });
  }

  return {
    rcsVerifiedAt: pro.level1Audit?.rcsVerifiedAt ?? new Date().toISOString(),
    geoVerified: pro.level1Audit?.geoVerified ?? false,
    geoDepartment: pro.level1Audit?.geoDepartment ?? pro.department,
    consistencyCheckedAt: new Date().toISOString(),
    manualReviewRequired: true,
    ocrSuggest,
    globalIssues,
    bodacc: bodacc ?? pro.level1Audit?.bodacc,
  };
}
