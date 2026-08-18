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
import { defaultDecennaleStatus } from "./decennale-verification";
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
            : doc.verificationStatus,
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
      if (!selection.decennaleDocument) {
        return {
          ...selection,
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
        `Décennale ${selection.tradeGroupLabel}`
      );

      return {
        ...selection,
        decennaleStatus: selection.decennaleStatus ?? defaultDecennaleStatus(),
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
  const validation = applyLevel1AutoValidation(
    pro,
    documentsWithOcr,
    selectionsWithOcr
  );

  const rejectionReasons = [...validation.rejectionReasons];
  if (bodacc.status === "active_procedure") {
    const nature = bodacc.nature ?? "procédure collective";
    const when = bodacc.dateParution ? ` (${bodacc.dateParution})` : "";
    rejectionReasons.push(`BODACC : ${nature}${when}.`);
  }

  // Procédure collective = refus. API BODACC down = fail-open (registre + docs seuls).
  const certified =
    validation.certified && bodacc.status !== "active_procedure";

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
    validation.documents,
    validation.tradeSelections,
    bodacc
  );

  return {
    documents: validation.documents,
    tradeSelections: validation.tradeSelections,
    certified,
    rejectionReasons,
    level1Audit,
    bodacc,
  };
}

export function buildLevel1AuditFromEnrichment(
  pro: ProRegistration,
  documents: ProDocument[],
  tradeSelections: ProTradeSelection[],
  bodacc?: BodaccVerificationSnapshot
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
    autoValidatedAt: new Date().toISOString(),
    globalIssues,
    bodacc: bodacc ?? pro.level1Audit?.bodacc,
  };
}
