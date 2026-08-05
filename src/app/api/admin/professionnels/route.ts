import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { QualificationLevel } from "@/lib/qualification-tiers";
import {
  demoteProToLevelZero,
  readStore,
  updateProRegistration,
} from "@/lib/store";

function isQualificationLevel(value: unknown): value is QualificationLevel {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

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
  const { id, status, adminNote, qualificationLevel } = body as {
    id?: string;
    status?: "approved" | "rejected";
    adminNote?: string;
    qualificationLevel?: QualificationLevel;
  };

  if (!id) {
    return NextResponse.json({ error: "id requis." }, { status: 400 });
  }

  if (!status && qualificationLevel === undefined) {
    return NextResponse.json(
      { error: "status ou qualificationLevel requis." },
      { status: 400 }
    );
  }

  if (
    qualificationLevel !== undefined &&
    !isQualificationLevel(qualificationLevel)
  ) {
    return NextResponse.json(
      { error: "qualificationLevel invalide (0, 1, 2 ou 3)." },
      { status: 400 }
    );
  }

  if (qualificationLevel === 0) {
    const updated = await demoteProToLevelZero(id, adminNote);
    if (!updated) {
      return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
    }
    return NextResponse.json({ registration: updated });
  }

  const store = await readStore();
  const existing = store.proRegistrations.find((p) => p.id === id);
  if (!existing) {
    return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
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
  // Remonter depuis niveau 0 (refusé) vers un niveau actif
  if (
    qualificationLevel !== undefined &&
    qualificationLevel >= 1 &&
    existing.status === "rejected" &&
    !status
  ) {
    patch.status = "approved";
    patch.level1CertifiedAt = new Date().toISOString();
    patch.adminNote =
      adminNote?.trim() ||
      `Réintégré au niveau ${qualificationLevel} depuis l'admin certification.`;
  }

  const updated = await updateProRegistration(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
  }

  return NextResponse.json({ registration: updated });
}
