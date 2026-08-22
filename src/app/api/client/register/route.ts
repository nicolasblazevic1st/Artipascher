import { NextRequest, NextResponse } from "next/server";
import { betaClosedJsonResponse, isBetaModeFromRequest } from "@/lib/beta";
import { validatePassword } from "@/lib/password";
import { requestEmailVerification } from "@/lib/email-verification";
import { normalizeFrenchMobile } from "@/lib/phone-format";
import {
  consumeGuestPhoneVerification,
  ensureClientAccount,
  isGuestPhoneVerified,
  linkOrphanWorkRequests,
  markClientPhoneVerified,
} from "@/lib/store";

export async function POST(request: NextRequest) {
  if (isBetaModeFromRequest(request)) return betaClosedJsonResponse();

  let firstName: string;
  let lastName: string;
  let email: string;
  let password: string;
  let passwordConfirm: string;
  let phoneRaw: string;

  try {
    const body = await request.json();
    firstName = String(body.firstName ?? "").trim();
    lastName = String(body.lastName ?? "").trim();
    email = String(body.email ?? "").trim();
    password = String(body.password ?? "");
    passwordConfirm = String(body.passwordConfirm ?? "");
    phoneRaw = String(body.phone ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!firstName || !lastName || !email || !password || !phoneRaw) {
    return NextResponse.json(
      {
        error:
          "Prénom, nom, email, mobile et mot de passe sont obligatoires.",
      },
      { status: 400 }
    );
  }

  const phoneE164 = normalizeFrenchMobile(phoneRaw);
  if (!phoneE164) {
    return NextResponse.json(
      {
        error:
          "Indiquez un mobile français valide (06 ou 07), ex. 06 12 34 56 78.",
      },
      { status: 400 }
    );
  }

  if (!(await isGuestPhoneVerified(phoneE164))) {
    return NextResponse.json(
      {
        error:
          "Vérifiez votre mobile par SMS avant de créer le compte (bouton « Recevoir un code »).",
      },
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
    phone: phoneE164,
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

  await markClientPhoneVerified(result.client.id, phoneE164);
  await consumeGuestPhoneVerification(phoneE164);
  await linkOrphanWorkRequests(
    result.client.id,
    result.client.email,
    phoneE164
  );
  await requestEmailVerification(result.client.email, "client");

  return NextResponse.json(
    {
      success: true,
      emailVerificationSent: true,
      phoneVerified: true,
      email: result.client.email,
    },
    { status: 201 }
  );
}
