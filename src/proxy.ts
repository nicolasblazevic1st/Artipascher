import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  isValidSessionToken,
} from "@/lib/admin-auth";
import {
  PRO_SESSION_COOKIE,
  isValidProSessionToken,
} from "@/lib/pro-auth";
import {
  CLIENT_SESSION_COOKIE,
  isValidClientSessionToken,
} from "@/lib/client-auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicClientPaths = [
    "/particulier/espace/login",
    "/particulier/espace/inscription",
    "/particulier/espace/mot-de-passe-oublie",
    "/particulier/espace/reinitialiser-mot-de-passe",
    "/particulier/espace/verifier-email",
  ];
  const publicProPaths = [
    "/pro/login",
    "/pro/mot-de-passe-oublie",
    "/pro/reinitialiser-mot-de-passe",
    "/pro/verifier-email",
  ];

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!isValidSessionToken(token)) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (publicProPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/pro")) {
    const token = request.cookies.get(PRO_SESSION_COOKIE)?.value;
    if (!isValidProSessionToken(token)) {
      const loginUrl = new URL("/pro/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (publicClientPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/particulier/espace")) {
    const token = request.cookies.get(CLIENT_SESSION_COOKIE)?.value;
    if (!isValidClientSessionToken(token)) {
      const loginUrl = new URL("/particulier/espace/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/pro/:path*", "/particulier/espace/:path*"],
};
