import { NextRequest, NextResponse } from "next/server";
import type { TradeCategory } from "@/lib/data";
import { hashPassword, validatePassword } from "@/lib/password";
import { addProRegistration } from "@/lib/store";

const CATEGORY_MAP: Record<string, TradeCategory> = {
  Peinture: "peinture",
  Plomberie: "plomberie",
  Électricité: "electricite",
  Maçonnerie: "maconnerie",
  Menuiserie: "menuiserie",
  Carrelage: "carrelage",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyName,
      siret,
      siren,
      email,
      phone,
      city,
      department,
      category,
      zone,
      rcsVerified,
      password,
    } = body;

    if (!rcsVerified || !siret || !email || !password) {
      return NextResponse.json(
        { error: "SIRET RCS vérifié, email et mot de passe obligatoires." },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const entry = await addProRegistration({
      companyName,
      siret,
      siren: siren ?? siret.slice(0, 9),
      email: email.trim(),
      phone: phone ?? "",
      city: city ?? "",
      department: department === "62" ? "62" : "59",
      category: CATEGORY_MAP[category] ?? "peinture",
      zone: zone ?? "",
      rcsVerified: true,
      passwordHash: hashPassword(password),
    });

    return NextResponse.json({ success: true, id: entry.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_USED") {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
