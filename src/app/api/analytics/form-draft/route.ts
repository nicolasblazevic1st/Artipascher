import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/request-client";
import { upsertFormFunnelDraft } from "@/lib/form-funnel";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
const buckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const current = buckets.get(ip);
  if (!current || now >= current.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_PER_WINDOW;
}

function isSameOrigin(request: NextRequest): boolean {
  const host = request.headers.get("host");
  if (!host) return false;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }
  return false;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origine invalide." }, { status: 403 });
  }

  const ip = getClientIp(request);
  if (ip !== "unknown" && isRateLimited(ip)) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (!text || text.length > 6_144) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    body = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const payload = body as {
    sessionId?: unknown;
    workCategory?: unknown;
    otherWork?: unknown;
    description?: unknown;
  };

  const result = await upsertFormFunnelDraft({
    sessionId: typeof payload.sessionId === "string" ? payload.sessionId : "",
    workCategory:
      typeof payload.workCategory === "string"
        ? payload.workCategory
        : undefined,
    otherWork:
      typeof payload.otherWork === "string" ? payload.otherWork : undefined,
    description:
      typeof payload.description === "string" ? payload.description : undefined,
    ip,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
