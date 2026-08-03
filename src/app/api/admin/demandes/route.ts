import { NextRequest, NextResponse } from "next/server";
import { computeAuctionEndsAt } from "@/lib/auction-duration";
import { createShareToken } from "@/lib/share";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readStore, updateWorkRequest } from "@/lib/store";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const store = await readStore();
  return NextResponse.json({ requests: store.workRequests });
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await request.json();
  const { id, status } = body as {
    id?: string;
    status?: "approved" | "rejected";
  };

  if (!id || !status) {
    return NextResponse.json({ error: "id et status requis." }, { status: 400 });
  }

  const auctionId = status === "approved" ? `auction-${id}` : undefined;

  let auctionEndsAt: string | undefined;
  let shareToken: string | undefined;
  if (status === "approved") {
    const store = await readStore();
    const request = store.workRequests.find((r) => r.id === id);
    if (request) {
      auctionEndsAt = computeAuctionEndsAt(
        new Date(),
        request.auctionDurationDays ?? 30
      ).toISOString();
      shareToken = request.shareToken ?? createShareToken();
    }
  }

  const storeBefore = await readStore();
  const existing = storeBefore.workRequests.find((r) => r.id === id);
  const startPriceFromPreviousQuote =
    status === "approved" &&
    existing?.previousQuoteAmount != null &&
    existing.startPriceQuoteId == null
      ? existing.previousQuoteAmount
      : undefined;

  const updated = await updateWorkRequest(id, {
    status,
    auctionId,
    auctionEndsAt,
    shareToken,
    ...(startPriceFromPreviousQuote != null
      ? { startPrice: startPriceFromPreviousQuote }
      : {}),
  });
  if (!updated) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  return NextResponse.json({ request: updated });
}
