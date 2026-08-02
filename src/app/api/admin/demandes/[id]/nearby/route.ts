import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  findNearbyBusinesses,
  getSmsEligibleBusinesses,
} from "@/lib/nearby-businesses";
import { readStore } from "@/lib/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await context.params;
  const store = await readStore();
  const request = store.workRequests.find((r) => r.id === id);

  if (!request) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  const { businesses, geoFound } = await findNearbyBusinesses({
    city: request.city,
    department: request.department,
    category: request.category,
  });

  const platformCount = businesses.filter((b) => b.source === "platform").length;
  const gouvCount = businesses.filter((b) => b.source === "gouv").length;
  const smsEligible = getSmsEligibleBusinesses(businesses);

  return NextResponse.json({
    requestId: id,
    city: request.city,
    department: request.department,
    category: request.category,
    geoFound,
    stats: {
      total: businesses.length,
      platform: platformCount,
      gouv: gouvCount,
      smsEligible: smsEligible.length,
    },
    businesses: businesses.slice(0, 50),
    note:
      "La base gouvernementale (INSEE / Annuaire des Entreprises) ne diffuse pas les numéros de mobile. Les SMS automatiques ciblent d'abord les artisans inscrits sur Artipascher.",
  });
}
