import { NextResponse } from "next/server";
import { CLIENT_SESSION_COOKIE } from "@/lib/client-auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(CLIENT_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
