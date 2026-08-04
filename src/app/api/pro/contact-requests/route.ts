import { NextRequest, NextResponse } from "next/server";
import { sendContactInterestEmailToClient } from "@/lib/email";
import { formatProTradeSelections } from "@/lib/pro-trades";
import { getProSession } from "@/lib/pro-auth";
import {
  createContactRequest,
  getApprovedProById,
  getContactRequestsForPro,
} from "@/lib/store";
import { getWorkRequestByAuctionId } from "@/lib/work-request-auctions";

export async function GET() {
  const session = await getProSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }
  const requests = await getContactRequestsForPro(session.proId);
  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const session = await getProSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  let auctionId: string;
  try {
    const body = await request.json();
    auctionId = String(body.auctionId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!auctionId) {
    return NextResponse.json({ error: "auctionId requis." }, { status: 400 });
  }

  const pro = await getApprovedProById(session.proId);
  if (!pro) {
    return NextResponse.json(
      { error: "Compte pro introuvable ou non approuvé." },
      { status: 403 }
    );
  }

  const workRequest = await getWorkRequestByAuctionId(auctionId);
  if (!workRequest || workRequest.status !== "approved" || !workRequest.auctionId) {
    return NextResponse.json({ error: "Offre introuvable ou inactive." }, { status: 404 });
  }

  const result = await createContactRequest({
    auctionId,
    workRequestId: workRequest.id,
    proId: pro.id,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  void sendContactInterestEmailToClient({
    clientEmail: workRequest.email,
    clientFirstName: workRequest.firstName,
    proCompanyName: pro.companyName,
    proSiret: pro.siret,
    category: workRequest.category,
    city: workRequest.city,
    workRequestId: workRequest.id,
  }).catch((err) => console.error("[email] contact interest", err));

  return NextResponse.json(
    {
      request: result.request,
      proSummary: {
        companyName: pro.companyName,
        siret: pro.siret,
        trades: formatProTradeSelections(pro),
      },
    },
    { status: 201 }
  );
}
