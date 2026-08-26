import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getFormFunnelReport, parseFunnelRangeDays } from "@/lib/form-funnel";

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const days = parseFunnelRangeDays(request.nextUrl.searchParams.get("days"));
  const excludeInternal =
    request.nextUrl.searchParams.get("excludeInternal") === "1";
  const report = await getFormFunnelReport(days, { excludeInternal });
  return NextResponse.json(report);
}
