import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { normalizeFrenchMobile } from "@/lib/sms";
import {
  getArtisanProspects,
  upsertArtisanProspect,
} from "@/lib/store";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const prospects = await getArtisanProspects();
  return NextResponse.json({
    prospects: prospects.sort((a, b) => a.companyName.localeCompare(b.companyName, "fr")),
  });
}

export async function PUT(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const siret = String(body.siret ?? "").replace(/\D/g, "");
    if (siret.length !== 14) {
      return NextResponse.json({ error: "SIRET invalide." }, { status: 400 });
    }

    const existing = (await getArtisanProspects()).find((p) => p.siret === siret);
    const phoneRaw = body.phone != null ? String(body.phone).trim() : existing?.phone;
    if (phoneRaw && !normalizeFrenchMobile(phoneRaw)) {
      return NextResponse.json(
        { error: "Numéro de mobile français invalide." },
        { status: 400 }
      );
    }

    const prospect = await upsertArtisanProspect({
      siret,
      siren: existing?.siren ?? siret.slice(0, 9),
      companyName:
        String(body.companyName ?? existing?.companyName ?? "Entreprise").trim() ||
        "Entreprise",
      city: String(body.city ?? existing?.city ?? "").trim(),
      department: (body.department === "62" || existing?.department === "62"
        ? "62"
        : "59") as "59" | "62",
      nafCode: body.nafCode ?? existing?.nafCode,
      companyCreatedAt: body.companyCreatedAt ?? existing?.companyCreatedAt,
      phone: phoneRaw || undefined,
      source: existing?.source ?? "import",
      optedOut:
        typeof body.optedOut === "boolean" ? body.optedOut : existing?.optedOut,
      lastContactedAt: existing?.lastContactedAt,
      notes: body.notes != null ? String(body.notes) : existing?.notes,
      createdAt: existing?.createdAt,
    });

    return NextResponse.json({ prospect });
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
}
