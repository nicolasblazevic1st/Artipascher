import { NextRequest, NextResponse } from "next/server";
import type { TradeCategory } from "@/lib/data";
import {
  PRO_REGISTRATION_DOCUMENTS,
  proDocumentFieldName,
  validateProRegistrationDocuments,
} from "@/lib/pro-documents";
import { hashPassword, validatePassword } from "@/lib/password";
import { addProRegistration, setProRegistrationDocuments } from "@/lib/store";
import { saveProRegistrationDocuments } from "@/lib/uploads";

const CATEGORY_MAP: Record<string, TradeCategory> = {
  Peinture: "peinture",
  Plomberie: "plomberie",
  Électricité: "electricite",
  Maçonnerie: "maconnerie",
  Menuiserie: "menuiserie",
  Carrelage: "carrelage",
};

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
    const category = String(formData.get("category") ?? "").trim();
    const zone = String(formData.get("zone") ?? "").trim();
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

    const documentsError = validateProRegistrationDocuments(documentFiles);
    if (documentsError) {
      return NextResponse.json({ error: documentsError }, { status: 400 });
    }

    const entry = await addProRegistration({
      companyName,
      siret,
      siren: siren || siret.slice(0, 9),
      email,
      phone,
      city,
      department: department === "62" ? "62" : "59",
      category: CATEGORY_MAP[category] ?? "peinture",
      zone,
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
