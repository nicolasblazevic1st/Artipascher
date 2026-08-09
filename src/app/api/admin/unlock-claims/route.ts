import { NextRequest, NextResponse } from "next/server";
import {
  ANTI_CHURN_RETIRED,
  ANTI_CHURN_RETIRED_MESSAGE,
  retiredFeatureJson,
} from "@/lib/product-features";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { setClientContactBlock } from "@/lib/store";

/** File anti-churn retirée. Le blocage manuel client reste possible. */
export async function GET() {
  if (ANTI_CHURN_RETIRED) {
    return NextResponse.json({
      ...retiredFeatureJson(ANTI_CHURN_RETIRED_MESSAGE),
      claims: [],
    }, { status: 410 });
  }
  return NextResponse.json({ claims: [] });
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let action = "";
  let clientId = "";
  let blocked = false;
  let adminNote: string | undefined;

  try {
    const body = await request.json();
    action = String(body.action ?? "").trim();
    clientId = String(body.clientId ?? "").trim();
    blocked = body.blocked === true;
    adminNote =
      typeof body.adminNote === "string" ? body.adminNote.trim() : undefined;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  // Claims retirés ; seul le blocage manuel éventuel reste.
  if (action === "set_client_block") {
    if (!clientId) {
      return NextResponse.json({ error: "clientId requis." }, { status: 400 });
    }
    const result = await setClientContactBlock({
      clientId,
      blocked,
      adminNote,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...result });
  }

  return NextResponse.json(retiredFeatureJson(ANTI_CHURN_RETIRED_MESSAGE), {
    status: 410,
  });
}
