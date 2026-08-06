import { NextRequest, NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import { sendContactDecisionEmailToPro } from "@/lib/email";
import { notifyProContactDecision } from "@/lib/notify";
import {
  decideContactRequest,
  getApprovedProById,
  getWorkRequestById,
} from "@/lib/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const { id } = await context.params;
  let decision: "accepted" | "refused";
  try {
    const body = await request.json();
    decision = body.decision === "accepted" ? "accepted" : "refused";
    if (body.decision !== "accepted" && body.decision !== "refused") {
      return NextResponse.json({ error: "Décision invalide." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const result = await decideContactRequest(id, session.clientId, decision);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const pro = await getApprovedProById(result.request.proId);
  const workRequest = await getWorkRequestById(result.request.workRequestId);
  if (pro && workRequest) {
    void sendContactDecisionEmailToPro({
      proEmail: pro.email,
      proCompanyName: pro.companyName,
      decision,
      category: workRequest.category,
      city: workRequest.city,
      auctionId: result.request.auctionId,
    }).catch((err) => console.error("[email] contact decision", err));

    void notifyProContactDecision({
      proId: pro.id,
      decision,
      category: workRequest.category,
      city: workRequest.city,
      auctionId: result.request.auctionId,
    }).catch((err) => console.error("[notify] contact decision", err));
  }

  return NextResponse.json({ request: result.request });
}
