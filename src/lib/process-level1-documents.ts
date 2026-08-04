import {
  analyzeDocumentFile,
  checkDocumentConsistency,
} from "./document-ocr";
import { defaultDocumentVerificationStatus } from "./level1-certification";
import { defaultDecennaleStatus } from "./decennale-verification";
import type { ProDocument, ProRegistration, ProTradeSelection } from "./store-types";

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

export function buildLevel1AuditFromEnrichment(
  pro: ProRegistration,
  documents: ProDocument[],
  tradeSelections: ProTradeSelection[]
) {
  const globalIssues = [
    ...(documents.flatMap((d) => d.consistencyIssues ?? [])),
    ...(tradeSelections.flatMap((s) => s.decennaleConsistencyIssues ?? [])),
  ].filter((issue) => issue.severity === "error");

  return {
    rcsVerifiedAt: pro.level1Audit?.rcsVerifiedAt ?? new Date().toISOString(),
    geoVerified: pro.level1Audit?.geoVerified ?? false,
    geoDepartment: pro.level1Audit?.geoDepartment ?? pro.department,
    consistencyCheckedAt: new Date().toISOString(),
    globalIssues,
  };
}
