import { NextRequest, NextResponse } from "next/server";
import {
  unsubscribePageUrl,
  verifyUnsubscribeToken,
} from "@/lib/email-unsubscribe";
import { addEmailMarketingOptOut } from "@/lib/store";

export const dynamic = "force-dynamic";

async function unsubscribeFromRequest(request: NextRequest): Promise<string | null> {
  const fromQuery = request.nextUrl.searchParams.get("token")?.trim();
  if (fromQuery) return fromQuery;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    const token = form.get("token");
    return typeof token === "string" ? token.trim() : null;
  }
  return null;
}

async function applyUnsubscribe(token: string): Promise<boolean> {
  const email = verifyUnsubscribeToken(token);
  if (!email) return false;
  await addEmailMarketingOptOut(email, "link");
  return true;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.redirect(unsubscribePageUrl({ error: "missing" }));
  }
  const ok = await applyUnsubscribe(token);
  if (!ok) {
    return NextResponse.redirect(unsubscribePageUrl({ error: "invalid" }));
  }
  return NextResponse.redirect(unsubscribePageUrl({ ok: "1" }));
}

export async function POST(request: NextRequest) {
  const token = (await unsubscribeFromRequest(request)) ?? "";
  const ok = token ? await applyUnsubscribe(token) : false;
  if (request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ ok });
  }
  if (!ok) {
    return new NextResponse("Invalid token", { status: 400 });
  }
  return new NextResponse("OK", { status: 200 });
}
