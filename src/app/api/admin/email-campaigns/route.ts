import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  isDemoMarketingEmailAllowed,
  isMarketingEmailConfigured,
} from "@/lib/email-marketing";
import { sendEmailCampaign } from "@/lib/email-campaigns";
import {
  getEmailCampaigns,
  getEmailMarketingOptOuts,
  getWorkRequestById,
  readStore,
} from "@/lib/store";
import { getSmsProviderStatus } from "@/lib/sms";
import type { EmailCampaignAudience } from "@/lib/store-types";

export const maxDuration = 180;

function parseAudience(value: unknown): EmailCampaignAudience {
  if (value === "work_request" || value === "csv" || value === "platform") {
    return value;
  }
  return "platform";
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const [campaigns, optOuts, store, sms] = await Promise.all([
    getEmailCampaigns(),
    getEmailMarketingOptOuts(),
    readStore(),
    getSmsProviderStatus(),
  ]);

  const eligibleRequests = store.workRequests
    .filter((r) => (r.status === "approved" || r.status === "pending") && !r.isTest)
    .map((r) => ({
      id: r.id,
      category: r.category,
      city: r.city,
      department: r.department,
      status: r.status,
      auctionId: r.auctionId,
      createdAt: r.createdAt,
    }));

  return NextResponse.json({
    campaigns,
    optOutCount: optOuts.length,
    requests: eligibleRequests,
    marketingEmailConfigured: isMarketingEmailConfigured(),
    demoAllowed: isDemoMarketingEmailAllowed(),
    sms,
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let audience: EmailCampaignAudience = "platform";
  let department: "59" | "62" | "all" | undefined;
  let category = "";
  let workRequestId = "";
  let csv = "";
  let subject = "";
  let bodyText = "";
  let demo = false;
  let recipientEmails: string[] | undefined;

  try {
    const body = await request.json();
    audience = parseAudience(body.audience);
    if (body.department === "59" || body.department === "62" || body.department === "all") {
      department = body.department;
    }
    category = String(body.category ?? "").trim();
    workRequestId = String(body.workRequestId ?? "").trim();
    csv = String(body.csv ?? "");
    subject = String(body.subject ?? "").trim();
    bodyText = String(body.bodyText ?? "").trim();
    demo = body.demo === true;
    if (Array.isArray(body.recipientEmails)) {
      recipientEmails = body.recipientEmails.map((e: unknown) => String(e ?? ""));
    }
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (audience === "work_request") {
    if (!workRequestId) {
      return NextResponse.json(
        { error: "Demande de travaux requise." },
        { status: 400 }
      );
    }
    const wr = await getWorkRequestById(workRequestId);
    if (!wr) {
      return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
    }
  }

  try {
    const result = await sendEmailCampaign({
      audience,
      department,
      category: category || undefined,
      workRequestId: workRequestId || undefined,
      csv: csv || undefined,
      subject: subject || undefined,
      bodyText: bodyText || undefined,
      recipientEmails,
      demo,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Envoi impossible." },
      { status: 400 }
    );
  }
}
