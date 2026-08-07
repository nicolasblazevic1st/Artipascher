import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { syncSireneWeekly } from "@/lib/sirene-extract";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let maxPagesPerNaf = 2;
  let full = false;
  let geocodeMissing = true;
  try {
    const body = await request.json();
    full = body.full === true;
    if (typeof body.maxPagesPerNaf === "number") {
      maxPagesPerNaf = Math.max(1, Math.min(400, Math.floor(body.maxPagesPerNaf)));
    }
    if (typeof body.geocodeMissing === "boolean") {
      geocodeMissing = body.geocodeMissing;
    }
  } catch {
    // ok
  }

  const result = await syncSireneWeekly({
    full,
    maxPagesPerNaf: full ? undefined : maxPagesPerNaf,
    geocodeMissing: full ? false : geocodeMissing,
    markMissingClosed: false,
  });

  return NextResponse.json({ ok: true, result });
}
