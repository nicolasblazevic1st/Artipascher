import { createHash, randomBytes } from "crypto";
import { isBrevoSmsConfigured, sendBrevoSms } from "@/lib/brevo";
import {
  formatFrenchPhoneDisplay,
  normalizeFrenchMobile,
  normalizeFrenchPhone,
} from "@/lib/phone-format";

export {
  formatFrenchPhoneDisplay,
  normalizeFrenchMobile,
  normalizeFrenchPhone,
};

/**
 * - transactional : OTP, alertes contact client — pas de STOP (usage lié à une action).
 * - marketing : campagnes / prospection — STOP obligatoire + horaires FR.
 */
export type SmsPurpose = "transactional" | "marketing";

export interface SendSmsResult {
  ok: boolean;
  demo: boolean;
  error?: string;
  providerId?: string;
}

export function isSmsConfigured(): boolean {
  return (
    process.env.OVH_SMS_ENABLED?.trim() === "true" &&
    Boolean(process.env.OVH_APP_KEY?.trim()) &&
    Boolean(process.env.OVH_APP_SECRET?.trim()) &&
    Boolean(process.env.OVH_CONSUMER_KEY?.trim()) &&
    Boolean(process.env.OVH_SMS_SERVICE_NAME?.trim())
  );
}

export function isDemoSmsAllowed(): boolean {
  return (
    process.env.OVH_SMS_ENABLED?.trim() !== "true" ||
    process.env.NODE_ENV === "development"
  );
}

/**
 * Fenêtre légale indicative FR pour SMS commerciaux :
 * lun–sam, 8h–20h (Europe/Paris). Dimanche = hors fenêtre.
 * Les jours fériés ne sont pas listés ici (contrôle manuel / admin).
 */
export function isMarketingSmsWindowOpen(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hourRaw = parts.find((p) => p.type === "hour")?.value ?? "0";
  const hour = Number(hourRaw === "24" ? "0" : hourRaw);

  if (weekday === "Sun") return false;
  if (!Number.isFinite(hour)) return false;
  return hour >= 8 && hour < 20;
}

function ovhSignature(
  appSecret: string,
  consumerKey: string,
  method: string,
  url: string,
  body: string,
  timestamp: number
): string {
  const toSign = [appSecret, consumerKey, method, url, body, String(timestamp)].join("+");
  return `$1$${createHash("sha1").update(toSign).digest("hex")}`;
}

async function ovhRequest(
  method: "GET" | "POST",
  path: string,
  body = ""
): Promise<{ ok: boolean; status: number; text: string }> {
  const appKey = process.env.OVH_APP_KEY!;
  const appSecret = process.env.OVH_APP_SECRET!;
  const consumerKey = process.env.OVH_CONSUMER_KEY!;
  const url = `https://eu.api.ovh.com/1.0${path}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = ovhSignature(
    appSecret,
    consumerKey,
    method,
    url,
    body,
    timestamp
  );
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Ovh-Application": appKey,
      "X-Ovh-Consumer": consumerKey,
      "X-Ovh-Timestamp": String(timestamp),
      "X-Ovh-Signature": signature,
    },
    body: method === "GET" ? undefined : body,
  });
  return {
    ok: response.ok,
    status: response.status,
    text: await response.text(),
  };
}

let smsCreditsCache: { at: number; left: number | null } | null = null;
const SMS_CREDITS_CACHE_MS = 20_000;

async function getOvhSmsCreditsLeft(): Promise<number | null> {
  const now = Date.now();
  if (
    smsCreditsCache &&
    now - smsCreditsCache.at < SMS_CREDITS_CACHE_MS
  ) {
    return smsCreditsCache.left;
  }
  const serviceName = process.env.OVH_SMS_SERVICE_NAME?.trim();
  if (!serviceName) return null;
  try {
    const result = await ovhRequest("GET", `/sms/${serviceName}`);
    if (!result.ok) {
      smsCreditsCache = { at: now, left: null };
      return null;
    }
    const parsed = JSON.parse(result.text) as { creditsLeft?: number };
    const left =
      typeof parsed.creditsLeft === "number" ? parsed.creditsLeft : null;
    smsCreditsCache = { at: now, left };
    return left;
  } catch {
    smsCreditsCache = { at: now, left: null };
    return null;
  }
}

export async function getOvhSmsCredits(): Promise<number | null> {
  if (!isSmsConfigured()) return null;
  return getOvhSmsCreditsLeft();
}

export function isAnySmsProviderConfigured(): boolean {
  return isSmsConfigured() || isBrevoSmsConfigured();
}

export async function getSmsProviderStatus(): Promise<{
  ovhConfigured: boolean;
  brevoConfigured: boolean;
  canSend: boolean;
  ovhCreditsLeft: number | null;
}> {
  const ovhConfigured = isSmsConfigured();
  const brevoConfigured = isBrevoSmsConfigured();
  return {
    ovhConfigured,
    brevoConfigured,
    canSend: ovhConfigured || brevoConfigured,
    ovhCreditsLeft: ovhConfigured ? await getOvhSmsCreditsLeft() : null,
  };
}

/** False = OTP SMS impossible (plus de crédit, OVH en erreur, non configuré). */
export async function isTransactionalSmsAvailable(): Promise<boolean> {
  if (isSmsConfigured()) {
    const left = await getOvhSmsCreditsLeft();
    if (left != null && left > 0) return true;
  }
  if (isBrevoSmsConfigured()) return true;
  return isDemoSmsAllowed();
}

type OvhJobsResponse = {
  ids?: number[];
  validReceivers?: string[];
  invalidReceivers?: string[];
};

async function sendViaOvhJobs(params: {
  receivers: string[];
  message: string;
  purpose: SmsPurpose;
  tag?: string;
}): Promise<{
  ok: boolean;
  error?: string;
  validReceivers: string[];
  invalidReceivers: string[];
  ids: string[];
}> {
  const serviceName = process.env.OVH_SMS_SERVICE_NAME!;
  const sender = process.env.OVH_SMS_SENDER ?? "NordArtPro";
  const noStopClause = params.purpose === "transactional";
  const bodyObj: Record<string, unknown> = {
    message: params.message,
    receivers: params.receivers,
    sender,
    noStopClause,
  };
  if (params.tag?.trim()) bodyObj.tag = params.tag.trim().slice(0, 64);

  let result: { ok: boolean; status: number; text: string };
  try {
    result = await ovhRequest(
      "POST",
      `/sms/${serviceName}/jobs`,
      JSON.stringify(bodyObj)
    );
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur réseau OVH SMS.",
      validReceivers: [],
      invalidReceivers: params.receivers,
      ids: [],
    };
  }
  if (!result.ok) {
    if (/not enough credits/i.test(result.text)) {
      smsCreditsCache = { at: Date.now(), left: 0 };
    }
    return {
      ok: false,
      error: result.text || `OVH SMS HTTP ${result.status}`,
      validReceivers: [],
      invalidReceivers: params.receivers,
      ids: [],
    };
  }

  let data: OvhJobsResponse = {};
  try {
    data = JSON.parse(result.text) as OvhJobsResponse;
  } catch {
    data = {};
  }
  const validReceivers = Array.isArray(data.validReceivers)
    ? data.validReceivers
    : params.receivers;
  const invalidReceivers = Array.isArray(data.invalidReceivers)
    ? data.invalidReceivers
    : [];
  const ids = Array.isArray(data.ids)
    ? data.ids.map((id) => String(id))
    : [];
  return { ok: true, validReceivers, invalidReceivers, ids };
}

async function sendViaOvh(
  to: string,
  message: string,
  purpose: SmsPurpose
): Promise<SendSmsResult> {
  const job = await sendViaOvhJobs({
    receivers: [to],
    message,
    purpose,
  });
  if (!job.ok) {
    return { ok: false, demo: false, error: job.error };
  }
  if (job.invalidReceivers.length > 0 && job.validReceivers.length === 0) {
    return { ok: false, demo: false, error: "Numéro rejeté par OVH." };
  }
  return {
    ok: true,
    demo: false,
    providerId: job.ids[0],
  };
}

export async function sendMarketingSmsBatch(
  phones: string[],
  message: string,
  tag?: string
): Promise<{ demo: boolean; error?: string; byPhone: Map<string, SendSmsResult> }> {
  const byPhone = new Map<string, SendSmsResult>();
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of phones) {
    const normalized = normalizeFrenchMobile(raw);
    if (!normalized) {
      continue;
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }

  const text = message.trim();
  if (text.length === 0) {
    return {
      demo: false,
      error: "Message vide.",
      byPhone,
    };
  }
  if (text.length > 640) {
    return {
      demo: false,
      error: "Message trop long (max 640 caractères).",
      byPhone,
    };
  }
  if (!isMarketingSmsWindowOpen()) {
    return {
      demo: false,
      error:
        "SMS marketing hors horaires autorisés (lun–sam 8h–20h, heure de Paris). Réessayez plus tard.",
      byPhone,
    };
  }
  if (unique.length === 0) {
    return { demo: false, error: "Aucun numéro valide.", byPhone };
  }

  const failAll = (error: string, demo = false) => {
    for (const phone of unique) {
      byPhone.set(phone, { ok: false, demo, error });
    }
    return { demo, error, byPhone };
  };

  if (isSmsConfigured()) {
    const credits = await getOvhSmsCreditsLeft();
    const ovhHasCredit = credits == null || credits >= unique.length;
    if (ovhHasCredit) {
      const job = await sendViaOvhJobs({
        receivers: unique,
        message: text,
        purpose: "marketing",
        tag,
      });
      if (job.ok) {
        const invalid = new Set(
          job.invalidReceivers
            .map((p) => normalizeFrenchMobile(p))
            .filter((p): p is string => Boolean(p))
        );
        const valid = new Set(
          job.validReceivers
            .map((p) => normalizeFrenchMobile(p))
            .filter((p): p is string => Boolean(p))
        );
        unique.forEach((phone, index) => {
          if (invalid.has(phone) && !valid.has(phone)) {
            byPhone.set(phone, {
              ok: false,
              demo: false,
              error: "Numéro rejeté par OVH.",
            });
            return;
          }
          byPhone.set(phone, {
            ok: true,
            demo: false,
            providerId: job.ids[index],
          });
        });
        return { demo: false, byPhone };
      }
      if (!isBrevoSmsConfigured()) {
        return failAll(job.error ?? "Échec OVH SMS.");
      }
      console.warn("[sms] OVH lot a échoué, repli Brevo :", job.error);
    } else if (!isBrevoSmsConfigured()) {
      return failAll("Plus de crédits OVH SMS.");
    } else {
      console.warn("[sms] OVH sans crédit, repli Brevo.");
    }
  }

  if (isBrevoSmsConfigured()) {
    for (const phone of unique) {
      const brevo = await sendBrevoSms({
        toE164: phone,
        message: text,
        type: "marketing",
      });
      byPhone.set(
        phone,
        brevo.ok
          ? { ok: true, demo: false, providerId: brevo.messageId }
          : { ok: false, demo: false, error: brevo.error }
      );
    }
    return { demo: false, byPhone };
  }

  if (isDemoSmsAllowed()) {
    console.info("[SMS demo] marketing STOP lot", unique.length, text);
    for (const phone of unique) {
      byPhone.set(phone, {
        ok: true,
        demo: true,
        providerId: `demo-${randomBytes(4).toString("hex")}`,
      });
    }
    return { demo: true, byPhone };
  }

  return failAll(
    "SMS non configuré. Activez OVH SMS ou BREVO_API_KEY, ou utilisez le mode démo."
  );
}

export async function sendSms(
  to: string,
  message: string,
  purpose: SmsPurpose
): Promise<SendSmsResult> {
  const normalized = normalizeFrenchMobile(to);
  if (!normalized) {
    return { ok: false, demo: false, error: "Numéro de mobile invalide." };
  }

  if (message.trim().length === 0) {
    return { ok: false, demo: false, error: "Message vide." };
  }

  if (message.length > 640) {
    return { ok: false, demo: false, error: "Message trop long (max 640 caractères)." };
  }

  if (purpose === "marketing" && !isMarketingSmsWindowOpen()) {
    return {
      ok: false,
      demo: false,
      error:
        "SMS marketing hors horaires autorisés (lun–sam 8h–20h, heure de Paris). Réessayez plus tard.",
    };
  }

  if (isSmsConfigured()) {
    const credits = await getOvhSmsCreditsLeft();
    const ovhHasCredit = credits == null || credits > 0;
    if (ovhHasCredit) {
      const ovh = await sendViaOvh(normalized, message.trim(), purpose);
      if (ovh.ok) return ovh;
      if (isBrevoSmsConfigured()) {
        console.warn(
          "[sms] OVH a échoué, repli Brevo :",
          ovh.error ?? "erreur inconnue"
        );
      } else {
        return ovh;
      }
    } else if (!isBrevoSmsConfigured()) {
      return {
        ok: false,
        demo: false,
        error: "Plus de crédits OVH SMS.",
      };
    } else {
      console.warn("[sms] OVH sans crédit, repli Brevo.");
    }
  }

  if (isBrevoSmsConfigured()) {
    const brevo = await sendBrevoSms({
      toE164: normalized,
      message: message.trim(),
      type: purpose,
    });
    if (!brevo.ok) {
      return { ok: false, demo: false, error: brevo.error };
    }
    return { ok: true, demo: false, providerId: brevo.messageId };
  }

  if (isDemoSmsAllowed()) {
    console.info(
      "[SMS demo]",
      purpose,
      purpose === "transactional" ? "noSTOP" : "STOP",
      normalized,
      message.trim()
    );
    return { ok: true, demo: true, providerId: `demo-${randomBytes(4).toString("hex")}` };
  }

  return {
    ok: false,
    demo: false,
    error:
      "SMS non configuré. Activez OVH SMS ou BREVO_API_KEY, ou utilisez le mode démo.",
  };
}
