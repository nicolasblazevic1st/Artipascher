import { NextRequest, NextResponse } from "next/server";
import { betaClosedJsonResponse, isBetaModeFromRequest } from "@/lib/beta";
import { getProSession } from "@/lib/pro-auth";
import {
  claimUnlockRefund,
  getUnlockClaimViewForPro,
} from "@/lib/store";

export async function GET(request: NextRequest) {
  const session = await getProSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const auctionId = request.nextUrl.searchParams.get("auctionId")?.trim() ?? "";
  if (!auctionId) {
    return NextResponse.json({ error: "auctionId requis." }, { status: 400 });
  }

  const view = await getUnlockClaimViewForPro(session.proId, auctionId);
  if (!view) {
    return NextResponse.json({ unlocked: false });
  }

  return NextResponse.json({
    unlocked: true,
    claimStatus: view.unlock.claimStatus ?? "none",
    refundedAt: view.unlock.refundedAt ?? null,
    claimedAt: view.unlock.claimedAt ?? null,
    canClaim: view.canClaim,
    claimBlockedReason: view.claimBlockedReason ?? null,
    autoEligible: view.autoEligible,
    hasQuote: view.hasQuote,
    paidAt: view.unlock.paidAt,
  });
}

export async function POST(request: NextRequest) {
  if (isBetaModeFromRequest(request)) return betaClosedJsonResponse();

  const session = await getProSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  let auctionId = "";
  let reason: string | undefined;
  try {
    const body = await request.json();
    auctionId = String(body.auctionId ?? "").trim();
    if (typeof body.reason === "string") reason = body.reason;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!auctionId) {
    return NextResponse.json({ error: "auctionId requis." }, { status: 400 });
  }

  const result = await claimUnlockRefund({
    proId: session.proId,
    auctionId,
    reason,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    autoApproved: result.autoApproved,
    claimStatus: result.unlock.claimStatus ?? "none",
    refundedAt: result.unlock.refundedAt ?? null,
    balance: result.balance ?? null,
    message: result.autoApproved
      ? "1 crédit a été recrédité sur votre compte."
      : "Signalement enregistré — examen par l’équipe Artipascher.",
  });
}
