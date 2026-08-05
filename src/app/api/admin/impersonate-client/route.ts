import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  CLIENT_SESSION_COOKIE,
  encodeClientSession,
} from "@/lib/client-auth";
import { getClientById } from "@/lib/store";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let clientId: string;
  try {
    const body = await request.json();
    clientId = String(body.clientId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!clientId) {
    return NextResponse.json({ error: "clientId requis." }, { status: 400 });
  }

  const client = await getClientById(clientId);
  if (!client) {
    return NextResponse.json({ error: "Compte client introuvable." }, { status: 404 });
  }

  const session = encodeClientSession({
    clientId: client.id,
    email: client.email,
    firstName: client.firstName,
    lastName: client.lastName,
    impersonatedByAdmin: true,
  });

  const response = NextResponse.json({
    success: true,
    redirectTo: "/particulier/espace",
    firstName: client.firstName,
    lastName: client.lastName,
  });

  response.cookies.set(CLIENT_SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
