import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { previewEmailCampaign } from "@/lib/email-campaigns";
import type { EmailCampaignAudience } from "@/lib/store-types";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const audience: EmailCampaignAudience =
      body.audience === "work_request" || body.audience === "csv"
        ? body.audience
        : "platform";
    const department =
      body.department === "59" ||
      body.department === "62" ||
      body.department === "all"
        ? body.department
        : undefined;
    const preview = await previewEmailCampaign({
      audience,
      department,
      category: String(body.category ?? "").trim() || undefined,
      workRequestId: String(body.workRequestId ?? "").trim() || undefined,
      csv: String(body.csv ?? ""),
      subject: String(body.subject ?? "").trim() || undefined,
      bodyText: String(body.bodyText ?? "").trim() || undefined,
    });
    return NextResponse.json({ preview });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Aperçu impossible." },
      { status: 400 }
    );
  }
}
