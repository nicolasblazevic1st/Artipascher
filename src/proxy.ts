import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  isValidSessionToken,
} from "@/lib/admin-auth";
import {
  PRO_SESSION_COOKIE,
  isValidProSessionToken,
} from "@/lib/pro-auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  if (pathname.startsWith("/pro/login")) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/pro/:path*"],
};
