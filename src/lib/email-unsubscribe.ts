import { createHmac, timingSafeEqual } from "crypto";
import { absoluteUrl } from "@/lib/share";

function getUnsubscribeSecret(): string {
  return (
    process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim() ||
    process.env.BREVO_API_KEY?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    "dev-email-unsubscribe"
  );
}

export function normalizeMarketingEmail(email: string): string | null {
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 200) {
    return null;
  }
  return value;
}

export function createUnsubscribeToken(email: string): string {
  const normalized = normalizeMarketingEmail(email);
  if (!normalized) return "";
  const digest = createHmac("sha256", getUnsubscribeSecret())
    .update(normalized)
    .digest("base64url");
  const payload = Buffer.from(normalized, "utf8").toString("base64url");
  return `${payload}.${digest}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const raw = token.trim();
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const digest = raw.slice(dot + 1);
  let email: string;
  try {
    email = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = createUnsubscribeToken(email);
  if (!expected) return null;
  const a = Buffer.from(raw);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return normalizeMarketingEmail(email);
}

export function unsubscribeUrl(email: string): string {
  const token = createUnsubscribeToken(email);
  return absoluteUrl(
    `/api/marketing/unsubscribe?token=${encodeURIComponent(token)}`
  );
}

export function unsubscribePageUrl(query: Record<string, string>): string {
  const params = new URLSearchParams(query);
  return absoluteUrl(`/desinscription-email?${params.toString()}`);
}
