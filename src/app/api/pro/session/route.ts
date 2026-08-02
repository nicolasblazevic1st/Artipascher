import { NextResponse } from "next/server";
import { getProSession } from "@/lib/pro-auth";

export async function GET() {
  const session = await getProSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    companyName: session.companyName,
    proId: session.proId,
  });
}
