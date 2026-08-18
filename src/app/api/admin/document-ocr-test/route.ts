import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  analyzeDocumentBuffer,
  checkDocumentConsistency,
} from "@/lib/document-ocr";
import {
  autoValidateDecennaleDocument,
  autoValidateRcDocument,
} from "@/lib/level1-auto-validation";
import type { ProDocument } from "@/lib/store-types";

/**
 * Bac à sable OCR : uploader un PDF, voir détection + suggestion auto
 * sans lier à un artisan ni modifier un dossier.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Fichier PDF requis." }, { status: 400 });
  }

  const name = file.name || "document.pdf";
  if (!name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { error: "Seuls les PDF texte (original assureur) sont analysés." },
      { status: 400 }
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)." }, { status: 400 });
  }

  const expectedSiren = String(formData.get("expectedSiren") ?? "")
    .replace(/\s/g, "")
    .trim();
  const expectedSiret = String(formData.get("expectedSiret") ?? "")
    .replace(/\s/g, "")
    .trim();
  const expectedCompany = String(formData.get("expectedCompany") ?? "").trim();
  const docKind = String(formData.get("docKind") ?? "rc").trim(); // rc | decennale

  const buffer = Buffer.from(await file.arrayBuffer());
  const { hints, textLength } = await analyzeDocumentBuffer(buffer, name);

  const consistencyIssues =
    expectedSiren.length === 9
      ? checkDocumentConsistency(
          hints,
          {
            siren: expectedSiren,
            siret: expectedSiret || `${expectedSiren}00000`,
            companyName: expectedCompany || "Entreprise test",
          },
          docKind === "decennale" ? "Garantie / décennale" : "RC pro"
        )
      : [];

  let suggestion: { status: string; reason?: string } | null = null;
  if (expectedSiren.length === 9) {
    if (docKind === "decennale") {
      suggestion = autoValidateDecennaleDocument(
        hints,
        consistencyIssues,
        expectedSiren,
        "métier test"
      );
    } else {
      const fakeDoc: ProDocument = {
        id: "rc",
        label: "RC pro",
        fileUrl: "",
        fileName: name,
        uploadedAt: new Date().toISOString(),
        ocrHints: hints,
        consistencyIssues,
      };
      suggestion = autoValidateRcDocument(fakeDoc, expectedSiren);
    }
  }

  return NextResponse.json({
    fileName: name,
    fileSize: file.size,
    textLength,
    readable: textLength > 20,
    hints,
    consistencyIssues,
    suggestion,
    note:
      "Résultat indicatif OCR uniquement — ne valide ni ne refuse un dossier artisan.",
  });
}
