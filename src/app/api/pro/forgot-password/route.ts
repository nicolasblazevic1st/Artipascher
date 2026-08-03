import { NextRequest, NextResponse } from "next/server";
import {
  PASSWORD_RESET_SUCCESS_MESSAGE,
  requestPasswordReset,
} from "@/lib/password-reset";

export async function POST(request: NextRequest) {
  let email: string;

  try {
    const body = await request.json();
    email = (body.email ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "Email requis." }, { status: 400 });
  }

  await requestPasswordReset(email, "pro");

  return NextResponse.json({ success: true, message: PASSWORD_RESET_SUCCESS_MESSAGE });
}
