import { NextRequest, NextResponse } from "next/server";
import { applyAdminListingUpdate } from "@/lib/admin-listing-update";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getWorkRequestById } from "@/lib/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await context.params;
  const request = await getWorkRequestById(id);
  if (!request) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }
  return NextResponse.json({ request });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getWorkRequestById(id);
  if (!existing) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const result = await applyAdminListingUpdate(existing, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ request: result.request });
}
