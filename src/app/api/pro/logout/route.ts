import { NextResponse } from "next/server";
import { PRO_SESSION_COOKIE } from "@/lib/pro-auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(PRO_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
