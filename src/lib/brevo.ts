import { BRAND } from "@/lib/brand";

const BREVO_API = "https://api.brevo.com/v3";

export function getBrevoApiKey(): string | null {
  const key = process.env.BREVO_API_KEY?.trim();
  return key || null;
}

export function isBrevoConfigured(): boolean {
  return Boolean(getBrevoApiKey());
}

export function isBrevoSmsConfigured(): boolean {
  return isBrevoConfigured();
}

export function getBrevoSmsSender(): string {
  const raw = (process.env.BREVO_SMS_SENDER ?? BRAND.smsSender).trim();
  return raw.slice(0, 11) || BRAND.smsSender;
}

export function getBrevoEmailSender(): { name: string; email: string } {
  const email =
    process.env.BREVO_EMAIL_SENDER?.trim() ||
    process.env.EMAIL_FROM?.replace(/^.*<([^>]+)>\s*$/, "$1").trim() ||
    BRAND.emailContact;
  const name =
    process.env.BREVO_EMAIL_SENDER_NAME?.trim() || BRAND.emailFromName;
  return { name, email };
}

async function brevoRequest(
  path: string,
  body: unknown
): Promise<{ ok: boolean; status: number; text: string }> {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    return { ok: false, status: 0, text: "BREVO_API_KEY manquante." };
  }
  const response = await fetch(`${BREVO_API}${path}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(body),
  });
  return {
    ok: response.ok,
    status: response.status,
    text: await response.text(),
  };
}

export async function sendBrevoTransactionalEmail(params: {
  toEmail: string;
  toName?: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  headers?: Record<string, string>;
}): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const sender = getBrevoEmailSender();
  const result = await brevoRequest("/smtp/email", {
    sender,
    to: [{ email: params.toEmail, name: params.toName || undefined }],
    replyTo: { email: params.replyTo || BRAND.emailContact, name: sender.name },
    subject: params.subject,
    textContent: params.text,
    htmlContent: params.html,
    headers: params.headers,
  });
  if (!result.ok) {
    return {
      ok: false,
      error: result.text || `Brevo email HTTP ${result.status}`,
    };
  }
  try {
    const parsed = JSON.parse(result.text) as { messageId?: string };
    return { ok: true, messageId: parsed.messageId };
  } catch {
    return { ok: true };
  }
}

export async function sendBrevoSms(params: {
  toE164: string;
  message: string;
  type: "transactional" | "marketing";
}): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const recipient = params.toE164.replace(/^\+/, "");
  const result = await brevoRequest("/transactionalSMS/sms", {
    sender: getBrevoSmsSender(),
    recipient,
    content: params.message,
    type: params.type,
    unicodeEnabled: false,
  });
  if (!result.ok) {
    return {
      ok: false,
      error: result.text || `Brevo SMS HTTP ${result.status}`,
    };
  }
  try {
    const parsed = JSON.parse(result.text) as { messageId?: number | string };
    return {
      ok: true,
      messageId:
        parsed.messageId != null ? String(parsed.messageId) : undefined,
    };
  } catch {
    return { ok: true };
  }
}
