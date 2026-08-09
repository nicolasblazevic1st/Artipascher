import { NextRequest, NextResponse } from "next/server";
import { defaultDecennaleStatus } from "@/lib/decennale-verification";
import { defaultDocumentVerificationStatus } from "@/lib/level1-certification";
import { getProSession } from "@/lib/pro-auth";
import {
  PRO_REGISTRATION_DOCUMENTS,
  proDocumentFieldName,
  tradeDecennaleFieldName,
  validateProDocumentFile,
} from "@/lib/pro-documents";
import {
  enrichProDocumentsWithOcr,
  enrichTradeSelectionsWithOcr,
} from "@/lib/process-level1-documents";
import { getProTradeSelections } from "@/lib/pro-trades";
import {
  getProForSession,
  setProRegistrationDocuments,
  setProTradeSelections,
} from "@/lib/store";
import type { ProDocument } from "@/lib/store-types";
import {
  saveProRegistrationDocuments,
  saveTradeDecennaleDocuments,
} from "@/lib/uploads";

/**
 * Ajoute ou remplace des documents (KBIS, RC, RGE, Qualibat) et/ou
 * attestations décennale après inscription.
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

  if (docUploads.length > 0) {
    const saved = await saveProRegistrationDocuments(pro.id, docUploads);
    const enriched = await enrichProDocumentsWithOcr(pro, saved);
    const withPending = enriched.map((doc) => ({
      ...doc,
      verificationStatus: defaultDocumentVerificationStatus(),
    }));

    for (const doc of withPending) {
      const index = documents.findIndex((d) => d.id === doc.id);
      if (index >= 0) {
        documents[index] = doc;
      } else {
        documents.push(doc);
      }
    }

    await setProRegistrationDocuments(pro.id, documents);
  }

  if (decennaleUploads.length > 0) {
    const savedByGroup = await saveTradeDecennaleDocuments(pro.id, decennaleUploads);
    let nextSelections = tradeSelections.map((selection) => {
      const uploaded = savedByGroup[selection.tradeGroupId];
      if (!uploaded) return selection;
      return {
        ...selection,
        decennaleDocument: uploaded,
        decennaleStatus: defaultDecennaleStatus(),
        decennaleOcrHints: undefined,
        decennaleConsistencyIssues: undefined,
      };
    });

    nextSelections = await enrichTradeSelectionsWithOcr(pro, nextSelections);
    // Re-forcer le statut en attente après OCR (enrichissement peut le laisser inchangé).
    nextSelections = nextSelections.map((selection) => {
      if (!savedByGroup[selection.tradeGroupId]) return selection;
      return {
        ...selection,
        decennaleStatus: defaultDecennaleStatus(),
      };
    });

    await setProTradeSelections(pro.id, nextSelections);
  }

  const updated = await getProForSession(session);

  return NextResponse.json({
    success: true,
    documents: updated?.documents ?? documents,
    tradeSelections: updated ? getProTradeSelections(updated) : tradeSelections,
  });
}
