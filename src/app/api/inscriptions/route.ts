import { NextRequest, NextResponse } from "next/server";
import type { TradeCategory } from "@/lib/data";
import {
  PRO_REGISTRATION_DOCUMENTS,
  proDocumentFieldName,
  tradeDecennaleFieldName,
  validateProDocumentFile,
  validateProRegistrationDocuments,
} from "@/lib/pro-documents";
import { processLevel1Documents } from "@/lib/process-level1-documents";
import { hashPassword, validatePassword } from "@/lib/password";
import { primaryTradeCategory } from "@/lib/pro-trades";
import { resolveMultipleTradeSelections } from "@/lib/qualibat-job-groups";
import { defaultDecennaleStatus } from "@/lib/decennale-verification";
import { isAllowedDepartment, verifyWithRegistry } from "@/lib/rcs";
import type { ProTradeSelection } from "@/lib/store-types";
import { requestEmailVerification } from "@/lib/email-verification";
import {
  addProRegistration,
  applyReferralCodeToPro,
  ensureProReferralCode,
  setProRegistrationDocuments,
  setProTradeSelections,
  updateProRegistration,
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
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const categoryRaw = String(formData.get("category") ?? "").trim();
    const tradeSelectionsRaw = String(formData.get("tradeSelections") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
    const referralCode = String(formData.get("referralCode") ?? "").trim();

    const documentFiles: Record<string, File | null> = {};
    for (const doc of PRO_REGISTRATION_DOCUMENTS) {
      const entry = formData.get(proDocumentFieldName(doc.id));
      documentFiles[doc.id] =
        entry instanceof File && entry.size > 0 ? entry : null;
    }

    if (!siret || !email || !password || !companyName) {
      return NextResponse.json(
        { error: "SIRET RCS vérifié, email et mot de passe obligatoires." },
        { status: 400 }
      );
    }

    const registry = await verifyWithRegistry(siret);
    if (!registry.valid) {
      return NextResponse.json(
        { error: registry.error ?? "SIRET non vérifié au registre du commerce." },
        { status: 400 }
      );
    }

    if (!isAllowedDepartment(registry.department)) {
      return NextResponse.json(
        {
          error:
            "Établissement hors zone Artipascher : siège en 59 (Nord) ou 62 (Pas-de-Calais) requis.",
        },
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

    if (!documentFiles.rc) {
      return NextResponse.json(
        { error: "Assurance responsabilité civile professionnelle obligatoire." },
        { status: 400 }
      );
    }

    const primary = tradeSelections[0];
    const department: "59" | "62" = registry.department === "62" ? "62" : "59";
    const level1Audit = {
      rcsVerifiedAt: new Date().toISOString(),
      geoVerified: true,
      geoDepartment: department,
    };

    const entry = await addProRegistration({
      companyName: registry.companyName ?? companyName,
      siret: registry.siret,
      siren: registry.siren,
      email,
      phone,
      city: registry.city ?? "",
      department,
      category,
      tradeSelections,
      tradeGroupId: primary.tradeGroupId,
      tradeGroupLabel: primary.tradeGroupLabel,
      qualibatJobId: primary.qualibatJobId,
      qualibatJobLabel: primary.qualibatJobLabel,
      rcsVerified: true,
      level1Audit,
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
      decennaleStatus: defaultDecennaleStatus(),
      decennaleDocument: decennaleByGroup[selection.tradeGroupId],
    }));
    await setProTradeSelections(entry.id, enrichedSelections);

    const proForOcr = {
      siren: registry.siren,
      siret: registry.siret,
      companyName: registry.companyName ?? companyName,
      rcsVerified: true as const,
      department,
      level1Audit,
    };

    const processed = await processLevel1Documents(
      proForOcr,
      savedDocuments,
      enrichedSelections
    );

    if (!processed.certified) {
      await updateProRegistration(entry.id, {
        status: "rejected",
        documents: processed.documents,
        tradeSelections: processed.tradeSelections,
        level1Audit: processed.level1Audit,
        adminNote: processed.rejectionReasons.join(" · "),
        reviewedAt: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          error:
            processed.rejectionReasons[0] ??
            "Certification niveau 1 refusée : documents non conformes ou illisibles.",
          details: processed.rejectionReasons,
        },
        { status: 422 }
      );
    }

    await updateProRegistration(entry.id, {
      status: "approved",
      qualificationLevel: 1,
      level1CertifiedAt: new Date().toISOString(),
      documents: processed.documents,
      tradeSelections: processed.tradeSelections,
      level1Audit: processed.level1Audit,
      reviewedAt: new Date().toISOString(),
    });

    await ensureProReferralCode(entry.id);
    await requestEmailVerification(email, "pro");

    let referralApplied = false;
    let referralError: string | undefined;
    if (referralCode) {
      const referral = await applyReferralCodeToPro(entry.id, referralCode);
      if (referral.ok) {
        referralApplied = true;
      } else {
        referralError = referral.error;
      }
    }

    return NextResponse.json(
      {
        success: true,
        id: entry.id,
        level1Certified: true,
        referralApplied,
        referralError,
        message:
          "Certification niveau 1 obtenue. Vérifiez votre email pour activer la connexion à votre espace pro.",
      },
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
