import { isStagingSite } from "@/lib/beta";
import { isSmsContactAlertsEnabled } from "@/lib/contact-slots";
import { isTestAccountEmail } from "@/lib/demo-banners";
import {
  createAppNotification,
  resolveClientUserIdForRequest,
} from "@/lib/store";
import type { WorkRequest } from "@/lib/store-types";
import { formatPrice } from "@/lib/data";
import { absoluteUrl } from "@/lib/share";
import { sendSms } from "@/lib/sms";

/** Numéro perso admin — surchargeable via ADMIN_SMS_PHONE, vide = désactivé. */
const DEFAULT_ADMIN_SMS_PHONE = "06 99 45 09 12";

export function getAdminSmsPhone(): string | null {
  const raw = process.env.ADMIN_SMS_PHONE;
  if (raw !== undefined && raw.trim() === "") return null;
  const phone = (raw ?? DEFAULT_ADMIN_SMS_PHONE).trim();
  return phone || null;
}

export { isSmsContactAlertsEnabled };

async function notifyClient(
  workRequest: WorkRequest,
  data: {
    kind: Parameters<typeof createAppNotification>[0]["kind"];
    title: string;
    body: string;
    href?: string;
  }
) {
  const userId = await resolveClientUserIdForRequest(workRequest);
  if (!userId) return;
  await createAppNotification({
    audience: "client",
    userId,
    kind: data.kind,
    title: data.title,
    body: data.body,
    href: data.href ?? `/particulier/espace/demandes/${workRequest.id}`,
  });
}

async function notifyPro(
  proId: string,
  data: {
    kind: Parameters<typeof createAppNotification>[0]["kind"];
    title: string;
    body: string;
    href: string;
  }
) {
  if (!proId) return;
  await createAppNotification({
    audience: "pro",
    userId: proId,
    kind: data.kind,
    title: data.title,
    body: data.body,
    href: data.href,
  });
}

export async function notifyClientContactInterest(params: {
  workRequest: WorkRequest;
  companyName: string;
  /** Acceptation auto (option alerte SMS client). */
  autoAccepted?: boolean;
  acceptedCount?: number;
  maxAccepted?: number;
}) {
  const { workRequest, companyName, autoAccepted } = params;
  const slots =
    params.acceptedCount != null && params.maxAccepted != null
      ? ` (${params.acceptedCount}/${params.maxAccepted} places contact)`
      : "";

  await notifyClient(workRequest, {
    kind: "contact_interest",
    title: autoAccepted
      ? "Un artisan peut vous contacter"
      : "Un artisan souhaite vous contacter",
    body: autoAccepted
      ? `${companyName} a demandé à vous contacter pour ${workRequest.category} à ${workRequest.city}${slots}. Votre alerte SMS était activée : l'accès est ouvert (déblocage crédit côté artisan).`
      : `${companyName} a manifesté son intérêt pour ${workRequest.category} à ${workRequest.city}. Vous avez 48 h pour répondre.`,
  });

  // SMS uniquement si l'option alerte client est active.
  if (!isSmsContactAlertsEnabled(workRequest)) return;

  const phone = workRequest.phone?.trim();
  if (!phone) {
    console.warn(
      "[notify] contact interest SMS skipped: no phone on request",
      workRequest.id
    );
    return;
  }

  const url = absoluteUrl(`/particulier/espace/demandes/${workRequest.id}`);
  const message = autoAccepted
    ? `Nord Artisan Pro : ${companyName} peut vous contacter pour ${workRequest.category} a ${workRequest.city}${slots}. Details : ${url}`
    : `Nord Artisan Pro : ${companyName} souhaite vous contacter pour ${workRequest.category} a ${workRequest.city}. ` +
      `Repondez sous 48h : ${url}`;

  const result = await sendSms(phone, message, "transactional");
  if (!result.ok) {
    console.error(
      "[notify] contact interest SMS failed",
      workRequest.id,
      result.error
    );
  } else if (result.demo) {
    console.info("[notify] contact interest SMS demo", workRequest.id);
  }
}

export async function notifyProContactDecision(params: {
  proId: string;
  decision: "accepted" | "refused";
  category: string;
  city: string;
  auctionId: string;
}) {
  await notifyPro(params.proId, {
    kind: params.decision === "accepted" ? "contact_accepted" : "contact_refused",
    title:
      params.decision === "accepted"
        ? "Demande de contact acceptée"
        : "Demande de contact refusée",
    body:
      params.decision === "accepted"
        ? `Le client a accepté votre intérêt pour ${params.category} à ${params.city}. Vous pouvez débloquer ses coordonnées.`
        : `Le client a refusé votre intérêt pour ${params.category} à ${params.city}.`,
    href: `/pro/encheres/${params.auctionId}`,
  });
}

export async function notifyProContactRecalled(params: {
  proId: string;
  category: string;
  city: string;
  auctionId: string;
}) {
  await notifyPro(params.proId, {
    kind: "contact_recalled",
    title: "Le client vous a rappelé",
    body: `Votre demande pour ${params.category} à ${params.city} est de nouveau en attente (48 h).`,
    href: `/pro/encheres/${params.auctionId}`,
  });
}

export async function notifyAdminNewWorkRequest(workRequest: WorkRequest) {
  if (isStagingSite()) return;
  if (workRequest.isTest || isTestAccountEmail(workRequest.email)) return;

  const phone = getAdminSmsPhone();
  if (!phone) return;

  const who = `${workRequest.firstName} ${workRequest.lastName}`.trim();
  const url = absoluteUrl("/admin/particuliers/demandes");
  const message =
    `Nord Artisan Pro : nouvelle demande a valider.\n` +
    `${workRequest.category} a ${workRequest.city} (${who}).\n` +
    url;

  const result = await sendSms(phone, message, "transactional");
  if (!result.ok) {
    console.error(
      "[notify] admin new request SMS failed",
      workRequest.id,
      result.error
    );
  } else if (result.demo) {
    console.info("[notify] admin new request SMS demo", workRequest.id);
  }
}

export async function notifyClientRequestReviewed(params: {
  workRequest: WorkRequest;
  status: "approved" | "rejected";
}) {
  await notifyClient(params.workRequest, {
    kind: params.status === "approved" ? "request_approved" : "request_rejected",
    title:
      params.status === "approved"
        ? "Votre demande est validée"
        : "Votre demande a été refusée",
    body:
      params.status === "approved"
        ? `Votre chantier ${params.workRequest.category} à ${params.workRequest.city} est publié : les artisans correspondants peuvent vous contacter.`
        : `Votre demande ${params.workRequest.category} à ${params.workRequest.city} n'a pas été validée.`,
  });
}

export async function notifyClientQuoteSubmitted(params: {
  workRequest: WorkRequest;
  companyName: string;
  amount: number;
}) {
  await notifyClient(params.workRequest, {
    kind: "quote_submitted",
    title: "Nouveau devis reçu",
    body: `${params.companyName} a déposé un devis de ${formatPrice(params.amount)} (en validation).`,
    href: `/particulier/espace/offres`,
  });
}

export async function notifyQuoteReviewed(params: {
  proId: string;
  workRequest: WorkRequest;
  status: "approved" | "rejected";
  amount: number;
  submittedByClientId?: string;
}) {
  const label = `${params.workRequest.category} · ${params.workRequest.city}`;
  await notifyPro(params.proId, {
    kind: params.status === "approved" ? "quote_approved" : "quote_rejected",
    title:
      params.status === "approved" ? "Devis validé" : "Devis refusé",
    body:
      params.status === "approved"
        ? `Votre devis de ${formatPrice(params.amount)} pour ${label} est publié.`
        : `Votre devis de ${formatPrice(params.amount)} pour ${label} a été refusé.`,
    href: `/pro/mes-devis`,
  });

  if (params.submittedByClientId) {
    await createAppNotification({
      audience: "client",
      userId: params.submittedByClientId,
      kind: params.status === "approved" ? "quote_approved" : "quote_rejected",
      title:
        params.status === "approved"
          ? "Prix validé"
          : "Prix refusé",
      body:
        params.status === "approved"
          ? `Le prix de ${formatPrice(params.amount)} pour ${label} est validé.`
          : `Le prix de ${formatPrice(params.amount)} pour ${label} a été refusé.`,
      href: `/particulier/espace/offres`,
    });
  } else {
    await notifyClient(params.workRequest, {
      kind: params.status === "approved" ? "quote_approved" : "quote_rejected",
      title:
        params.status === "approved"
          ? "Devis artisan validé"
          : "Devis artisan refusé",
      body:
        params.status === "approved"
          ? `Un devis de ${formatPrice(params.amount)} pour ${label} est disponible.`
          : `Un devis pour ${label} a été refusé par notre équipe.`,
      href: `/particulier/espace/offres`,
    });
  }
}

export async function notifyClientBidPlaced(params: {
  workRequest: WorkRequest;
  companyName: string;
  amount: number;
}) {
  await notifyClient(params.workRequest, {
    kind: "bid_placed",
    title: "Nouvelle proposition reçue",
    body: `${params.companyName} propose ${formatPrice(params.amount)}.`,
  });
}

export async function notifyProArtisanSelected(params: {
  proId: string;
  category: string;
  city: string;
  auctionId: string;
  amount?: number;
}) {
  await notifyPro(params.proId, {
    kind: "artisan_selected",
    title: "Vous avez été retenu",
    body: `Le client vous a choisi pour ${params.category} à ${params.city}${
      params.amount != null ? ` (${formatPrice(params.amount)})` : ""
    }.`,
    href: `/pro/encheres/${params.auctionId}`,
  });
}
