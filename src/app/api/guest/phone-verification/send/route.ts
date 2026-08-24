import { NextRequest, NextResponse } from "next/server";
import { betaClosedJsonResponse, isBetaModeFromRequest } from "@/lib/beta";
import { sendGuestPhoneVerificationSms } from "@/lib/phone-verification";

export async function POST(request: NextRequest) {
  if (isBetaModeFromRequest(request)) return betaClosedJsonResponse();

  let phone = "";
  try {
    const body = await request.json();
    phone = String(body.phone ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const result = await sendGuestPhoneVerificationSms({ phoneRaw: phone });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        cooldownSeconds: result.cooldownSeconds,
        smsUnavailable: result.status === 502 || result.status === 503,
      },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    phoneDisplay: result.phoneDisplay,
    demo: result.demo,
    cooldownSeconds: result.cooldownSeconds,
    message: result.demo
      ? "Mode démo : le code a été écrit dans les logs serveur."
      : "Code envoyé par SMS.",
  });
}
