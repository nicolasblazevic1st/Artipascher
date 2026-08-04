import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { canApproveLevel1 } from "@/lib/level1-certification";
import type { QualificationLevel } from "@/lib/qualification-tiers";
import type { DecennaleVerificationStatus, DocumentVerificationStatus } from "@/lib/store-types";
import {
  readStore,
  updateProDocumentVerificationStatus,
  updateProRegistration,
  updateProTradeDecennaleStatus,
} from "@/lib/store";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const store = await readStore();
  return NextResponse.json({ registrations: store.proRegistrations });
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await request.json();
  const {
    id,
    status,
    adminNote,
    qualificationLevel,
    tradeGroupId,
    decennaleStatus,
    documentId,
    documentStatus,
    certifyLevel1,
  } = body as {
    id?: string;
    status?: "approved" | "rejected";
    adminNote?: string;
    qualificationLevel?: QualificationLevel;
    tradeGroupId?: string;
    decennaleStatus?: Extract<DecennaleVerificationStatus, "validé" | "non_couvert">;
    documentId?: string;
    documentStatus?: Extract<DocumentVerificationStatus, "validé" | "rejeté">;
    certifyLevel1?: boolean;
  };

  if (!id) {
    return NextResponse.json({ error: "id requis." }, { status: 400 });
  }

  if (documentId && documentStatus) {
    const updated = await updateProDocumentVerificationStatus(id, documentId, documentStatus);
    if (!updated) {
      return NextResponse.json({ error: "Inscription ou document introuvable." }, { status: 404 });
    }
    return NextResponse.json({ registration: updated });
  }

  if (tradeGroupId && decennaleStatus) {
    const updated = await updateProTradeDecennaleStatus(id, tradeGroupId, decennaleStatus);
    if (!updated) {
      return NextResponse.json({ error: "Inscription ou métier introuvable." }, { status: 404 });
    }
    return NextResponse.json({ registration: updated });
  }

  if (certifyLevel1) {
    const store = await readStore();
    const pro = store.proRegistrations.find((p) => p.id === id);
    if (!pro) {
      return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
    }

    const check = canApproveLevel1(pro);
    if (!check.ok) {
      return NextResponse.json({ error: check.reason }, { status: 400 });
    }

    const updated = await updateProRegistration(id, {
      status: "approved",
      qualificationLevel: 1,
      level1CertifiedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
    });
    return NextResponse.json({ registration: updated });
  }

  if (!status && qualificationLevel === undefined) {
    return NextResponse.json(
      { error: "status, qualificationLevel, documentStatus ou certifyLevel1 requis." },
      { status: 400 }
    );
  }

  const patch: Parameters<typeof updateProRegistration>[1] = {};
  if (status) patch.status = status;
  if (adminNote !== undefined) patch.adminNote = adminNote;
  if (qualificationLevel !== undefined) patch.qualificationLevel = qualificationLevel;
  if (status === "approved" && qualificationLevel === undefined) {
    patch.qualificationLevel = 1;
  }
  if (status === "approved") {
    patch.level1CertifiedAt = new Date().toISOString();
  }

  const updated = await updateProRegistration(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
  }

  return NextResponse.json({ registration: updated });
}
