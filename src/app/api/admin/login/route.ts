import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createSessionToken,
  getAdminPassword,
} from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  let password: string;

  try {
    const body = await request.json();
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (password !== getAdminPassword()) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
