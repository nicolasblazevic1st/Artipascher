import { NextRequest, NextResponse } from "next/server";
import { verifyEmailWithToken } from "@/lib/store";

export async function POST(request: NextRequest) {
  let token: string;
  try {
    const body = await request.json();
    token = String(body.token ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "Lien de vérification manquant." }, { status: 400 });
  }

  const result = await verifyEmailWithToken(token);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  if (result.userType !== "client") {
    return NextResponse.json(
      { error: "Ce lien ne correspond pas à un compte particulier." },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
