import { NextRequest, NextResponse } from "next/server";
import {
  ALLOWED_DEPARTMENTS,
  isAllowedDepartment,
  verifyWithRegistry,
} from "@/lib/rcs";

export async function POST(request: NextRequest) {
  let body: { siret?: string; requireNord?: boolean };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { valid: false, error: "Requête invalide." },
      { status: 400 }
    );
  }

  const { siret, requireNord = true } = body;

  if (!siret) {
    return NextResponse.json(
      { valid: false, error: "Le numéro SIRET est obligatoire." },
      { status: 400 }
    );
  }

  const result = await verifyWithRegistry(siret);

  if (!result.valid) {
    return NextResponse.json(result, { status: 422 });
  }

  if (requireNord && !isAllowedDepartment(result.department)) {
    return NextResponse.json(
      {
        ...result,
        valid: false,
        error: `Nord Artisan Pro est réservé aux entreprises du Nord (départements ${ALLOWED_DEPARTMENTS.join(" et ")}). Siège détecté : ${result.department ?? "inconnu"}.`,
      },
      { status: 422 }
    );
  }

  return NextResponse.json({
    ...result,
    message: "Entreprise vérifiée au registre du commerce (RCS).",
  });
}
