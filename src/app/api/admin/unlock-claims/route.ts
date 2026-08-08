import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  listPendingUnlockClaims,
  resolveUnlockClaim,
  setClientContactBlock,
} from "@/lib/store";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const claims = await listPendingUnlockClaims();
  return NextResponse.json({
    claims: claims.map((c) => ({
      id: c.unlock.id,
      auctionId: c.unlock.auctionId,
      workRequestId: c.unlock.workRequestId,
      proId: c.unlock.proId,
      proCompanyName: c.proCompanyName,
      proEmail: c.proEmail,
      clientLabel: c.clientLabel,
      clientId: c.clientId,
      category: c.category,
      city: c.city,
      hasQuote: c.hasQuote,
      paidAt: c.unlock.paidAt,
      claimedAt: c.unlock.claimedAt,
      claimReason: c.unlock.claimReason,
      amountEur: c.unlock.amountEur,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let action = "";
  let unlockId = "";
  let clientId = "";
  let blocked = false;
  let adminNote: string | undefined;

  try {
    const body = await request.json();
    action = String(body.action ?? "").trim();
    unlockId = String(body.unlockId ?? "").trim();
    clientId = String(body.clientId ?? "").trim();
    blocked = body.blocked === true;
    if (typeof body.adminNote === "string") adminNote = body.adminNote;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (action === "approve" || action === "reject") {
    if (!unlockId) {
      return NextResponse.json({ error: "unlockId requis." }, { status: 400 });
    }
    const result = await resolveUnlockClaim({
      unlockId,
      decision: action === "approve" ? "approved" : "rejected",
      adminNote,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({
      ok: true,
      claimStatus: result.unlock.claimStatus,
      balance: result.balance ?? null,
      ghostClaimsUpheld: result.ghostClaimsUpheld ?? null,
      clientBlocked: result.clientBlocked ?? null,
    });
  }

  if (action === "set_client_block") {
    if (!clientId) {
      return NextResponse.json({ error: "clientId requis." }, { status: 400 });
    }
    const result = await setClientContactBlock({
      clientId,
      blocked,
      adminNote,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      clientId: result.id,
      blockedFromContact: Boolean(result.blockedFromContact),
      ghostClaimsUpheld: result.ghostClaimsUpheld ?? 0,
    });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
