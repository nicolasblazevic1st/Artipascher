import { NextRequest, NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import { resolveMaxContactArtisans } from "@/lib/contact-slots";
import { formatProTradeSelections } from "@/lib/pro-trades";
import {
  countAcceptedArtisansForAuction,
  getApprovedProById,
  getContactRequestsForWorkRequest,
  getWorkRequestForClient,
} from "@/lib/store";

type RouteContext = { params: Promise<{ id: string }> };

/** Liste des demandes d'intérêt pour une demande de travaux du client. */
export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const { id } = await context.params;
  const workRequest = await getWorkRequestForClient(id, session.clientId);
  if (!workRequest) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  const contactRequests = await getContactRequestsForWorkRequest(id);
  const items = [];

  for (const cr of contactRequests) {
    const pro = await getApprovedProById(cr.proId);
    items.push({
      id: cr.id,
      status: cr.status,
      createdAt: cr.createdAt,
      expiresAt: cr.expiresAt,
      decidedAt: cr.decidedAt,
      clientRecallUsed: cr.clientRecallUsed === true,
      companyName: pro?.companyName ?? "Artisan",
      siret: pro?.siret ?? "",
      city: pro?.city ?? "",
      trades: pro ? formatProTradeSelections(pro) : "",
    });
  }

  const acceptedArtisansCount = workRequest.auctionId
    ? await countAcceptedArtisansForAuction(workRequest.auctionId)
    : items.filter((i) => i.status === "accepted").length;

  return NextResponse.json({
    items,
    acceptedArtisansCount,
    maxAcceptedArtisans: resolveMaxContactArtisans(workRequest),
  });
}
