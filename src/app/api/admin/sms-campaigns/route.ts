import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  executeSmsCampaignToRecipients,
  previewSmsCampaignDetailed,
} from "@/lib/sms-campaigns";
import { isDemoSmsAllowed, isSmsConfigured } from "@/lib/sms";
import {
  getSmsCampaigns,
  getSmsSettings,
  getWorkRequestById,
  readStore,
  updateSmsSettings,
} from "@/lib/store";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const campaigns = await getSmsCampaigns();
  const store = await readStore();
  const settings = await getSmsSettings();

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
      companyName: r.companyName,
      clientKind: r.clientKind,
      auctionId: r.auctionId,
      createdAt: r.createdAt,
    }));

  return NextResponse.json({
    campaigns,
    requests: eligibleRequests,
    settings,
    smsConfigured: isSmsConfigured(),
    demoAllowed: isDemoSmsAllowed(),
  });
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const settings = await updateSmsSettings({
      autoSendOnApprove:
        typeof body.autoSendOnApprove === "boolean"
          ? body.autoSendOnApprove
          : undefined,
      defaultCampaignSize:
        typeof body.defaultCampaignSize === "number"
          ? Math.max(1, Math.min(200, Math.floor(body.defaultCampaignSize)))
          : undefined,
      throttleMs:
        typeof body.throttleMs === "number"
          ? Math.max(0, Math.min(5000, Math.floor(body.throttleMs)))
          : undefined,
      defaultMessageTemplate:
        typeof body.defaultMessageTemplate === "string"
          ? body.defaultMessageTemplate
          : undefined,
    });
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let workRequestId: string;
  let message: string;
  let demo = false;
  let recipientSirets: string[] = [];

  try {
    const body = await request.json();
    workRequestId = String(body.workRequestId ?? "").trim();
    message = String(body.message ?? "").trim();
    demo = body.demo === true;
    recipientSirets = Array.isArray(body.recipientSirets)
      ? body.recipientSirets.map((s: unknown) => String(s).trim()).filter(Boolean)
      : [];
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!workRequestId || !message) {
    return NextResponse.json(
      { error: "Demande de travaux et message requis." },
      { status: 400 }
    );
  }

  if (recipientSirets.length === 0) {
    return NextResponse.json(
      { error: "Sélectionnez au moins une entreprise destinataire." },
      { status: 400 }
    );
  }

  const workRequest = await getWorkRequestById(workRequestId);
  if (!workRequest) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  if (!demo && !isSmsConfigured()) {
    return NextResponse.json(
      { error: "OVH SMS non configuré. Utilisez la simulation démo." },
      { status: 503 }
    );
  }

  const campaign = await executeSmsCampaignToRecipients(
    workRequest,
    message,
    recipientSirets,
    { demo, trigger: "manual" }
  );

  return NextResponse.json({ campaign }, { status: 201 });
}
