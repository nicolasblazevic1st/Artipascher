import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { notifyQuoteReviewed } from "@/lib/notify";
import {
  backfillBidsFromApprovedQuotes,
  getWorkRequestById,
  readStore,
  updateProQuoteStatus,
} from "@/lib/store";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  await backfillBidsFromApprovedQuotes();

  const store = await readStore();
  const quotes = [...store.proQuotes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const requestsById = Object.fromEntries(store.workRequests.map((r) => [r.id, r]));

  const enriched = quotes.map((q) => {
    const request = requestsById[q.workRequestId];
    return {
      ...q,
      projectLabel: request ? `${request.category} · ${request.city}` : "—",
      clientName: request ? `${request.firstName} ${request.lastName}` : "—",
    };
  });

  return NextResponse.json({ quotes: enriched });
}

export async function PATCH(request: NextRequest) {
  const { CONTACT_ONLY_MODE, DEVIS_RETIRED_MESSAGE, retiredFeatureJson } =
    await import("@/lib/product-features");
  if (CONTACT_ONLY_MODE) {
    return NextResponse.json(retiredFeatureJson(DEVIS_RETIRED_MESSAGE), {
      status: 410,
    });
  }

  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: { id?: string; status?: "approved" | "rejected"; adminNote?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { id, status, adminNote } = body;
  if (!id || !status || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }

  const quote = await updateProQuoteStatus(id, status, adminNote);
  if (!quote) {
    return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  }

  const workRequest = await getWorkRequestById(quote.workRequestId);
  if (workRequest) {
    void notifyQuoteReviewed({
      proId: quote.proId,
      workRequest,
      status,
      amount: quote.amount,
      submittedByClientId:
        quote.submittedBy === "client" ? quote.uploadedByClientId : undefined,
    }).catch((err) => console.error("[notify] quote reviewed", err));
  }

  return NextResponse.json({ success: true, quote });
}
