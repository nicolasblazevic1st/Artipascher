import { NextRequest, NextResponse } from "next/server";
import { betaClosedJsonResponse, isBetaModeFromRequest } from "@/lib/beta";
import { getClientSession } from "@/lib/client-auth";
import { confirmClientPhoneVerification } from "@/lib/phone-verification";

export async function POST(request: NextRequest) {
  if (isBetaModeFromRequest(request)) return betaClosedJsonResponse();

  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  let phone = "";
  let code = "";
  try {
    const body = await request.json();
    phone = String(body.phone ?? "").trim();
    code = String(body.code ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const result = await confirmClientPhoneVerification({
    clientId: session.clientId,
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
