import { NextRequest, NextResponse } from "next/server";
import { searchBanAddresses } from "@/lib/ban-address";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 3) {
    return NextResponse.json({ features: [] });
  }

  const features = await searchBanAddresses(q, 8);
  return NextResponse.json({ features });
}
