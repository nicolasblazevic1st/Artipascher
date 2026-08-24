import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  remainingSmsQuota,
  resolveMaxContactArtisans,
  smsQuotaForRequest,
} from "@/lib/contact-slots";
import {
  approvePendingReviewBatch,
  discardPendingReviewBatch,
  setPendingBatchAutoSend,
  pauseAcquisitionCampaign,
  resumeAcquisitionCampaign,
  runAcquisitionCampaignTick,
  parseRecipientDrafts,
  startAcquisitionCampaign,
} from "@/lib/sms-campaigns";
import { isDemoSmsAllowed, isSmsConfigured } from "@/lib/sms";
import {
  countAcceptedArtisansForAuction,
  getPendingReviewSmsCampaigns,
  getSmsAcquisitionCampaigns,
  getSmsCampaigns,
  getSmsSettings,
  getWorkRequestById,
  parisDayKey,
  readStore,
  updateSmsSettings,
} from "@/lib/store";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const campaigns = await getSmsCampaigns();
  const pendingReview = await getPendingReviewSmsCampaigns();
  const acquisitions = await getSmsAcquisitionCampaigns();
  const store = await readStore();
  const settings = await getSmsSettings();
  const day = parisDayKey();

  const acquisitionRows = await Promise.all(
    acquisitions.map(async (a) => {
      const wr = store.workRequests.find((r) => r.id === a.workRequestId);
      const acceptedCount = wr?.auctionId
        ? await countAcceptedArtisansForAuction(wr.auctionId)
        : 0;
      const sentToday = a.lastSendDate === day ? a.sentOnLastDate : 0;
      return {
        ...a,
        category: wr?.category,
        city: wr?.city,
        department: wr?.department,
        auctionId: wr?.auctionId,
        acceptedCount,
        maxAccepted: resolveMaxContactArtisans(wr),
        smsQuota: smsQuotaForRequest(wr),
        remainingSms: remainingSmsQuota(wr, a.totalSent),
        sentToday,
      };
    })
  );

  const eligibleRequests = store.workRequests
    .filter((r) => {
      const listed = r.status === "approved" || r.status === "pending";
      return listed && r.isTest !== true;
    })
    .map((r) => {
      return {
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
        maxContactArtisans: resolveMaxContactArtisans(r),
        smsQuota: smsQuotaForRequest(r),
      };
    });

  return NextResponse.json({
    campaigns,
    pendingReview,
    acquisitions: acquisitionRows,
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
    const smsPerDayRaw =
      typeof body.smsPerDay === "number"
        ? body.smsPerDay
        : typeof body.defaultCampaignSize === "number"
          ? body.defaultCampaignSize
          : undefined;
    const settings = await updateSmsSettings({
      autoSendOnApprove:
        typeof body.autoSendOnApprove === "boolean"
          ? body.autoSendOnApprove
          : undefined,
      requireReviewBeforeSend:
        typeof body.requireReviewBeforeSend === "boolean"
          ? body.requireReviewBeforeSend
          : undefined,
      smsPerDay:
        typeof smsPerDayRaw === "number"
          ? Math.max(1, Math.min(200, Math.floor(smsPerDayRaw)))
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

  let workRequestId = "";
  let acquisitionId = "";
  let message = "";
  let demo = false;
  let autoSend: boolean | undefined;
  let action:
    | "start"
    | "tick"
    | "pause"
    | "resume"
    | "approve"
    | "discard"
    | "auto-send" = "start";
  let smsPerDay: number | undefined;
  let batchId = "";
  let recipientSirets: string[] | undefined;
  let recipientDrafts: ReturnType<typeof parseRecipientDrafts> | undefined;

  try {
    const body = await request.json();
    action =
      body.action === "tick" ||
      body.action === "pause" ||
      body.action === "resume" ||
      body.action === "approve" ||
      body.action === "discard" ||
      body.action === "auto-send"
        ? body.action
        : "start";
    workRequestId = String(body.workRequestId ?? "").trim();
    acquisitionId = String(body.acquisitionId ?? "").trim();
    batchId = String(body.batchId ?? "").trim();
    message = String(body.message ?? "").trim();
    demo = body.demo === true;
    if (typeof body.autoSend === "boolean") autoSend = body.autoSend;
    if (typeof body.smsPerDay === "number") {
      smsPerDay = Math.max(1, Math.min(200, Math.floor(body.smsPerDay)));
    }
    if (Array.isArray(body.recipientSirets)) {
      recipientSirets = body.recipientSirets
        .map((s: unknown) => String(s ?? "").trim())
        .filter(Boolean);
    }
    if (Array.isArray(body.recipients)) {
      recipientDrafts = parseRecipientDrafts(body.recipients);
    }
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (action === "auto-send") {
    if (!batchId) {
      return NextResponse.json({ error: "batchId requis." }, { status: 400 });
    }
    if (typeof autoSend !== "boolean") {
      return NextResponse.json({ error: "autoSend requis." }, { status: 400 });
    }
    try {
      const batch = await setPendingBatchAutoSend(batchId, autoSend);
      return NextResponse.json({ batch });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Mise à jour impossible." },
        { status: 400 }
      );
    }
  }

  if (action === "discard") {
    if (!batchId) {
      return NextResponse.json({ error: "batchId requis." }, { status: 400 });
    }
    try {
      const batch = await discardPendingReviewBatch(batchId);
      return NextResponse.json({ batch });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Suppression impossible." },
        { status: 400 }
      );
    }
  }

  if (action === "approve") {
    if (!batchId) {
      return NextResponse.json({ error: "batchId requis." }, { status: 400 });
    }
    if (!demo && !isSmsConfigured()) {
      return NextResponse.json(
        { error: "OVH SMS non configuré. Impossible d’envoyer pour de vrai." },
        { status: 503 }
      );
    }
    try {
      const result = await approvePendingReviewBatch(batchId, { demo });
      return NextResponse.json({ result });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Validation impossible." },
        { status: 400 }
      );
    }
  }

  if (action === "pause" || action === "resume") {
    if (!acquisitionId) {
      return NextResponse.json(
        { error: "acquisitionId requis." },
        { status: 400 }
      );
    }
    const acquisition =
      action === "pause"
        ? await pauseAcquisitionCampaign(acquisitionId)
        : await resumeAcquisitionCampaign(acquisitionId);
    if (!acquisition) {
      return NextResponse.json(
        { error: "Campagne introuvable ou statut invalide." },
        { status: 404 }
      );
    }
    return NextResponse.json({ acquisition });
  }

  if (action === "tick") {
    if (!acquisitionId) {
      return NextResponse.json(
        { error: "acquisitionId requis." },
        { status: 400 }
      );
    }
    {
      const settings = await getSmsSettings();
      const reviewOnly = settings.requireReviewBeforeSend && !demo;
      if (!demo && !reviewOnly && !isSmsConfigured()) {
        return NextResponse.json(
          {
            error:
              "OVH SMS non configuré. Activez la validation avant envoi, ou le mode démo.",
          },
          { status: 503 }
        );
      }
    }
    try {
      const result = await runAcquisitionCampaignTick(acquisitionId, {
        demo,
        message: message || undefined,
      });
      return NextResponse.json({ result });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Tick impossible." },
        { status: 400 }
      );
    }
  }

  // start
  if (!workRequestId) {
    return NextResponse.json(
      { error: "Demande de travaux requise." },
      { status: 400 }
    );
  }

  const workRequest = await getWorkRequestById(workRequestId);
  if (!workRequest) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  const settings = await getSmsSettings();
  const reviewOnly = settings.requireReviewBeforeSend && !demo;
  if (!demo && !reviewOnly && !isSmsConfigured()) {
    return NextResponse.json(
      { error: "OVH SMS non configuré. Activez la validation avant envoi, ou le mode démo." },
      { status: 503 }
    );
  }

  try {
    const result = await startAcquisitionCampaign(workRequest, {
      demo,
      message: message || undefined,
      trigger: "manual",
      smsPerDay,
      recipientSirets,
      drafts: recipientDrafts,
    });
    return NextResponse.json({ result }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Démarrage impossible." },
      { status: 400 }
    );
  }
}
