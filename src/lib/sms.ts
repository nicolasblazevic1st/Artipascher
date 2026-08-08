import { createHash, randomBytes } from "crypto";
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
    process.env.OVH_SMS_ENABLED === "true" &&
    Boolean(process.env.OVH_APP_KEY) &&
    Boolean(process.env.OVH_APP_SECRET) &&
    Boolean(process.env.OVH_CONSUMER_KEY) &&
    Boolean(process.env.OVH_SMS_SERVICE_NAME)
  );
}

export function isDemoSmsAllowed(): boolean {
  return process.env.OVH_SMS_ENABLED !== "true" || process.env.NODE_ENV === "development";
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

async function sendViaOvh(
  to: string,
  message: string,
  purpose: SmsPurpose
): Promise<SendSmsResult> {
  const appKey = process.env.OVH_APP_KEY!;
  const appSecret = process.env.OVH_APP_SECRET!;
  const consumerKey = process.env.OVH_CONSUMER_KEY!;
  const serviceName = process.env.OVH_SMS_SERVICE_NAME!;
  const sender = process.env.OVH_SMS_SENDER ?? "Artipascher";

  // Marketing : STOP obligatoire (noStopClause false).
  // Transactionnel : pas de STOP pour éviter de blacklister un client après un OTP.
  const noStopClause = purpose === "transactional";

  const path = `/sms/${serviceName}/jobs`;
  const url = `https://eu.api.ovh.com/1.0${path}`;
  const body = JSON.stringify({
    message,
    receivers: [to],
    sender,
    noStopClause,
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = ovhSignature(appSecret, consumerKey, "POST", url, body, timestamp);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Ovh-Application": appKey,
        "X-Ovh-Consumer": consumerKey,
        "X-Ovh-Timestamp": String(timestamp),
        "X-Ovh-Signature": signature,
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, demo: false, error: text || `OVH SMS HTTP ${response.status}` };
    }

    const data = (await response.json()) as { ids?: number[] };
    return {
      ok: true,
      demo: false,
      providerId: data.ids?.[0] != null ? String(data.ids[0]) : undefined,
    };
  } catch (err) {
    return {
      ok: false,
      demo: false,
      error: err instanceof Error ? err.message : "Erreur réseau OVH SMS.",
    };
  }
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
    return sendViaOvh(normalized, message.trim(), purpose);
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
    error: "SMS non configuré. Activez OVH_SMS_ENABLED ou utilisez le mode démo.",
  };
}
