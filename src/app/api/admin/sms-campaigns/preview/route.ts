import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { previewSmsCampaign } from "@/lib/sms-campaigns";
import { getWorkRequestById } from "@/lib/store";

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const workRequestId = request.nextUrl.searchParams.get("workRequestId")?.trim();
  if (!workRequestId) {
    return NextResponse.json({ error: "workRequestId requis." }, { status: 400 });
  }

  const workRequest = await getWorkRequestById(workRequestId);
  if (!workRequest) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  const preview = await previewSmsCampaign(workRequest);
  return NextResponse.json({ preview });
}
