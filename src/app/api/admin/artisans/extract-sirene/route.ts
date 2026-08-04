import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { syncSireneWeekly } from "@/lib/sirene-extract";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let maxPagesPerNaf = 2;
  try {
    const body = await request.json();
    if (typeof body.maxPagesPerNaf === "number") {
      maxPagesPerNaf = Math.max(1, Math.min(10, Math.floor(body.maxPagesPerNaf)));
    }
  } catch {
    // ok
  }

  const result = await syncSireneWeekly({
    maxPagesPerNaf,
    geocodeMissing: true,
    markMissingClosed: false,
  });

  return NextResponse.json({ ok: true, result });
}
