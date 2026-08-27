import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createSessionToken,
  getAdminPassword,
} from "@/lib/admin-auth";
import { rememberAdminAccessIp } from "@/lib/admin-known-ips";
import {
  adminLoginRateLimitMessage,
  appendAdminLoginLog,
  isAdminLoginRateLimited,
} from "@/lib/admin-login-log";
import { getClientIp, getClientUserAgent } from "@/lib/request-client";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = getClientUserAgent(request);

  if (await isAdminLoginRateLimited(ip)) {
    await appendAdminLoginLog({
      ip,
      userAgent,
      success: false,
      reason: "rate_limited",
    });
    return NextResponse.json(
      { error: adminLoginRateLimitMessage() },
      { status: 429 }
    );
  }

  let password: string;

  try {
    const body = await request.json();
    password = body.password ?? "";
  } catch {
    await appendAdminLoginLog({
      ip,
      userAgent,
      success: false,
      reason: "invalid_request",
    });
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (password !== getAdminPassword()) {
    await appendAdminLoginLog({
      ip,
      userAgent,
      success: false,
      reason: "invalid_password",
    });
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }

  await appendAdminLoginLog({
    ip,
    userAgent,
    success: true,
    reason: "ok",
  });
  await rememberAdminAccessIp(ip);

  const response = NextResponse.json({ success: true });
  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set(ADMIN_SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
    secure: isProd,
  });
  return response;
}
