import { proCoversTradeCategory } from "@/lib/pro-trades";
import { absoluteUrl } from "@/lib/share";
import {
  applyPlaceholders,
  isDemoMarketingEmailAllowed,
  isMarketingEmailConfigured,
  sendMarketingEmail,
} from "@/lib/email-marketing";
import { normalizeMarketingEmail } from "@/lib/email-unsubscribe";
import {
  addEmailCampaign,
  getWorkRequestById,
  readStore,
  updateEmailCampaign,
} from "@/lib/store";
import type {
  DataStore,
  EmailCampaign,
  EmailCampaignAudience,
  EmailCampaignRecipient,
  ProRegistration,
  WorkRequest,
} from "@/lib/store-types";

export const EMAIL_CAMPAIGN_MAX = 500;
const SEND_THROTTLE_MS = 80;

export interface EmailCampaignDraftRecipient {
  email: string;
  companyName: string;
  siret?: string;
  proId?: string;
  city?: string;
  department?: "59" | "62";
}

export function defaultEmailSubject(request?: WorkRequest | null): string {
  if (!request) {
    return "Nord Artisan Pro — chantiers près de chez vous";
  }
  return `Chantier ${request.category} à ${request.city} — Nord Artisan Pro`;
}

export function defaultEmailBody(request?: WorkRequest | null): string {
  if (!request) {
    return [
      "Bonjour {{companyName}},",
      "",
      "Nord Artisan Pro met en relation des particuliers du Nord et du Pas-de-Calais avec des artisans vérifiés (RCS).",
      "",
      "Découvrir les chantiers : {{url}}",
      "",
      "Cordialement,",
      "L'équipe Nord Artisan Pro",
    ].join("\n");
  }
  return [
    "Bonjour {{companyName}},",
    "",
    `Un particulier a publié une demande de {{category}} à {{city}} ({{department}}).`,
    "",
    "Voir le chantier : {{url}}",
    "",
    "Cordialement,",
    "L'équipe Nord Artisan Pro",
  ].join("\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function optedOutEmails(store: DataStore): Set<string> {
  const set = new Set(
    (store.emailMarketingOptOuts ?? []).map((o) => o.email.toLowerCase())
  );
  for (const pro of store.proRegistrations) {
    if (pro.marketingEmailOptedOut) {
      set.add(pro.email.trim().toLowerCase());
    }
  }
  return set;
}

function placeholderVars(
  recipient: EmailCampaignDraftRecipient,
  request?: WorkRequest | null
): Record<string, string> {
  const url = request?.auctionId
    ? absoluteUrl(`/offres/${request.auctionId}`)
    : absoluteUrl("/professionnel#inscription");
  return {
    companyName: recipient.companyName || "Madame, Monsieur",
    city: recipient.city || request?.city || "",
    department: recipient.department || request?.department || "",
    category: request?.category || "",
    url,
  };
}

export async function listPlatformEmailTargets(filters: {
  department?: "59" | "62" | "all";
  category?: string;
  workRequest?: WorkRequest | null;
}): Promise<EmailCampaignDraftRecipient[]> {
  const store = await readStore();
  const blocked = optedOutEmails(store);
  const request = filters.workRequest ?? null;
  let department: "59" | "62" | undefined;
  if (filters.department === "all") department = undefined;
  else if (filters.department === "59" || filters.department === "62") {
    department = filters.department;
  } else if (request) {
    department = request.department;
  }
  const category = filters.category?.trim() || request?.category || "";

  const out: EmailCampaignDraftRecipient[] = [];
  for (const pro of store.proRegistrations) {
    if (pro.status !== "approved") continue;
    if (pro.isTestAccount) continue;
    const email = normalizeMarketingEmail(pro.email);
    if (!email || blocked.has(email)) continue;
    if (department && pro.department !== department) continue;
    if (category && !proCoversTradeCategory(pro, category)) continue;
    out.push(toDraft(pro, email));
  }
  return out;
}

function toDraft(
  pro: ProRegistration,
  email: string
): EmailCampaignDraftRecipient {
  return {
    email,
    companyName: pro.companyName,
    siret: pro.siret,
    proId: pro.id,
    city: pro.city,
    department: pro.department,
  };
}

export function parseCsvRecipients(raw: string): EmailCampaignDraftRecipient[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const out: EmailCampaignDraftRecipient[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const parts = line.split(/[;,]/).map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length === 0) continue;
    const maybeHeader = parts.map((p) => p.toLowerCase());
    const looksHeader =
      out.length === 0 &&
      seen.size === 0 &&
      !parts.some((p) => p.includes("@")) &&
      maybeHeader.some((p) => p === "email");
    if (looksHeader) continue;
    let email = "";
    let companyName = "";
    let siret = "";
    let city = "";
    for (const part of parts) {
      const normalized = normalizeMarketingEmail(part);
      if (normalized && !email) {
        email = normalized;
        continue;
      }
      if (/^\d{14}$/.test(part.replace(/\s/g, "")) && !siret) {
        siret = part.replace(/\s/g, "");
        continue;
      }
      if (!companyName) companyName = part;
      else if (!city) city = part;
    }
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push({
      email,
      companyName: companyName || email,
      siret: siret || undefined,
      city: city || undefined,
    });
    if (out.length >= EMAIL_CAMPAIGN_MAX) break;
  }
  return out;
}

export async function previewEmailCampaign(params: {
  audience: EmailCampaignAudience;
  department?: "59" | "62" | "all";
  category?: string;
  workRequestId?: string;
  csv?: string;
  subject?: string;
  bodyText?: string;
}): Promise<{
  audience: EmailCampaignAudience;
  subject: string;
  bodyText: string;
  workRequestId?: string;
  category?: string;
  department?: "59" | "62" | "all";
  recipients: EmailCampaignDraftRecipient[];
  optedOutSkipped: number;
}> {
  let request: WorkRequest | null = null;
  if (params.workRequestId) {
    request = (await getWorkRequestById(params.workRequestId)) ?? null;
  }

  let recipients: EmailCampaignDraftRecipient[] = [];
  let optedOutSkipped = 0;
  const store = await readStore();
  const blocked = optedOutEmails(store);

  if (params.audience === "csv") {
    const parsed = parseCsvRecipients(params.csv ?? "");
    for (const row of parsed) {
      if (blocked.has(row.email)) {
        optedOutSkipped += 1;
        continue;
      }
      recipients.push(row);
    }
  } else {
    recipients = await listPlatformEmailTargets({
      department: params.department,
      category: params.category,
      workRequest: params.audience === "work_request" ? request : null,
    });
  }

  const unique = new Map<string, EmailCampaignDraftRecipient>();
  for (const row of recipients) {
    unique.set(row.email, row);
  }
  recipients = [...unique.values()].slice(0, EMAIL_CAMPAIGN_MAX);

  return {
    audience: params.audience,
    subject: params.subject?.trim() || defaultEmailSubject(request),
    bodyText: params.bodyText?.trim() || defaultEmailBody(request),
    workRequestId: request?.id,
    category: params.category || request?.category,
    department: params.department,
    recipients,
    optedOutSkipped,
  };
}

export async function sendEmailCampaign(params: {
  audience: EmailCampaignAudience;
  department?: "59" | "62" | "all";
  category?: string;
  workRequestId?: string;
  csv?: string;
  subject?: string;
  bodyText?: string;
  recipientEmails?: string[];
  demo?: boolean;
}): Promise<{ campaign: EmailCampaign }> {
  const demo = params.demo === true;
  if (!demo && !isMarketingEmailConfigured()) {
    throw new Error(
      "Envoi marketing impossible : configurez BREVO_API_KEY (le SMTP OVH MX Plan n'accepte pas les mails de masse)."
    );
  }
  if (demo && !isDemoMarketingEmailAllowed()) {
    throw new Error("Mode démo indisponible quand Brevo est actif en production.");
  }

  const preview = await previewEmailCampaign(params);
  let targets = preview.recipients;
  if (params.recipientEmails?.length) {
    const allow = new Set(
      params.recipientEmails
        .map((e) => normalizeMarketingEmail(e))
        .filter((e): e is string => Boolean(e))
    );
    targets = targets.filter((r) => allow.has(r.email));
  }
  if (targets.length === 0) {
    throw new Error("Aucun destinataire email (inscrits avec email, ou CSV).");
  }

  const request = params.workRequestId
    ? await getWorkRequestById(params.workRequestId)
    : null;

  const campaign = await addEmailCampaign({
    subject: preview.subject,
    bodyText: preview.bodyText,
    status: demo ? "demo" : "sent",
    audience: preview.audience,
    workRequestId: preview.workRequestId,
    category: preview.category,
    department: preview.department,
    recipientCount: targets.length,
    sentCount: 0,
    failedCount: 0,
    skippedCount: preview.optedOutSkipped,
    recipients: [],
  });

  const results: EmailCampaignRecipient[] = [];
  let sentCount = 0;
  let failedCount = 0;

  const blocked = optedOutEmails(await readStore());
  for (const target of targets) {
    if (blocked.has(target.email)) {
      results.push({
        ...target,
        status: "skipped",
        error: "Désinscrit",
      });
      continue;
    }
    const vars = placeholderVars(target, request);
    const subject = applyPlaceholders(preview.subject, vars);
    const text = applyPlaceholders(preview.bodyText, vars);
    const result = demo
      ? { ok: true, demo: true, providerId: "demo" }
      : await sendMarketingEmail({
          to: target.email,
          toName: target.companyName,
          subject,
          text,
        });
    if (result.ok) {
      sentCount += 1;
      results.push({ ...target, status: "sent" });
    } else {
      failedCount += 1;
      results.push({
        ...target,
        status: "failed",
        error: result.error,
      });
    }
    if (!demo) await sleep(SEND_THROTTLE_MS);
  }

  const status: EmailCampaign["status"] = demo
    ? "demo"
    : failedCount === 0
      ? "sent"
      : sentCount === 0
        ? "failed"
        : "partial";

  const updated = await updateEmailCampaign(campaign.id, {
    status,
    sentCount,
    failedCount,
    skippedCount: preview.optedOutSkipped + results.filter((r) => r.status === "skipped").length,
    recipientCount: results.length,
    recipients: results,
    sentAt: new Date().toISOString(),
  });

  return { campaign: updated ?? { ...campaign, status, sentCount, failedCount, recipients: results } };
}
