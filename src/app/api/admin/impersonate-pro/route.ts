import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { PRO_SESSION_COOKIE, encodeProSession } from "@/lib/pro-auth";
import { getProRegistrationById } from "@/lib/store";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let proId: string;
  try {
    const body = await request.json();
    proId = String(body.proId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!proId) {
    return NextResponse.json({ error: "proId requis." }, { status: 400 });
  }

  const pro = await getProRegistrationById(proId);
  if (!pro) {
    return NextResponse.json({ error: "Compte artisan introuvable." }, { status: 404 });
  }

  const session = encodeProSession({
    proId: pro.id,
    companyName: pro.companyName,
    email: pro.email,
    siret: pro.siret,
    impersonatedByAdmin: true,
  });

  const response = NextResponse.json({
    success: true,
    redirectTo: "/pro",
    companyName: pro.companyName,
    status: pro.status,
  });

  response.cookies.set(PRO_SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
