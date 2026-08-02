import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
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
  const { id, status, adminNote } = body as {
    id?: string;
    status?: "approved" | "rejected";
    adminNote?: string;
  };

  if (!id || !status) {
    return NextResponse.json({ error: "id et status requis." }, { status: 400 });
  }

  const updated = await updateProRegistration(id, { status, adminNote });
  if (!updated) {
    return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
  }

  return NextResponse.json({ registration: updated });
}
