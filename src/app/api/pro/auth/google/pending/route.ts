import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_PRO_PENDING_COOKIE,
  decodeGoogleProPending,
} from "@/lib/google-oauth";

export async function GET(request: NextRequest) {
  const pending = decodeGoogleProPending(
    request.cookies.get(GOOGLE_PRO_PENDING_COOKIE)?.value
  );
  if (!pending) {
    return NextResponse.json({ linked: false });
  }
  return NextResponse.json({
    linked: true,
    email: pending.email,
  });
}
