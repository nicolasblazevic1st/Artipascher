import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { QualificationLevel } from "@/lib/qualification-tiers";
import type { DecennaleVerificationStatus } from "@/lib/store-types";
import { readStore, updateProRegistration, updateProTradeDecennaleStatus } from "@/lib/store";

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
  const { id, status, adminNote, qualificationLevel, tradeGroupId, decennaleStatus } =
    body as {
      id?: string;
      status?: "approved" | "rejected";
      adminNote?: string;
      qualificationLevel?: QualificationLevel;
      tradeGroupId?: string;
      decennaleStatus?: Extract<DecennaleVerificationStatus, "validé" | "non_couvert">;
    };

  if (!id) {
    return NextResponse.json({ error: "id requis." }, { status: 400 });
  }

  if (tradeGroupId && decennaleStatus) {
    const updated = await updateProTradeDecennaleStatus(id, tradeGroupId, decennaleStatus);
    if (!updated) {
      return NextResponse.json({ error: "Inscription ou métier introuvable." }, { status: 404 });
    }
    return NextResponse.json({ registration: updated });
  }

  if (!status && qualificationLevel === undefined) {
    return NextResponse.json(
      { error: "status, qualificationLevel ou decennaleStatus requis." },
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
