import { createHash, randomBytes } from "crypto";

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

/** Normalise un numéro français vers +33XXXXXXXXX. */
export function normalizeFrenchMobile(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return `+33${digits.slice(1)}`;
  }
  if (digits.length === 11 && digits.startsWith("33")) {
    return `+${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("330")) {
    return `+${digits.slice(1)}`;
  }
  return null;
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

async function sendViaOvh(to: string, message: string): Promise<SendSmsResult> {
  const appKey = process.env.OVH_APP_KEY!;
  const appSecret = process.env.OVH_APP_SECRET!;
  const consumerKey = process.env.OVH_CONSUMER_KEY!;
  const serviceName = process.env.OVH_SMS_SERVICE_NAME!;
  const sender = process.env.OVH_SMS_SENDER ?? "Artipascher";

  const path = `/sms/${serviceName}/jobs`;
  const url = `https://eu.api.ovh.com/1.0${path}`;
  const body = JSON.stringify({
    message,
    receivers: [to],
    sender,
    noStopClause: false,
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

export async function sendSms(to: string, message: string): Promise<SendSmsResult> {
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

  if (isSmsConfigured()) {
    return sendViaOvh(normalized, message.trim());
  }

  if (isDemoSmsAllowed()) {
    console.info("[SMS demo]", normalized, message.trim());
    return { ok: true, demo: true, providerId: `demo-${randomBytes(4).toString("hex")}` };
  }

  return {
    ok: false,
    demo: false,
    error: "SMS non configuré. Activez OVH_SMS_ENABLED ou utilisez le mode démo.",
  };
}
