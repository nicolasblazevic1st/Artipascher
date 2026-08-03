import { NextRequest, NextResponse } from "next/server";
import { checkBidEligibility } from "@/lib/bid-eligibility";
import { getProSession } from "@/lib/pro-auth";

export async function GET(request: NextRequest) {
  const session = await getProSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const auctionId = request.nextUrl.searchParams.get("auctionId") ?? "";
  const amountParam = request.nextUrl.searchParams.get("amount");
  const amount = amountParam ? Number(amountParam) : undefined;

  if (!auctionId) {
    return NextResponse.json({ error: "Enchère requise." }, { status: 400 });
  }

  const eligibility = await checkBidEligibility(
    session.proId,
    auctionId,
    Number.isFinite(amount) ? amount : undefined
  );

  return NextResponse.json(eligibility);
}
