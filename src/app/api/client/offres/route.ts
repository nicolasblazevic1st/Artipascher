import { NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import { getOffersForClient } from "@/lib/store";

/** Liste des offres / devis liés aux demandes du particulier. */
export async function GET() {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const offers = await getOffersForClient(session.clientId);
  return NextResponse.json({
    offers: offers.map((o) => ({
      id: o.id,
      workRequestId: o.workRequestId,
      auctionId: o.auctionId,
      companyName: o.companyName,
      projectLabel: o.projectLabel,
      amount: o.amount,
      visitDate: o.visitDate,
      description: o.description,
      status: o.status,
      proofUrl: o.proofUrl,
      submittedBy: o.submittedBy ?? "pro",
      canAttachProof: o.canAttachProof,
      adminNote: o.adminNote,
      createdAt: o.createdAt,
    })),
  });
}
