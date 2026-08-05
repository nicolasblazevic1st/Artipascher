import { NextRequest, NextResponse } from "next/server";
import { searchBanAddresses, searchBanMunicipalities } from "@/lib/ban-address";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const type = request.nextUrl.searchParams.get("type")?.trim() ?? "";

  if (q.length < 3) {
    return NextResponse.json({ features: [] });
  }

  const features =
    type === "municipality"
      ? await searchBanMunicipalities(q, 8)
      : await searchBanAddresses(q, 8);

  return NextResponse.json({ features });
}
