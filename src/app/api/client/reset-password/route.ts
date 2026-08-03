import { NextRequest, NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/store";

export async function POST(request: NextRequest) {
  let token: string;
  let password: string;

  try {
    const body = await request.json();
    token = (body.token ?? "").trim();
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!token || !password) {
    return NextResponse.json(
      { error: "Token et nouveau mot de passe requis." },
      { status: 400 }
    );
  }

  const result = await resetPasswordWithToken(token, password);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
