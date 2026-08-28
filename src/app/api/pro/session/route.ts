import { NextResponse } from "next/server";
import { getProSession } from "@/lib/pro-auth";
import { getProForSession } from "@/lib/store";

export async function GET() {
  const session = await getProSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  const pro = await getProForSession(session);
  return NextResponse.json({
    authenticated: true,
    companyName: session.companyName,
    proId: session.proId,
    googleLinked: Boolean(pro?.googleSub),
    googlePictureUrl: pro?.googlePictureUrl ?? null,
  });
}
