import { NextRequest, NextResponse } from "next/server";
import {
  CLIENT_SESSION_COOKIE,
  encodeClientSession,
} from "@/lib/client-auth";
import { authenticateClient, linkOrphanWorkRequests } from "@/lib/store";

export async function POST(request: NextRequest) {
  let email: string;
  let password: string;

  try {
    const body = await request.json();
    email = (body.email ?? "").trim();
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email et mot de passe requis." },
      { status: 400 }
    );
  }

  const client = await authenticateClient(email, password);
  if (!client) {
    return NextResponse.json(
      { error: "Email ou mot de passe incorrect." },
      { status: 401 }
    );
  }

  await linkOrphanWorkRequests(client.id, client.email);

  const session = encodeClientSession({
    clientId: client.id,
    email: client.email,
    firstName: client.firstName,
    lastName: client.lastName,
  });

  const response = NextResponse.json({
    success: true,
    firstName: client.firstName,
    lastName: client.lastName,
  });
  response.cookies.set(CLIENT_SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
