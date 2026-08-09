import { NextRequest, NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import { DEFAULT_CLIENT_PRICE_DESCRIPTION } from "@/lib/client-quote";
import {
  MIN_QUOTE_DESCRIPTION_LENGTH,
  validateProQuote,
} from "@/lib/devis-validation";
import { validateProofFile } from "@/lib/demandes-validation";
import {
  addProQuote,
  canClientSubmitQuoteForPro,
  getApprovedProById,
  getClientQuoteEligibleProsForAuction,
  getProQuoteByProAndAuction,
  getWorkRequestForClient,
} from "@/lib/store";
import { saveClientSubmittedQuoteProof } from "@/lib/uploads";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Liste les artisans acceptés / ayant débloqué le chantier + leur devis éventuel,
 * pour permettre au particulier de transmettre un devis reçu hors plateforme.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await context.params;
  const workRequest = await getWorkRequestForClient(id, session.clientId);
  if (!workRequest) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  if (workRequest.status !== "approved" || !workRequest.auctionId) {
    return NextResponse.json({ artisans: [] });
  }

  const eligible = await getClientQuoteEligibleProsForAuction(workRequest.auctionId);
  const artisans = await Promise.all(
    eligible.map(async (artisan) => {
      const quote = await getProQuoteByProAndAuction(
        artisan.proId,
        workRequest.auctionId!
      );
      return {
        proId: artisan.proId,
        companyName: artisan.companyName,
        quote: quote
          ? {
              id: quote.id,
              status: quote.status,
              amount: quote.amount,
              visitDate: quote.visitDate,
              description: quote.description,
              proofUrl: quote.proofUrl,
              submittedBy: quote.submittedBy ?? "pro",
              adminNote: quote.adminNote,
            }
          : null,
      };
    })
  );

  return NextResponse.json({ artisans });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { CONTACT_ONLY_MODE, DEVIS_RETIRED_MESSAGE, retiredFeatureJson } =
    await import("@/lib/product-features");
  if (CONTACT_ONLY_MODE) {
    return NextResponse.json(retiredFeatureJson(DEVIS_RETIRED_MESSAGE), {
      status: 410,
    });
  }

  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await context.params;
  const workRequest = await getWorkRequestForClient(id, session.clientId);
  if (!workRequest) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  if (workRequest.status !== "approved" || !workRequest.auctionId) {
    return NextResponse.json(
      { error: "La demande doit être validée et l'enchère active." },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const proId = String(formData.get("proId") ?? "").trim();
  const visitDate = String(formData.get("visitDate") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const proofEntry = formData.get("proof");
  const proofFile =
    proofEntry instanceof File && proofEntry.size > 0 ? proofEntry : null;

  if (!proId) {
    return NextResponse.json({ error: "Choisissez l'artisan concerné." }, { status: 400 });
  }

  const allowed = await canClientSubmitQuoteForPro(proId, workRequest.auctionId);
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          "Vous ne pouvez saisir un prix que pour un artisan dont vous avez accepté la demande de contact.",
      },
      { status: 403 }
    );
  }

  const pro = await getApprovedProById(proId);
  if (!pro) {
    return NextResponse.json({ error: "Artisan introuvable." }, { status: 404 });
  }

  if (proofFile) {
    const proofError = validateProofFile(proofFile);
    if (proofError) {
      return NextResponse.json({ error: proofError }, { status: 400 });
    }
  }

  if (
    descriptionRaw &&
    descriptionRaw.length > 0 &&
    descriptionRaw.length < MIN_QUOTE_DESCRIPTION_LENGTH
  ) {
    return NextResponse.json(
      {
        error: `Le détail doit contenir au moins ${MIN_QUOTE_DESCRIPTION_LENGTH} caractères, ou restez vide pour le texte automatique.`,
      },
      { status: 400 }
    );
  }

  const description = descriptionRaw || DEFAULT_CLIENT_PRICE_DESCRIPTION;
  const validationError = validateProQuote({ visitDate, amount, description });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const proofUrl = proofFile
    ? await saveClientSubmittedQuoteProof(workRequest.id, proofFile)
    : undefined;

  const result = await addProQuote({
    workRequestId: workRequest.id,
    auctionId: workRequest.auctionId,
    proId: pro.id,
    companyName: pro.companyName,
    visitDate,
    amount,
    description,
    proofUrl,
    submittedBy: "client",
    uploadedByClientId: session.clientId,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, quote: result });
}
