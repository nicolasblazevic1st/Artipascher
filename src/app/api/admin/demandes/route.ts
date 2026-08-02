import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readStore, updateWorkRequest } from "@/lib/store";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const store = await readStore();
  return NextResponse.json({ requests: store.workRequests });
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await request.json();
  const { id, status } = body as {
    id?: string;
    status?: "approved" | "rejected";
  };

  if (!id || !status) {
    return NextResponse.json({ error: "id et status requis." }, { status: 400 });
  }

  const auctionId = status === "approved" ? `auction-${id}` : undefined;
  const updated = await updateWorkRequest(id, { status, auctionId });
  if (!updated) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  return NextResponse.json({ request: updated });
}
