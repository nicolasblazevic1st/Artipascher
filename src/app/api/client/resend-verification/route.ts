import { NextRequest, NextResponse } from "next/server";
import {
  EMAIL_VERIFICATION_SUCCESS_MESSAGE,
  requestEmailVerification,
} from "@/lib/email-verification";

export async function POST(request: NextRequest) {
  let email: string;
  try {
    const body = await request.json();
    email = String(body.email ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "Email requis." }, { status: 400 });
  }

  await requestEmailVerification(email, "client");
  return NextResponse.json({ success: true, message: EMAIL_VERIFICATION_SUCCESS_MESSAGE });
}
