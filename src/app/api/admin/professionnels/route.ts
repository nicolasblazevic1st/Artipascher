import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { QualificationLevel } from "@/lib/qualification-tiers";
import { readStore, updateProRegistration } from "@/lib/store";

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

  const patch: Parameters<typeof updateProRegistration>[1] = {};
  if (status) patch.status = status;
  if (adminNote !== undefined) patch.adminNote = adminNote;
  if (qualificationLevel !== undefined) patch.qualificationLevel = qualificationLevel;
  if (status === "approved" && qualificationLevel === undefined) {
    patch.qualificationLevel = 1;
  }

  const updated = await updateProRegistration(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
  }

  return NextResponse.json({ registration: updated });
}
