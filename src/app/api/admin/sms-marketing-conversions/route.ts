import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listSmsMarketingConversions } from "@/lib/sms-marketing-conversions";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const data = await listSmsMarketingConversions();
  return NextResponse.json(data);
}
