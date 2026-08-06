import { NextRequest, NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import { validateProofFile } from "@/lib/demandes-validation";
import { attachProofToClientQuote, getOffersForClient } from "@/lib/store";
import { saveClientSubmittedQuoteProof } from "@/lib/uploads";

type RouteContext = { params: Promise<{ id: string }> };

/** Ajoute le justificatif PDF/photo à une offre saisie sans devis. */
export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await context.params;
  const formData = await request.formData();
  const proofEntry = formData.get("proof");
  const proofFile =
    proofEntry instanceof File && proofEntry.size > 0 ? proofEntry : null;

  const proofError = validateProofFile(proofFile);
  if (proofError) {
    return NextResponse.json({ error: proofError }, { status: 400 });
  }

  const offers = await getOffersForClient(session.clientId);
  const offer = offers.find((o) => o.id === id);
  if (!offer) {
    return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });
  }

  const proofUrl = await saveClientSubmittedQuoteProof(
    offer.workRequestId,
    proofFile!
  );
  const result = await attachProofToClientQuote(id, session.clientId, proofUrl);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, quote: result });
}
