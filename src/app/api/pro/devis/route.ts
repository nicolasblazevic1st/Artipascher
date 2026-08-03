import { NextRequest, NextResponse } from "next/server";
import { validateProQuote } from "@/lib/devis-validation";
import { getProSession } from "@/lib/pro-auth";
import {
  addProQuote,
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

  return NextResponse.json({ success: true, quote: result });
}
