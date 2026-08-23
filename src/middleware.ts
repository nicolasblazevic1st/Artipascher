import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { BRAND } from "@/lib/brand";

const CANONICAL_HOST = BRAND.domain;

/** www et hôte non canonique → apex HTTPS (évite le contenu en double). */
export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0]?.toLowerCase();
  if (!host || host === CANONICAL_HOST) return NextResponse.next();
  if (host === `www.${CANONICAL_HOST}`) {
    const dest = `https://${CANONICAL_HOST}${request.nextUrl.pathname}${request.nextUrl.search}`;
    return NextResponse.redirect(dest, 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
