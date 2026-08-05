import { NextRequest, NextResponse } from "next/server";
import {
  PRO_SESSION_COOKIE,
  encodeProSession,
} from "@/lib/pro-auth";
import { authenticatePro, isEmailVerified } from "@/lib/store";

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

  const pro = await authenticatePro(email, password);
  if (!pro) {
    return NextResponse.json(
      {
        error:
          "Email ou mot de passe incorrect, ou compte non encore approuvé par l'administrateur.",
      },
      { status: 401 }
    );
  }

  if (!isEmailVerified(pro)) {
    return NextResponse.json(
      {
        error:
          "Confirmez votre adresse email avant de vous connecter. Consultez votre boîte de réception.",
        code: "EMAIL_NOT_VERIFIED",
        email: pro.email,
      },
      { status: 403 }
    );
  }

  const session = encodeProSession({
    proId: pro.id,
    companyName: pro.companyName,
    email: pro.email,
    siret: pro.siret,
  });

  const response = NextResponse.json({
    success: true,
    companyName: pro.companyName,
  });
  response.cookies.set(PRO_SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
