import {
  findNearbyBusinesses,
  getSmsEligibleBusinesses,
  type NearbyBusiness,
} from "./nearby-businesses";
import { sendSms } from "./sms";
import { absoluteUrl } from "./share";
import type { SmsCampaign, SmsCampaignRecipient, WorkRequest } from "./store-types";

export interface SmsCampaignPreview {
  workRequestId: string;
  category: string;
  city: string;
  department: "59" | "62";
  clientLabel: string;
  auctionUrl: string;
  defaultMessage: string;
  recipients: Array<{
    proId?: string;
    companyName: string;
    phone: string;
    city: string;
  }>;
  geoFound: boolean;
  totalNearby: number;
}

export function buildDefaultCampaignMessage(request: WorkRequest): string {
  const auctionPath = request.auctionId
    ? `/encheres/${request.auctionId}`
    : "/encheres";
  const url = absoluteUrl(auctionPath);
  return (
    `Artipascher : chantier ${request.category} a ${request.city} (${request.department}). ` +
    `Enchere ouverte — artisans du Nord : ${url}`
  );
}

export async function previewSmsCampaign(
  request: WorkRequest
): Promise<SmsCampaignPreview> {
  const { businesses, geoFound } = await findNearbyBusinesses({
    city: request.city,
    department: request.department,
    category: request.category,
  });

  const eligible = getSmsEligibleBusinesses(businesses);

  return {
    workRequestId: request.id,
    category: request.category,
    city: request.city,
    department: request.department,
    clientLabel: `${request.firstName} ${request.lastName.charAt(0)}.`,
    auctionUrl: absoluteUrl(
      request.auctionId ? `/encheres/${request.auctionId}` : "/encheres"
    ),
    defaultMessage: buildDefaultCampaignMessage(request),
    recipients: eligible.map((b) => ({
      proId: b.proId,
      companyName: b.name,
      phone: b.phone!,
      city: b.city,
    })),
    geoFound,
    totalNearby: businesses.length,
  };
}

function recipientFromBusiness(b: NearbyBusiness): SmsCampaignRecipient | null {
  if (!b.phone) return null;
  return {
    proId: b.proId,
    companyName: b.name,
    phone: b.phone,
    status: "skipped",
  };
}

export async function executeSmsCampaign(
  request: WorkRequest,
  message: string,
  options?: { demo?: boolean }
): Promise<Omit<SmsCampaign, "id" | "createdAt">> {
  const { businesses } = await findNearbyBusinesses({
    city: request.city,
    department: request.department,
    category: request.category,
  });

  const eligible = getSmsEligibleBusinesses(businesses);
  const recipients: SmsCampaignRecipient[] = eligible
    .map(recipientFromBusiness)
    .filter((r): r is SmsCampaignRecipient => r !== null);

  let sentCount = 0;
  let failedCount = 0;
  let demo = false;
  let status: SmsCampaign["status"] = "sent";

  for (const recipient of recipients) {
    const result = options?.demo
      ? { ok: true, demo: true }
      : await sendSms(recipient.phone, message);

    if (result.demo) demo = true;

    if (result.ok) {
      recipient.status = "sent";
      sentCount += 1;
    } else {
      recipient.status = "failed";
      recipient.error = result.error;
      failedCount += 1;
      status = "failed";
    }
  }

  if (recipients.length === 0) {
    status = "failed";
  } else if (sentCount === 0) {
    status = "failed";
  } else if (demo) {
    status = "demo";
  }

  return {
    workRequestId: request.id,
    category: request.category,
    city: request.city,
    department: request.department,
    message: message.trim(),
    status,
    recipientCount: recipients.length,
    sentCount,
    failedCount,
    recipients,
    sentAt: new Date().toISOString(),
  };
}
