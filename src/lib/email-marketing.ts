import nodemailer from "nodemailer";
import { BRAND } from "@/lib/brand";
import {
  isBrevoConfigured,
  sendBrevoTransactionalEmail,
} from "@/lib/brevo";
import { unsubscribeUrl } from "@/lib/email-unsubscribe";

export interface MarketingMailResult {
  ok: boolean;
  demo: boolean;
  error?: string;
  providerId?: string;
}

function getMarketingSmtpConfig() {
  const host = process.env.MARKETING_SMTP_HOST?.trim();
  const user = process.env.MARKETING_SMTP_USER?.trim();
  const pass = process.env.MARKETING_SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;
  const port = Number(process.env.MARKETING_SMTP_PORT ?? "587");
  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  };
}

export function isMarketingEmailConfigured(): boolean {
  return isBrevoConfigured() || Boolean(getMarketingSmtpConfig());
}

export function isDemoMarketingEmailAllowed(): boolean {
  return (
    !isMarketingEmailConfigured() || process.env.NODE_ENV === "development"
  );
}

function marketingFromAddress(): string {
  const email =
    process.env.BREVO_EMAIL_SENDER?.trim() ||
    process.env.EMAIL_FROM?.replace(/^.*<([^>]+)>\s*$/, "$1").trim() ||
    BRAND.emailContact;
  const name =
    process.env.BREVO_EMAIL_SENDER_NAME?.trim() || BRAND.emailFromName;
  return `${name} <${email}>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function applyPlaceholders(
  template: string,
  vars: Record<string, string>,
  html = false
): string {
  let out = template;
  for (const [key, raw] of Object.entries(vars)) {
    const value = html ? escapeHtml(raw) : raw;
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "");
}

export function textToMarketingHtml(text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const inner = escapeHtml(block).replace(/\n/g, "<br>");
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#334155;">${inner}</p>`;
    })
    .join("");
  return paragraphs;
}

export function wrapMarketingEmailHtml(params: {
  innerHtml: string;
  unsubscribeHref: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:#0f766e;padding:24px 32px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${escapeHtml(BRAND.name)}</p>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">${escapeHtml(BRAND.tagline)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">${params.innerHtml}</td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">
                Email d'information professionnelle (B2B) — ${escapeHtml(BRAND.name)}.
                <a href="${escapeHtml(params.unsubscribeHref)}" style="color:#0f766e;">Se désinscrire</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export async function sendMarketingEmail(params: {
  to: string;
  toName?: string;
  subject: string;
  text: string;
}): Promise<MarketingMailResult> {
  const unsub = unsubscribeUrl(params.to);
  const html = wrapMarketingEmailHtml({
    innerHtml: textToMarketingHtml(params.text),
    unsubscribeHref: unsub,
  });
  const text = `${params.text.trim()}\n\nSe désinscrire : ${unsub}`;
  const headers = {
    "List-Unsubscribe": `<${unsub}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };

  if (isBrevoConfigured()) {
    const result = await sendBrevoTransactionalEmail({
      toEmail: params.to,
      toName: params.toName,
      subject: params.subject,
      text,
      html,
      headers,
    });
    return {
      ok: result.ok,
      demo: false,
      error: result.error,
      providerId: result.messageId,
    };
  }

  const smtp = getMarketingSmtpConfig();
  if (smtp) {
    try {
      const transporter = nodemailer.createTransport(smtp);
      const info = await transporter.sendMail({
        from: marketingFromAddress(),
        to: params.toName ? `${params.toName} <${params.to}>` : params.to,
        replyTo: BRAND.emailContact,
        subject: params.subject,
        text,
        html,
        headers,
      });
      return {
        ok: true,
        demo: false,
        providerId: String(info.messageId ?? ""),
      };
    } catch (err) {
      return {
        ok: false,
        demo: false,
        error: err instanceof Error ? err.message : "Erreur SMTP marketing.",
      };
    }
  }

  if (isDemoMarketingEmailAllowed()) {
    console.info("[email marketing demo]", params.to, params.subject);
    console.info(text);
    return { ok: true, demo: true, providerId: "demo-email" };
  }

  return {
    ok: false,
    demo: false,
    error:
      "Envoi marketing non configuré. Renseignez BREVO_API_KEY (ne pas utiliser le SMTP OVH MX Plan).",
  };
}
