import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isLevel1DocumentsValidated } from "@/lib/level1-certification";
import {
  demoteProToLevelZero,
  readStore,
  updateProDocumentVerificationStatus,
  updateProRegistration,
  updateProTradeDecennaleStatus,
} from "@/lib/store";
import type {
  DecennaleVerificationStatus,
  DocumentVerificationStatus,
} from "@/lib/store-types";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const store = await readStore();
  const registrations = store.proRegistrations
    .map((pro) => {
      const { passwordHash: _passwordHash, ...safe } = pro;
      const docs = pro.documents ?? [];
      const trades = pro.tradeSelections ?? [];
      return {
        ...safe,
        documentsCount: docs.length,
        pendingDocuments: docs.filter(
          (d) =>
            !d.verificationStatus ||
            d.verificationStatus === "en_attente_verification"
        ).length,
        rejectedDocuments: docs.filter((d) => d.verificationStatus === "rejeté")
          .length,
        pendingDecennales: trades.filter(
          (t) =>
            !t.decennaleStatus || t.decennaleStatus === "en_attente_verification"
        ).length,
        hasAnyDocument:
          docs.length > 0 || trades.some((t) => Boolean(t.decennaleDocument)),
      };
    })
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return NextResponse.json({
    registrations,
    stats: {
      total: registrations.length,
      withDocuments: registrations.filter((r) => r.hasAnyDocument).length,
      approved: registrations.filter((r) => r.status === "approved").length,
      rejected: registrations.filter((r) => r.status === "rejected").length,
      pendingReview: registrations.filter(
        (r) => r.pendingDocuments > 0 || r.pendingDecennales > 0
      ).length,
    },
  });
}

type PatchBody =
  | {
      action: "set_document_status";
      proId: string;
      documentId: string;
      verificationStatus: Extract<DocumentVerificationStatus, "validé" | "rejeté">;
    }
  | {
      action: "set_decennale_status";
      proId: string;
      tradeGroupId: string;
      decennaleStatus: DecennaleVerificationStatus;
    }
  | {
      action: "demote_level_zero";
      proId: string;
      adminNote?: string;
    }
  | {
      action: "restore_approved";
      proId: string;
      adminNote?: string;
    }
  | {
      action: "reject_application";
      proId: string;
      adminNote?: string;
    };

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!body?.action || !("proId" in body) || !body.proId) {
    return NextResponse.json({ error: "action et proId requis." }, { status: 400 });
  }

  if (body.action === "set_document_status") {
    if (!body.documentId || !body.verificationStatus) {
      return NextResponse.json(
        { error: "documentId et verificationStatus requis." },
        { status: 400 }
      );
    }
    if (body.verificationStatus !== "validé" && body.verificationStatus !== "rejeté") {
      return NextResponse.json({ error: "Statut document invalide." }, { status: 400 });
    }
    const updated = await updateProDocumentVerificationStatus(
      body.proId,
      body.documentId,
      body.verificationStatus
    );
    if (!updated) {
      return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    }
    const { passwordHash: _, ...safe } = updated;
    return NextResponse.json({ registration: safe });
  }

  if (body.action === "set_decennale_status") {
    if (!body.tradeGroupId || !body.decennaleStatus) {
      return NextResponse.json(
        { error: "tradeGroupId et decennaleStatus requis." },
        { status: 400 }
      );
    }
    const allowed: DecennaleVerificationStatus[] = [
      "en_attente_verification",
      "validé",
      "non_couvert",
    ];
    if (!allowed.includes(body.decennaleStatus)) {
      return NextResponse.json({ error: "Statut décennale invalide." }, { status: 400 });
    }
    const updated = await updateProTradeDecennaleStatus(
      body.proId,
      body.tradeGroupId,
      body.decennaleStatus
    );
    if (!updated) {
      return NextResponse.json({ error: "Métier / décennale introuvable." }, { status: 404 });
    }
    const { passwordHash: _, ...safe } = updated;
    return NextResponse.json({ registration: safe });
  }

  if (body.action === "demote_level_zero") {
    const updated = await demoteProToLevelZero(body.proId, body.adminNote);
    if (!updated) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    }
    const { passwordHash: _, ...safe } = updated;
    return NextResponse.json({ registration: safe });
  }

  if (body.action === "restore_approved") {
    const store = await readStore();
    const pro = store.proRegistrations.find((p) => p.id === body.proId);
    if (!pro) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    }
    if (!isLevel1DocumentsValidated(pro)) {
      return NextResponse.json(
        {
          error:
            "Validez d’abord tous les documents (RC + garanties) avant de certifier le compte.",
        },
        { status: 400 }
      );
    }
    if (pro.level1Audit?.bodacc?.status === "active_procedure") {
      return NextResponse.json(
        { error: "Impossible : procédure collective BODACC active." },
        { status: 400 }
      );
    }
    const updated = await updateProRegistration(body.proId, {
      status: "approved",
      qualificationLevel: 1,
      level1CertifiedAt: new Date().toISOString(),
      adminNote:
        body.adminNote?.trim() ||
        "Documents validés manuellement — compte certifié.",
      reviewedAt: new Date().toISOString(),
    });
    if (!updated) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    }
    const { passwordHash: _, ...safe } = updated;
    return NextResponse.json({ registration: safe });
  }

  if (body.action === "reject_application") {
    const updated = await demoteProToLevelZero(
      body.proId,
      body.adminNote?.trim() || "Dossier refusé après contrôle documents."
    );
    if (!updated) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    }
    const { passwordHash: _, ...safe } = updated;
    return NextResponse.json({ registration: safe });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
