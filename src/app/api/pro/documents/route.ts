import { NextRequest, NextResponse } from "next/server";
import { getProSession } from "@/lib/pro-auth";
import {
  PRO_REGISTRATION_DOCUMENTS,
  proDocumentFieldName,
  tradeDecennaleFieldName,
  validateProDocumentFile,
} from "@/lib/pro-documents";
import { processLevel1Documents } from "@/lib/process-level1-documents";
import { getProTradeSelections } from "@/lib/pro-trades";
import {
  getProForSession,
  setProRegistrationDocuments,
  setProTradeSelections,
  updateProRegistration,
} from "@/lib/store";
import type { ProDocument } from "@/lib/store-types";
import {
  saveProRegistrationDocuments,
  saveTradeDecennaleDocuments,
} from "@/lib/uploads";

/**
 * Ajoute ou remplace des documents (RC, RGE, Qualibat) et/ou
 * attestations décennale après inscription, puis rejoue la vérif niveau 1
 * (PDF + BODACC).
 */
export async function POST(request: NextRequest) {
  const session = await getProSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const pro = await getProForSession(session);
  if (!pro) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }

  const formData = await request.formData();

  const docUploads: Array<{ id: string; label: string; file: File }> = [];
  for (const docType of PRO_REGISTRATION_DOCUMENTS) {
    const entry = formData.get(proDocumentFieldName(docType.id));
    if (!(entry instanceof File) || entry.size === 0) continue;
    const error = validateProDocumentFile(entry, {
      requireOriginalPdf: docType.requireOriginalPdf,
    });
    if (error) {
      return NextResponse.json(
        { error: `${docType.label} : ${error}` },
        { status: 400 }
      );
    }
    docUploads.push({ id: docType.id, label: docType.label, file: entry });
  }

  const tradeSelections = getProTradeSelections(pro);
  const decennaleUploads: Array<{
    tradeGroupId: string;
    tradeGroupLabel: string;
    file: File;
  }> = [];

  for (const selection of tradeSelections) {
    const entry = formData.get(tradeDecennaleFieldName(selection.tradeGroupId));
    if (!(entry instanceof File) || entry.size === 0) continue;
    const error = validateProDocumentFile(entry, { requireOriginalPdf: true });
    if (error) {
      return NextResponse.json(
        {
          error: `Décennale « ${selection.tradeGroupLabel} » : ${error}`,
        },
        { status: 400 }
      );
    }
    decennaleUploads.push({
      tradeGroupId: selection.tradeGroupId,
      tradeGroupLabel: selection.tradeGroupLabel,
      file: entry,
    });
  }

  if (docUploads.length === 0 && decennaleUploads.length === 0) {
    return NextResponse.json(
      { error: "Ajoutez au moins un document à téléverser." },
      { status: 400 }
    );
  }

  let documents: ProDocument[] = [...(pro.documents ?? [])];
  let nextSelections = tradeSelections;

  if (docUploads.length > 0) {
    const saved = await saveProRegistrationDocuments(pro.id, docUploads);
    for (const doc of saved) {
      const index = documents.findIndex((d) => d.id === doc.id);
      if (index >= 0) {
        documents[index] = doc;
      } else {
        documents.push(doc);
      }
    }
  }

  if (decennaleUploads.length > 0) {
    const savedByGroup = await saveTradeDecennaleDocuments(pro.id, decennaleUploads);
    nextSelections = tradeSelections.map((selection) => {
      const uploaded = savedByGroup[selection.tradeGroupId];
      if (!uploaded) return selection;
      return {
        ...selection,
        decennaleDocument: uploaded,
        decennaleStatus: undefined,
        decennaleOcrHints: undefined,
        decennaleConsistencyIssues: undefined,
      };
    });
  }

  const processed = await processLevel1Documents(pro, documents, nextSelections);

  await setProRegistrationDocuments(pro.id, processed.documents);
  await setProTradeSelections(pro.id, processed.tradeSelections);

  const patch: Parameters<typeof updateProRegistration>[1] = {
    documents: processed.documents,
    tradeSelections: processed.tradeSelections,
    level1Audit: processed.level1Audit,
  };

  if (processed.blocked) {
    patch.status = "rejected";
    patch.level1CertifiedAt = undefined;
    patch.adminNote = processed.rejectionReasons.join(" · ");
    patch.reviewedAt = new Date().toISOString();
  } else if (pro.status === "approved" && pro.level1CertifiedAt) {
    // Nouveau document = re-revue : retire la certification jusqu’à validation admin.
    patch.status = "pending";
    patch.level1CertifiedAt = undefined;
    patch.adminNote =
      "Nouveaux documents reçus — certification suspendue en attendant validation admin.";
  } else if (pro.status === "rejected" && !processed.blocked) {
    patch.status = "pending";
    patch.adminNote = "Documents mis à jour — en attente de validation admin.";
  }

  await updateProRegistration(pro.id, patch);

  const updated = await getProForSession(session);

  return NextResponse.json({
    success: true,
    certified: false,
    pendingReview: true,
    blocked: processed.blocked,
    rejectionReasons: processed.rejectionReasons,
    documents: updated?.documents ?? processed.documents,
    tradeSelections: updated ? getProTradeSelections(updated) : processed.tradeSelections,
  });
}
