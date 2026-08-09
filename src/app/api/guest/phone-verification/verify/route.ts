import { NextRequest, NextResponse } from "next/server";
import { betaClosedJsonResponse, isBetaModeFromRequest } from "@/lib/beta";
import { confirmGuestPhoneVerification } from "@/lib/phone-verification";

export async function POST(request: NextRequest) {
  if (isBetaModeFromRequest(request)) return betaClosedJsonResponse();

  let phone = "";
  let code = "";
  try {
    const body = await request.json();
    phone = String(body.phone ?? "").trim();
    code = String(body.code ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const result = await confirmGuestPhoneVerification({
    phoneRaw: phone,
    code,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    phoneDisplay: result.phoneDisplay,
    phoneVerifiedE164: result.phoneVerifiedE164,
    phoneVerifiedAt: result.phoneVerifiedAt,
  });
}
