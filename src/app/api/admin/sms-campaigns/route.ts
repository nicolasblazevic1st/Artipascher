import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { executeSmsCampaign } from "@/lib/sms-campaigns";
import { isDemoSmsAllowed, isSmsConfigured } from "@/lib/sms";
import {
  addSmsCampaign,
  getSmsCampaigns,
  getWorkRequestById,
  readStore,
} from "@/lib/store";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const campaigns = await getSmsCampaigns();
  const store = await readStore();

  const eligibleRequests = store.workRequests
    .filter((r) => r.status === "approved" || r.status === "pending")
    .map((r) => ({
      id: r.id,
      category: r.category,
      city: r.city,
      department: r.department,
      status: r.status,
      firstName: r.firstName,
      lastName: r.lastName,
      auctionId: r.auctionId,
      createdAt: r.createdAt,
    }));

  return NextResponse.json({
    campaigns,
    requests: eligibleRequests,
    smsConfigured: isSmsConfigured(),
    demoAllowed: isDemoSmsAllowed(),
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let workRequestId: string;
  let message: string;
  let demo = false;

  try {
    const body = await request.json();
    workRequestId = String(body.workRequestId ?? "").trim();
    message = String(body.message ?? "").trim();
    demo = body.demo === true;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!workRequestId || !message) {
    return NextResponse.json(
      { error: "Demande de travaux et message requis." },
      { status: 400 }
    );
  }

  const workRequest = await getWorkRequestById(workRequestId);
  if (!workRequest) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  const result = await executeSmsCampaign(workRequest, message, { demo });
  const campaign = await addSmsCampaign(result);

  return NextResponse.json({ campaign }, { status: 201 });
}
