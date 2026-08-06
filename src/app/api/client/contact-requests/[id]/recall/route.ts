import { NextRequest, NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import { sendContactRecallEmailToPro } from "@/lib/email";
import { notifyProContactRecalled } from "@/lib/notify";
import {
  getApprovedProById,
  getWorkRequestById,
  recallContactRequest,
} from "@/lib/store";

type RouteContext = { params: Promise<{ id: string }> };

/** Rappelle une fois un artisan refusé ou expiré (remet en attente 48 h). */
export async function POST(_request: NextRequest, context: RouteContext) {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await recallContactRequest(id, session.clientId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const pro = await getApprovedProById(result.request.proId);
  const workRequest = await getWorkRequestById(result.request.workRequestId);
  if (pro && workRequest) {
    void sendContactRecallEmailToPro({
      proEmail: pro.email,
      proCompanyName: pro.companyName,
      category: workRequest.category,
      city: workRequest.city,
      auctionId: result.request.auctionId,
    }).catch((err) => console.error("[email] contact recall", err));

    void notifyProContactRecalled({
      proId: pro.id,
      category: workRequest.category,
      city: workRequest.city,
      auctionId: result.request.auctionId,
    }).catch((err) => console.error("[notify] contact recall", err));
  }

  return NextResponse.json({ request: result.request });
}
