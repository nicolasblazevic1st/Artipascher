import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleAuthorizationUrl,
  createOAuthState,
  encodeOAuthStateCookie,
  isGoogleOAuthConfigured,
  oauthCookieOptions,
  publicOriginFromRequest,
  sanitizeOAuthFrom,
  type GoogleOAuthRole,
} from "@/lib/google-oauth";

function loginPath(role: GoogleOAuthRole): string {
  return role === "client" ? "/particulier/espace/login" : "/pro/login";
}

export async function GET(request: NextRequest) {
  const roleParam = request.nextUrl.searchParams.get("role");
  const role: GoogleOAuthRole = roleParam === "pro" ? "pro" : "client";
  if (roleParam !== "client" && roleParam !== "pro") {
    return NextResponse.redirect(
      new URL(`${loginPath("client")}?google=invalid`, request.url)
    );
  }

  const from = sanitizeOAuthFrom(
    role,
    request.nextUrl.searchParams.get("from")
  );

  if (!isGoogleOAuthConfigured()) {
    const dest = new URL(loginPath(role), request.url);
    dest.searchParams.set("google", "unavailable");
    dest.searchParams.set("from", from);
    return NextResponse.redirect(dest);
  }

  const origin = publicOriginFromRequest(request);
  const state = createOAuthState(role, from);
  const url = buildGoogleAuthorizationUrl(origin, state);
  const response = NextResponse.redirect(url);
  response.cookies.set(
    GOOGLE_OAUTH_STATE_COOKIE,
    encodeOAuthStateCookie(state),
    oauthCookieOptions(10 * 60)
  );
  return response;
}
