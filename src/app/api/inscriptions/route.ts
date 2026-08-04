import { NextRequest, NextResponse } from "next/server";
import type { TradeCategory } from "@/lib/data";
import {
  PRO_REGISTRATION_DOCUMENTS,
  proDocumentFieldName,
  tradeDecennaleFieldName,
  validateProDocumentFile,
  validateProRegistrationDocuments,
} from "@/lib/pro-documents";
import { hashPassword, validatePassword } from "@/lib/password";
import { primaryTradeCategory } from "@/lib/pro-trades";
import { resolveMultipleTradeSelections } from "@/lib/qualibat-job-groups";
import type { ProTradeSelection } from "@/lib/store-types";
import {
  addProRegistration,
  setProRegistrationDocuments,
  setProTradeSelections,
} from "@/lib/store";
import { saveProRegistrationDocuments, saveTradeDecennaleDocuments } from "@/lib/uploads";

const VALID_CATEGORIES = new Set<TradeCategory>([
  "maconnerie",
  "menuiserie",
  "plaquiste",
  "carrelage",
  "electricite",
  "peinture",
  "plomberie",
  "chauffage",
  "couverture",
  "charpente",
]);

function parseTradeSelections(raw: string): ProTradeSelection[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const entries = parsed.map((item) => ({
      tradeGroupId: String((item as ProTradeSelection).tradeGroupId ?? ""),
      qualibatJobId: Number((item as ProTradeSelection).qualibatJobId),
    }));
    return resolveMultipleTradeSelections(entries);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const companyName = String(formData.get("companyName") ?? "").trim();
    const siret = String(formData.get("siret") ?? "").trim();
    const siren = String(formData.get("siren") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const department = String(formData.get("department") ?? "59");
    const categoryRaw = String(formData.get("category") ?? "").trim();
    const tradeSelectionsRaw = String(formData.get("tradeSelections") ?? "").trim();
    const rcsVerified = String(formData.get("rcsVerified") ?? "") === "true";
    const password = String(formData.get("password") ?? "");
    const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

    const documentFiles: Record<string, File | null> = {};
    for (const doc of PRO_REGISTRATION_DOCUMENTS) {
      const entry = formData.get(proDocumentFieldName(doc.id));
      documentFiles[doc.id] =
        entry instanceof File && entry.size > 0 ? entry : null;
    }

    if (!rcsVerified || !siret || !email || !password || !companyName) {
      return NextResponse.json(
        { error: "SIRET RCS vérifié, email et mot de passe obligatoires." },
        { status: 400 }
      );
    }

    if (password !== passwordConfirm) {
      return NextResponse.json(
        { error: "Les mots de passe ne correspondent pas." },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const tradeSelections = parseTradeSelections(tradeSelectionsRaw);
    if (!tradeSelections) {
      return NextResponse.json(
        { error: "Sélectionnez au moins un corps de métier avec un métier Qualibat valide." },
        { status: 400 }
      );
    }

    for (const selection of tradeSelections) {
      const entry = formData.get(tradeDecennaleFieldName(selection.tradeGroupId));
      const file = entry instanceof File && entry.size > 0 ? entry : null;
      const error = validateProDocumentFile(file!);
      if (error) {
        return NextResponse.json(
          {
            error: `${selection.tradeGroupLabel} : ${
              error === "Fichier manquant."
                ? "attestation décennale couvrant ce métier obligatoire."
                : error
            }`,
          },
          { status: 400 }
        );
      }
    }

    const category = VALID_CATEGORIES.has(categoryRaw as TradeCategory)
      ? (categoryRaw as TradeCategory)
      : primaryTradeCategory(tradeSelections);

    const documentsError = validateProRegistrationDocuments(documentFiles);
    if (documentsError) {
      return NextResponse.json({ error: documentsError }, { status: 400 });
    }

    const primary = tradeSelections[0];

    const entry = await addProRegistration({
      companyName,
      siret,
      siren: siren || siret.slice(0, 9),
      email,
      phone,
      city,
      department: department === "62" ? "62" : "59",
      category,
      tradeSelections,
      tradeGroupId: primary.tradeGroupId,
      tradeGroupLabel: primary.tradeGroupLabel,
      qualibatJobId: primary.qualibatJobId,
      qualibatJobLabel: primary.qualibatJobLabel,
      rcsVerified: true,
      passwordHash: hashPassword(password),
      documents: [],
    });

    const filesToSave = PRO_REGISTRATION_DOCUMENTS.filter(
      (doc) => documentFiles[doc.id]
    ).map((doc) => ({
      id: doc.id,
      label: doc.label,
      file: documentFiles[doc.id]!,
    }));

    const savedDocuments = await saveProRegistrationDocuments(entry.id, filesToSave);
    await setProRegistrationDocuments(entry.id, savedDocuments);

    const decennaleFiles = tradeSelections.map((selection) => {
      const file = formData.get(tradeDecennaleFieldName(selection.tradeGroupId)) as File;
      return {
        tradeGroupId: selection.tradeGroupId,
        tradeGroupLabel: selection.tradeGroupLabel,
        file,
      };
    });

    const decennaleByGroup = await saveTradeDecennaleDocuments(entry.id, decennaleFiles);
    const enrichedSelections = tradeSelections.map((selection) => ({
      ...selection,
      decennaleDocument: decennaleByGroup[selection.tradeGroupId],
    }));
    await setProTradeSelections(entry.id, enrichedSelections);

    return NextResponse.json(
      { success: true, id: entry.id, documentCount: savedDocuments.length },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_USED") {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
