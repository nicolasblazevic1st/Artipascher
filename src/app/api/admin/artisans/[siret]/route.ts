import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isMappedToPlatformCategory } from "@/lib/acquisition-naf";
import { addAcquisitionNafExtra } from "@/lib/acquisition-naf-extras";
import { getArtisanBySiret, updateArtisanBySiret } from "@/lib/artisans-db";
import type { EnrichmentStatus } from "@/lib/artisans-types";
import { normalizeFrenchPhone } from "@/lib/sms";
import { normalizeNafCode } from "@/lib/naf-trade-groups";

type Ctx = { params: Promise<{ siret: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const { siret } = await ctx.params;
  const artisan = await getArtisanBySiret(siret.replace(/\D/g, ""));
  if (!artisan) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }
  return NextResponse.json({
    artisan: {
      ...artisan,
      mappedToCategory: isMappedToPlatformCategory(artisan.nafCode),
    },
  });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { siret: raw } = await ctx.params;
  const siret = raw.replace(/\D/g, "");
  const existing = await getArtisanBySiret(siret);
  if (!existing) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const patch: Parameters<typeof updateArtisanBySiret>[1] = {};

  if (typeof body.companyName === "string" && body.companyName.trim()) {
    patch.companyName = body.companyName.trim();
  }
  if (typeof body.addressLine === "string") {
    patch.addressLine = body.addressLine.trim();
  }
  if (typeof body.city === "string") {
    patch.city = body.city.trim();
  }
  if (typeof body.postalCode === "string") {
    patch.postalCode = body.postalCode.trim();
  }
  if (typeof body.nafCode === "string" && body.nafCode.trim()) {
    const naf = normalizeNafCode(body.nafCode);
    patch.nafCode = naf;
    await addAcquisitionNafExtra(naf);
  }
  if (typeof body.optedOut === "boolean") {
    patch.optedOut = body.optedOut;
  }
  if (typeof body.status === "string" && (body.status === "active" || body.status === "closed")) {
    patch.status = body.status;
    if (body.status === "closed") {
      patch.closedAt = new Date().toISOString();
    }
  }

  if (body.phone !== undefined) {
    const rawPhone = String(body.phone ?? "").trim();
    if (!rawPhone) {
      patch.phone = undefined;
      patch.enrichmentStatus = "pending";
    } else {
      const normalized = normalizeFrenchPhone(rawPhone);
      if (!normalized) {
        return NextResponse.json(
          { error: "Numéro de téléphone invalide." },
          { status: 400 }
        );
      }
      patch.phone = normalized;
      patch.enrichmentStatus = "enriched";
      patch.enrichedAt = new Date().toISOString();
      patch.lastVerifiedAt = new Date().toISOString();
    }
  }

  if (typeof body.enrichmentStatus === "string") {
    const allowed: EnrichmentStatus[] = [
      "pending",
      "enriched",
      "no_match",
      "deferred",
      "invalid_phone",
    ];
    if (allowed.includes(body.enrichmentStatus as EnrichmentStatus)) {
      patch.enrichmentStatus = body.enrichmentStatus as EnrichmentStatus;
    }
  }

  if (body.markInvalidPhone === true) {
    patch.enrichmentStatus = "invalid_phone";
    patch.lastSmsFailedAt = new Date().toISOString();
  }

  const artisan = await updateArtisanBySiret(siret, patch);
  return NextResponse.json({
    ok: true,
    artisan: artisan
      ? {
          ...artisan,
          mappedToCategory: isMappedToPlatformCategory(artisan.nafCode),
        }
      : null,
  });
}
