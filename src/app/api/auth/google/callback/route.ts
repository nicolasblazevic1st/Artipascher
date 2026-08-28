import { NextRequest, NextResponse } from "next/server";
import { isBetaModeFromRequest } from "@/lib/beta";
import {
  CLIENT_SESSION_COOKIE,
  encodeClientSession,
} from "@/lib/client-auth";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_PRO_PENDING_COOKIE,
  decodeOAuthStateCookie,
  encodeGoogleProPending,
  exchangeGoogleCode,
  oauthCookieOptions,
  publicOriginFromRequest,
  type GoogleOAuthRole,
} from "@/lib/google-oauth";
import {
  PRO_SESSION_COOKIE,
  encodeProSession,
} from "@/lib/pro-auth";
import {
  getClientByEmail,
  getClientByGoogleSub,
  linkGoogleToEligiblePro,
  linkOrphanWorkRequests,
  upsertClientFromGoogle,
} from "@/lib/store";

function loginUrl(
  request: NextRequest,
  role: GoogleOAuthRole,
  google: string,
  from?: string
): URL {
  const path = role === "client" ? "/particulier/espace/login" : "/pro/login";
  const dest = new URL(path, request.url);
  dest.searchParams.set("google", google);
  if (from) dest.searchParams.set("from", from);
  return dest;
}

function clearOAuthCookie(response: NextResponse) {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    ...oauthCookieOptions(0),
    maxAge: 0,
  });
}

export async function GET(request: NextRequest) {
  const googleError = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const nonce = request.nextUrl.searchParams.get("state");
  const state = decodeOAuthStateCookie(
    request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value
  );

  if (googleError) {
    const role = state?.role ?? "client";
    const response = NextResponse.redirect(
      loginUrl(request, role, "cancelled", state?.from)
    );
    clearOAuthCookie(response);
    return response;
  }

  if (!state || !nonce || nonce !== state.nonce || !code) {
    const response = NextResponse.redirect(
      loginUrl(request, state?.role ?? "client", "invalid")
    );
    clearOAuthCookie(response);
    return response;
  }

  let profile;
  try {
    profile = await exchangeGoogleCode({
      code,
      origin: publicOriginFromRequest(request),
      verifier: state.verifier,
    });
  } catch {
    const response = NextResponse.redirect(
      loginUrl(request, state.role, "failed", state.from)
    );
    clearOAuthCookie(response);
    return response;
  }

  if (!profile.emailVerified) {
    const response = NextResponse.redirect(
      loginUrl(request, state.role, "unverified", state.from)
    );
    clearOAuthCookie(response);
    return response;
  }

  if (state.role === "client") {
    const existing =
      (await getClientByGoogleSub(profile.sub)) ??
      (await getClientByEmail(profile.email));
    if (!existing && isBetaModeFromRequest(request)) {
      const response = NextResponse.redirect(
        loginUrl(request, "client", "beta", state.from)
      );
      clearOAuthCookie(response);
      return response;
    }

    const client = await upsertClientFromGoogle(profile);
    await linkOrphanWorkRequests(client.id, client.email, client.phone);

    const dest = new URL(state.from, request.url);
    const response = NextResponse.redirect(dest);
    clearOAuthCookie(response);
    response.cookies.set(
      CLIENT_SESSION_COOKIE,
      encodeClientSession({
        clientId: client.id,
        email: client.email,
        firstName: client.firstName,
        lastName: client.lastName,
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        secure: process.env.NODE_ENV === "production",
      }
    );
    return response;
  }

  const pro = await linkGoogleToEligiblePro(profile);
  if (pro) {
    const dest = new URL(state.from, request.url);
    const response = NextResponse.redirect(dest);
    clearOAuthCookie(response);
    response.cookies.set(
      PRO_SESSION_COOKIE,
      encodeProSession({
        proId: pro.id,
        companyName: pro.companyName,
        email: pro.email,
        siret: pro.siret,
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        secure: process.env.NODE_ENV === "production",
      }
    );
    return response;
  }

  if (isBetaModeFromRequest(request)) {
    const response = NextResponse.redirect(
      loginUrl(request, "pro", "beta", state.from)
    );
    clearOAuthCookie(response);
    return response;
  }

  const signup = new URL("/professionnel", request.url);
  signup.searchParams.set("google", "1");
  signup.hash = "inscription";
  const response = NextResponse.redirect(signup);
  clearOAuthCookie(response);
  response.cookies.set(
    GOOGLE_PRO_PENDING_COOKIE,
    encodeGoogleProPending({
      email: profile.email,
      googleSub: profile.sub,
      firstName: profile.firstName,
      lastName: profile.lastName,
    }),
    oauthCookieOptions(30 * 60)
  );
  return response;
}
