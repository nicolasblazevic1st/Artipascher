import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  isAcquisitionNaf,
  isMappedToPlatformCategory,
} from "@/lib/acquisition-naf";
import {
  getArtisanBySiret,
  listArtisans,
  upsertArtisan,
} from "@/lib/artisans-db";
import type { ArtisanDepartment, EnrichmentStatus } from "@/lib/artisans-types";
import {
  companyMatchesNafFilter,
  companyMatchesQuery,
  groupArtisansBySiren,
} from "@/lib/artisans-group";
import { normalizeNafCode } from "@/lib/naf-trade-groups";

function departmentFromPostal(code: string): ArtisanDepartment | null {
  const postal = code.replace(/\D/g, "");
  if (postal.startsWith("59")) return "59";
  if (postal.startsWith("62")) return "62";
  return null;
}

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const department = searchParams.get("department") as ArtisanDepartment | null;
  const enrichmentStatus = searchParams.get(
    "enrichmentStatus"
  ) as EnrichmentStatus | null;
  const hasPhone = searchParams.get("hasPhone");
  const unmappedOnly = searchParams.get("unmappedOnly") === "1";
  const rgeOnly = searchParams.get("rge") === "1";
  const rgeWithoutRating = searchParams.get("rgeWithoutRating") === "1";
  const nafRaw = searchParams.get("naf") ?? "";
  const nafFilter = [
    ...new Set(
      nafRaw
        .split(",")
        .map((c) => normalizeNafCode(c.trim()))
        .filter(Boolean)
    ),
  ];
  const status = (searchParams.get("status") as "active" | "closed" | null) ?? "active";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(
    100,
    Math.max(10, Number(searchParams.get("pageSize") ?? 50) || 50)
  );

  let rows = await listArtisans({
    department: department === "59" || department === "62" ? department : undefined,
    status: status === "closed" ? "closed" : status === "active" ? "active" : undefined,
    enrichmentStatus: enrichmentStatus || undefined,
  });

  if (hasPhone === "1") {
    rows = rows.filter((a) => Boolean(a.phone?.trim()));
  } else if (hasPhone === "0") {
    rows = rows.filter((a) => !a.phone?.trim());
  }

  let groups = groupArtisansBySiren(rows);

  if (unmappedOnly) {
    groups = groups.filter((g) => g.hasUnmappedPrimary);
  }

  if (rgeOnly) {
    groups = groups.filter((g) => g.isRge);
  }

  if (rgeWithoutRating) {
    groups = groups.filter(
      (g) =>
        g.isRge &&
        (typeof g.googleRating !== "number" || !Number.isFinite(g.googleRating))
    );
  }

  if (nafFilter.length > 0) {
    groups = groups.filter((g) => companyMatchesNafFilter(g, nafFilter));
  }

  if (q) {
    groups = groups.filter((g) => companyMatchesQuery(g, q));
  }

  const total = groups.length;
  const establishmentCount = groups.reduce(
    (n, g) => n + g.establishments.length,
    0
  );
  const start = (page - 1) * pageSize;
  const items = groups.slice(start, start + pageSize);

  return NextResponse.json({
    items,
    total,
    establishmentCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    groupedBySiren: true,
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const siret = String(body.siret ?? "").replace(/\D/g, "");
  if (!/^\d{14}$/.test(siret)) {
    return NextResponse.json({ error: "SIRET invalide." }, { status: 400 });
  }

  const existing = await getArtisanBySiret(siret);
  if (existing) {
    return NextResponse.json(
      { error: "Cet artisan existe déjà.", artisan: existing },
      { status: 409 }
    );
  }

  const postalCode = String(body.postalCode ?? "").trim();
  const department =
    (body.department as ArtisanDepartment | undefined) ??
    departmentFromPostal(postalCode);
  if (department !== "59" && department !== "62") {
    return NextResponse.json(
      { error: "Département 59 ou 62 requis." },
      { status: 400 }
    );
  }

  const nafCode = normalizeNafCode(String(body.nafCode ?? ""));
  if (!nafCode) {
    return NextResponse.json({ error: "Code NAF requis." }, { status: 400 });
  }

  if (!isAcquisitionNaf(nafCode)) {
    return NextResponse.json(
      {
        error:
          "Code NAF hors des 16 métiers plateforme (22 codes autorisés). Choisissez un NAF mappé.",
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const phone = String(body.phone ?? "").trim() || undefined;
  const artisan = await upsertArtisan(
    {
      siret,
      siren: siret.slice(0, 9),
      companyName: String(body.companyName ?? "").trim() || `Établissement ${siret}`,
      addressLine: String(body.addressLine ?? "").trim(),
      postalCode,
      city: String(body.city ?? "").trim(),
      department,
      nafCode,
      status: "active",
      phone,
      website: String(body.website ?? "").trim() || undefined,
      enrichmentStatus: phone ? "enriched" : "pending",
      enrichedAt: phone ? now : undefined,
      lastVerifiedAt: phone ? now : undefined,
      lastSeenAt: now,
      source: "import",
    },
    { preserveContact: false }
  );

  return NextResponse.json({
    ok: true,
    artisan: {
      ...artisan,
      mappedToCategory: isMappedToPlatformCategory(artisan.nafCode),
    },
  });
}
