import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { previewSmsCampaignDetailed } from "@/lib/sms-campaigns";
import { getWorkRequestById } from "@/lib/store";

export const maxDuration = 180;

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const workRequestId = request.nextUrl.searchParams.get("workRequestId")?.trim();
  if (!workRequestId) {
    return NextResponse.json({ error: "workRequestId requis." }, { status: 400 });
  }

  const sizeRaw = request.nextUrl.searchParams.get("campaignSize");
  const campaignSize = sizeRaw ? Number(sizeRaw) : undefined;

  const workRequest = await getWorkRequestById(workRequestId);
  if (!workRequest) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  try {
    const preview = await previewSmsCampaignDetailed(workRequest, {
      campaignSize: Number.isFinite(campaignSize) ? campaignSize : undefined,
      // Aperçu : assez pour voir des numéros, trop peu pour un timeout Nginx.
      maxPlacesAttempts: 12,
      maxRatingAttempts: 8,
    });
    return NextResponse.json({ preview });
  } catch (e) {
    console.error("[sms] preview failed", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Prévisualisation impossible (Places / base artisans).",
      },
      { status: 500 }
    );
  }
}
