import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { defaultNearbyRadiusKm } from "@/lib/geo-distance";
import { selectArtisansToContact } from "@/lib/select-artisans-to-contact";
import { ensureWorkRequestNafCodes } from "@/lib/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await context.params;
  const workRequest = await ensureWorkRequestNafCodes(id);
  if (!workRequest) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  const radiusRaw = Number(
    request.nextUrl.searchParams.get("radiusKm") ?? defaultNearbyRadiusKm()
  );
  const radiusKm =
    Number.isFinite(radiusRaw) && radiusRaw > 0
      ? Math.min(80, Math.max(1, radiusRaw))
      : defaultNearbyRadiusKm();

  const result = await selectArtisansToContact(workRequest, { radiusKm });
  return NextResponse.json(result);
}
