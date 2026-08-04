import { NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import { formatProTradeSelections } from "@/lib/pro-trades";
import {
  getApprovedProById,
  getContactRequestsForWorkRequest,
  getWorkRequestsByClientId,
} from "@/lib/store";

export async function GET() {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const requests = await getWorkRequestsByClientId(session.clientId);
  const all = [];

  for (const wr of requests) {
    const contactRequests = await getContactRequestsForWorkRequest(wr.id);
    for (const cr of contactRequests) {
      const pro = await getApprovedProById(cr.proId);
      all.push({
        ...cr,
        category: wr.category,
        city: wr.city,
        companyName: pro?.companyName ?? "Artisan",
        siret: pro?.siret ?? "",
        trades: pro ? formatProTradeSelections(pro) : "",
      });
    }
  }

  return NextResponse.json({
    requests: all.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
  });
}
