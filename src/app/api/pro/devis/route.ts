import { NextRequest, NextResponse } from "next/server";
import { betaClosedJsonResponse, isBetaModeFromRequest } from "@/lib/beta";
import { checkDecennaleForWorkCategory } from "@/lib/decennale-verification";
import { validateProQuote } from "@/lib/devis-validation";
import { notifyClientQuoteSubmitted } from "@/lib/notify";
import { getProSession } from "@/lib/pro-auth";
import {
  addProQuote,
  getApprovedProById,
  getProQuoteByProAndAuction,
  getProQuotesForPro,
  hasContactUnlock,
} from "@/lib/store";
import { getWorkRequestByAuctionId } from "@/lib/work-request-auctions";

export async function GET(request: NextRequest) {
  const session = await getProSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const auctionId = request.nextUrl.searchParams.get("auctionId");
  if (auctionId) {
    const quote = await getProQuoteByProAndAuction(session.proId, auctionId);
    return NextResponse.json({ quote });
  }

  const quotes = await getProQuotesForPro(session.proId);
  return NextResponse.json({ quotes });
}

export async function POST(request: NextRequest) {
  if (isBetaModeFromRequest(request)) return betaClosedJsonResponse();

  const { CONTACT_ONLY_MODE, DEVIS_RETIRED_MESSAGE, retiredFeatureJson } =
    await import("@/lib/product-features");
  if (CONTACT_ONLY_MODE) {
    return NextResponse.json(retiredFeatureJson(DEVIS_RETIRED_MESSAGE), {
      status: 410,
    });
  }

  const session = await getProSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  let body: {
    auctionId?: string;
    visitDate?: string;
    amount?: number;
    description?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const auctionId = body.auctionId ?? "";
  const visitDate = body.visitDate ?? "";
  const amount = Number(body.amount);
  const description = body.description ?? "";

  if (!auctionId) {
    return NextResponse.json({ error: "Enchère requise." }, { status: 400 });
  }

  const workRequest = await getWorkRequestByAuctionId(auctionId);
  if (!workRequest) {
    return NextResponse.json(
      { error: "Ce chantier ne permet pas encore le dépôt de devis formalisé." },
      { status: 400 }
    );
  }

  const unlocked = await hasContactUnlock(session.proId, auctionId);
  if (!unlocked) {
    return NextResponse.json(
      {
        error:
          "Débloquez d'abord les coordonnées du particulier, visitez le chantier, puis déposez votre devis.",
      },
      { status: 403 }
    );
  }

  const pro = await getApprovedProById(session.proId);
  if (pro) {
    const decennaleCheck = checkDecennaleForWorkCategory(pro, workRequest.category);
    if (!decennaleCheck.ok) {
      return NextResponse.json({ error: decennaleCheck.reason }, { status: 403 });
    }
  }

  const validationError = validateProQuote({ visitDate, amount, description });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const result = await addProQuote({
    workRequestId: workRequest.id,
    auctionId,
    proId: session.proId,
    companyName: session.companyName,
    visitDate,
    amount,
    description,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  void notifyClientQuoteSubmitted({
    workRequest,
    companyName: session.companyName,
    amount: result.amount,
  }).catch((err) => console.error("[notify] quote submitted", err));

  return NextResponse.json({ success: true, quote: result });
}
