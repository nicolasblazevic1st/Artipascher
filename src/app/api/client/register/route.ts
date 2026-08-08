import { NextRequest, NextResponse } from "next/server";
import { betaClosedJsonResponse, isBetaModeFromRequest } from "@/lib/beta";
import { validatePassword } from "@/lib/password";
import { requestEmailVerification } from "@/lib/email-verification";
import { ensureClientAccount } from "@/lib/store";

export async function POST(request: NextRequest) {
  if (isBetaModeFromRequest(request)) return betaClosedJsonResponse();

  let firstName: string;
  let lastName: string;
  let email: string;
  let password: string;
  let passwordConfirm: string;
  let phone: string | undefined;

  try {
    const body = await request.json();
    firstName = String(body.firstName ?? "").trim();
    lastName = String(body.lastName ?? "").trim();
    email = String(body.email ?? "").trim();
    password = String(body.password ?? "");
    passwordConfirm = String(body.passwordConfirm ?? "");
    const phoneRaw = String(body.phone ?? "").trim();
    phone = phoneRaw || undefined;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json(
      { error: "Prénom, nom, email et mot de passe sont obligatoires." },
      { status: 400 }
    );
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }
  if (password !== passwordConfirm) {
    return NextResponse.json(
      { error: "Les mots de passe ne correspondent pas." },
      { status: 400 }
    );
  }

  const result = await ensureClientAccount({
    email,
    password,
    firstName,
    lastName,
    phone,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (!result.created) {
    return NextResponse.json(
      {
        error:
          "Un compte existe déjà avec cet email. Connectez-vous à votre espace.",
      },
      { status: 400 }
    );
  }

  await requestEmailVerification(result.client.email, "client");

  return NextResponse.json(
    {
      success: true,
      emailVerificationSent: true,
      email: result.client.email,
    },
    { status: 201 }
  );
}
