import { NextRequest, NextResponse } from "next/server";
import {
  BID_FEE_EUR,
  computeCurrentPrice,
  validateBidAmount,
} from "@/lib/auctions";
import { betaClosedJsonResponse, isBetaModeFromRequest } from "@/lib/beta";
import { checkBidEligibility } from "@/lib/bid-eligibility";
import { verifyDevisFileMatchesAmount } from "@/lib/devis-ocr";
import { validateProofFile } from "@/lib/demandes-validation";
import { parseAmountToCents, centsToEuros } from "@/lib/money";
import { notifyClientBidPlaced } from "@/lib/notify";
import { getWorkRequestByAuctionId, resolveAuction } from "@/lib/work-request-auctions";
import { getProSession } from "@/lib/pro-auth";
import { isDemoPaymentAllowed } from "@/lib/payments";
import {
  addBid,
  countProBidsForAuction,
  getApprovedProById,
  getBidsForAuction,
  getProCreditBalance,
  spendProCredit,
} from "@/lib/store";
import { saveBidDevisProofFromBuffer } from "@/lib/uploads";

async function parsePlaceBidRequest(request: NextRequest): Promise<
  | {
      ok: true;
      auctionId: string;
      amount: number;
      amountCents: number;
      demo: boolean;
      devisFile: File;
      devisBuffer: Buffer;
    }
  | { ok: false; error: string; status: number }
> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const auctionId = String(form.get("auctionId") ?? "");
    const amountCents = parseAmountToCents(form.get("amount"));
    const demo = form.get("demo") === "true" || form.get("demo") === "1";
    const devisFile = form.get("devis");

    if (!auctionId) {
      return { ok: false, error: "Enchère manquante.", status: 400 };
    }
    if (amountCents == null) {
      return {
        ok: false,
        error: "Montant invalide (précisez au centime près).",
        status: 400,
      };
    }
    if (!(devisFile instanceof File) || devisFile.size === 0) {
      return {
        ok: false,
        error: "Joignez le PDF de votre devis : le montant TTC doit égaler votre enchère au centime près.",
        status: 400,
      };
    }

    const fileError = validateProofFile(devisFile);
    if (fileError) {
      return { ok: false, error: fileError, status: 400 };
    }

    if (devisFile.type !== "application/pdf") {
      return {
        ok: false,
        error:
          "Pour la vérification OCR, le devis doit être un PDF texte (pas une image ni un scan).",
        status: 400,
      };
    }

    const devisBuffer = Buffer.from(await devisFile.arrayBuffer());
    return {
      ok: true,
      auctionId,
      amount: centsToEuros(amountCents),
      amountCents,
      demo,
      devisFile,
      devisBuffer,
    };
  }

  // Ancien JSON sans devis → refusé
  try {
    await request.json();
  } catch {
    /* ignore */
  }
  return {
    ok: false,
    error:
      "Joignez le PDF de votre devis (formulaire multipart). Le montant OCR doit correspondre à l'enchère au centime près.",
    status: 400,
  };
}

export async function POST(request: NextRequest) {
  if (isBetaModeFromRequest(request)) return betaClosedJsonResponse();

  const session = await getProSession();
  if (!session) {
    return NextResponse.json(
      { error: "Connectez-vous avec votre compte pro approuvé." },
      { status: 401 }
    );
  }

  const pro = await getApprovedProById(session.proId);
  if (!pro) {
    return NextResponse.json(
      { error: "Compte pro non approuvé par l'administration." },
      { status: 403 }
    );
  }

  const parsed = await parsePlaceBidRequest(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const { auctionId, amount, amountCents, demo, devisFile, devisBuffer } = parsed;

  const auction = await resolveAuction(auctionId);
  if (!auction || auction.status !== "active") {
    return NextResponse.json({ error: "Enchère introuvable ou terminée." }, { status: 404 });
  }

  if (auction.startPrice == null) {
    return NextResponse.json(
      {
        error:
          "Le prix de départ n'est pas encore fixé. Il sera défini au premier devis validé par l'administration.",
      },
      { status: 403 }
    );
  }

  const existingBids = await getBidsForAuction(auctionId);
  const currentPrice = computeCurrentPrice(
    auction.startPrice,
    existingBids.map((b) => b.amount)
  )!;

  const amountError = validateBidAmount(amount, currentPrice);
  if (amountError) {
    return NextResponse.json({ error: amountError }, { status: 400 });
  }

  const eligibility = await checkBidEligibility(session.proId, auctionId, amount);
  if (!eligibility.canBid) {
    return NextResponse.json(
      {
        error: eligibility.reason ?? "Devis requis avant d'enchérir.",
        requiresQuote: eligibility.requiresQuote,
        requiresContactUnlock: eligibility.requiresContactUnlock,
        quote: eligibility.quote,
        maxBidsPerAuction: eligibility.maxBidsPerAuction,
        bidsUsed: eligibility.bidsUsed,
        bidsRemaining: eligibility.bidsRemaining,
      },
      { status: 403 }
    );
  }

  const ocr = await verifyDevisFileMatchesAmount(
    devisBuffer,
    devisFile.name || devisFile.type,
    amountCents
  );
  if (!ocr.ok) {
    return NextResponse.json(
      {
        error: ocr.error ?? "Le devis ne correspond pas au montant de l'enchère.",
        ocrAmount: ocr.ocrAmountEuros,
        ocrSnippet: ocr.rawSnippet,
      },
      { status: 422 }
    );
  }

  const balance = await getProCreditBalance(session.proId);
  const canSpend = balance >= 1;
  const allowDemoWithoutCredit = demo && isDemoPaymentAllowed() && !canSpend;

  if (!canSpend && !allowDemoWithoutCredit) {
    return NextResponse.json(
      {
        error:
          "Solde insuffisant. Achetez des crédits (1 crédit = 1 €) dans Mon compte pour enchérir.",
        needsCredits: true,
        balance,
      },
      { status: 402 }
    );
  }

  const devisProofUrl = await saveBidDevisProofFromBuffer(
    session.proId,
    auctionId,
    devisBuffer,
    devisFile.name || "devis.pdf",
    devisFile.type || "application/pdf"
  );

  if (canSpend) {
    const spent = await spendProCredit({
      proId: session.proId,
      type: "spend_bid",
      auctionId,
      note: `Enchère ${amount} €`,
    });
    if ("error" in spent) {
      return NextResponse.json(
        { error: spent.error, needsCredits: true, balance },
        { status: 402 }
      );
    }
  }

  try {
    const bidsUsed = await countProBidsForAuction(session.proId, auctionId);
    if (bidsUsed >= eligibility.maxBidsPerAuction) {
      return NextResponse.json(
        {
          error: `Vous avez utilisé vos ${eligibility.maxBidsPerAuction} enchères sur ce chantier.`,
          bidsUsed: eligibility.maxBidsPerAuction,
          bidsRemaining: 0,
        },
        { status: 403 }
      );
    }

    const bid = await addBid({
      auctionId,
      proId: session.proId,
      companyName: pro.companyName,
      amount,
      feeEur: BID_FEE_EUR,
      devisProofUrl,
      ocrAmount: ocr.ocrAmountEuros,
      ocrMatchedLabel: ocr.matchedLabel,
      ocrSnippet: ocr.rawSnippet,
    });

    const workRequest = await getWorkRequestByAuctionId(auctionId);
    if (workRequest) {
      void notifyClientBidPlaced({
        workRequest,
        companyName: pro.companyName,
        amount,
      }).catch((err) => console.error("[notify] bid placed", err));
    }

    const newBalance = await getProCreditBalance(session.proId);
    return NextResponse.json({
      success: true,
      bid,
      currentPrice: amount,
      creditsSpent: canSpend ? 1 : 0,
      balance: newBalance,
      demo: allowDemoWithoutCredit,
      bidsUsed: eligibility.bidsUsed + 1,
      bidsRemaining: Math.max(0, eligibility.bidsRemaining - 1),
      ocrVerified: true,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "BID_LIMIT_REACHED") {
      return NextResponse.json(
        {
          error: `Vous avez utilisé vos ${eligibility.maxBidsPerAuction} enchères sur ce chantier.`,
          bidsUsed: eligibility.maxBidsPerAuction,
          bidsRemaining: 0,
        },
        { status: 403 }
      );
    }
    throw err;
  }
}
