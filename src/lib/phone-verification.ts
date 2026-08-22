import { createHash, randomInt } from "crypto";
import {
  createPhoneVerificationChallenge,
  deletePhoneVerificationChallenge,
  getClientById,
  isGuestPhoneVerified,
  markClientPhoneVerified,
  markGuestPhoneVerified,
  verifyPhoneChallengeCode,
} from "@/lib/store";
import { GUEST_PHONE_SUBJECT_ID } from "@/lib/store-types";
import {
  formatFrenchPhoneDisplay,
  normalizeFrenchMobile,
} from "@/lib/phone-format";
import { isSmsConfigured, isDemoSmsAllowed, sendSms } from "@/lib/sms";

export const PHONE_OTP_TTL_MS = 10 * 60 * 1000;
export const PHONE_OTP_COOLDOWN_MS = 60 * 1000;
export const PHONE_OTP_MAX_ATTEMPTS = 5;

export function hashPhoneOtpCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

export function generatePhoneOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function clientPhoneIsVerified(
  client: { phoneVerifiedE164?: string; phoneVerifiedAt?: string },
  phoneRaw: string
): boolean {
  const e164 = normalizeFrenchMobile(phoneRaw);
  if (!e164 || !client.phoneVerifiedE164 || !client.phoneVerifiedAt) {
    return false;
  }
  return client.phoneVerifiedE164 === e164;
}

export async function sendClientPhoneVerificationSms(params: {
  clientId: string;
  phoneRaw: string;
}): Promise<
  | { ok: true; phoneDisplay: string; demo: boolean; cooldownSeconds: number }
  | { ok: false; error: string; status: number; cooldownSeconds?: number }
> {
  const client = await getClientById(params.clientId);
  if (!client) {
    return { ok: false, error: "Session invalide.", status: 401 };
  }

  const phoneE164 = normalizeFrenchMobile(params.phoneRaw);
  if (!phoneE164) {
    return {
      ok: false,
      error:
        "Indiquez un mobile français valide (06 ou 07), ex. 06 12 34 56 78.",
      status: 400,
    };
  }

  if (clientPhoneIsVerified(client, phoneE164)) {
    return {
      ok: false,
      error: "Ce mobile est déjà vérifié sur votre compte.",
      status: 409,
    };
  }

  if (!isSmsConfigured() && !isDemoSmsAllowed()) {
    return {
      ok: false,
      error:
        "L'envoi de SMS est indisponible pour le moment. Réessayez plus tard ou contactez le support.",
      status: 503,
    };
  }

  const code = generatePhoneOtpCode();
  const created = await createPhoneVerificationChallenge({
    clientId: params.clientId,
    phoneE164,
    codeHash: hashPhoneOtpCode(code),
    ttlMs: PHONE_OTP_TTL_MS,
    cooldownMs: PHONE_OTP_COOLDOWN_MS,
  });

  if ("error" in created) {
    return {
      ok: false,
      error: created.error,
      status: created.status,
      cooldownSeconds: created.cooldownSeconds,
    };
  }

  const message = `Nord Artisan Pro : votre code de verification est ${code}. Valable 10 minutes.`;
  const sms = await sendSms(phoneE164, message, "transactional");
  if (!sms.ok) {
    // Ne pas laisser un challenge + cooldown si le SMS n'est jamais parti.
    await deletePhoneVerificationChallenge({
      clientId: params.clientId,
      phoneE164,
    });
    return {
      ok: false,
      error:
        "Le SMS n'a pas pu être envoyé (service temporairement indisponible). Réessayez dans un instant.",
      status: 502,
    };
  }

  return {
    ok: true,
    phoneDisplay: formatFrenchPhoneDisplay(phoneE164),
    demo: sms.demo,
    cooldownSeconds: Math.ceil(PHONE_OTP_COOLDOWN_MS / 1000),
  };
}

export async function confirmClientPhoneVerification(params: {
  clientId: string;
  phoneRaw: string;
  code: string;
}): Promise<
  | {
      ok: true;
      phoneDisplay: string;
      phoneVerifiedE164: string;
      phoneVerifiedAt: string;
    }
  | { ok: false; error: string; status: number }
> {
  const client = await getClientById(params.clientId);
  if (!client) {
    return { ok: false, error: "Session invalide.", status: 401 };
  }

  const phoneE164 = normalizeFrenchMobile(params.phoneRaw);
  if (!phoneE164) {
    return {
      ok: false,
      error:
        "Indiquez un mobile français valide (06 ou 07), ex. 06 12 34 56 78.",
      status: 400,
    };
  }

  const code = params.code.replace(/\D/g, "");
  if (code.length !== 6) {
    return { ok: false, error: "Le code doit contenir 6 chiffres.", status: 400 };
  }

  if (clientPhoneIsVerified(client, phoneE164)) {
    return {
      ok: true,
      phoneDisplay: formatFrenchPhoneDisplay(phoneE164),
      phoneVerifiedE164: phoneE164,
      phoneVerifiedAt: client.phoneVerifiedAt!,
    };
  }

  const check = await verifyPhoneChallengeCode({
    clientId: params.clientId,
    phoneE164,
    codeHash: hashPhoneOtpCode(code),
    maxAttempts: PHONE_OTP_MAX_ATTEMPTS,
  });

  if ("error" in check) {
    return { ok: false, error: check.error, status: check.status };
  }

  const updated = await markClientPhoneVerified(params.clientId, phoneE164);
  if (!updated?.phoneVerifiedAt) {
    return {
      ok: false,
      error:
        "Ce numéro de mobile est déjà associé à un autre compte. Un mobile ne peut pas être lié à plusieurs emails.",
      status: 409,
    };
  }

  return {
    ok: true,
    phoneDisplay: formatFrenchPhoneDisplay(phoneE164),
    phoneVerifiedE164: phoneE164,
    phoneVerifiedAt: updated.phoneVerifiedAt,
  };
}

export async function sendGuestPhoneVerificationSms(params: {
  phoneRaw: string;
}): Promise<
  | { ok: true; phoneDisplay: string; demo: boolean; cooldownSeconds: number }
  | { ok: false; error: string; status: number; cooldownSeconds?: number }
> {
  const phoneE164 = normalizeFrenchMobile(params.phoneRaw);
  if (!phoneE164) {
    return {
      ok: false,
      error:
        "Indiquez un mobile français valide (06 ou 07), ex. 06 12 34 56 78.",
      status: 400,
    };
  }

  if (await isGuestPhoneVerified(phoneE164)) {
    return {
      ok: false,
      error: "Ce mobile est déjà vérifié.",
      status: 409,
    };
  }

  if (!isSmsConfigured() && !isDemoSmsAllowed()) {
    return {
      ok: false,
      error:
        "L'envoi de SMS est indisponible pour le moment. Réessayez plus tard ou contactez le support.",
      status: 503,
    };
  }

  const code = generatePhoneOtpCode();
  const created = await createPhoneVerificationChallenge({
    clientId: GUEST_PHONE_SUBJECT_ID,
    phoneE164,
    codeHash: hashPhoneOtpCode(code),
    ttlMs: PHONE_OTP_TTL_MS,
    cooldownMs: PHONE_OTP_COOLDOWN_MS,
  });

  if ("error" in created) {
    return {
      ok: false,
      error: created.error,
      status: created.status,
      cooldownSeconds: created.cooldownSeconds,
    };
  }

  const message = `Nord Artisan Pro : votre code de verification est ${code}. Valable 10 minutes.`;
  const sms = await sendSms(phoneE164, message, "transactional");
  if (!sms.ok) {
    await deletePhoneVerificationChallenge({
      clientId: GUEST_PHONE_SUBJECT_ID,
      phoneE164,
    });
    return {
      ok: false,
      error:
        "Le SMS n'a pas pu être envoyé (service temporairement indisponible). Réessayez dans un instant.",
      status: 502,
    };
  }

  return {
    ok: true,
    phoneDisplay: formatFrenchPhoneDisplay(phoneE164),
    demo: sms.demo,
    cooldownSeconds: Math.ceil(PHONE_OTP_COOLDOWN_MS / 1000),
  };
}

export async function confirmGuestPhoneVerification(params: {
  phoneRaw: string;
  code: string;
}): Promise<
  | {
      ok: true;
      phoneDisplay: string;
      phoneVerifiedE164: string;
      phoneVerifiedAt: string;
    }
  | { ok: false; error: string; status: number }
> {
  const phoneE164 = normalizeFrenchMobile(params.phoneRaw);
  if (!phoneE164) {
    return {
      ok: false,
      error:
        "Indiquez un mobile français valide (06 ou 07), ex. 06 12 34 56 78.",
      status: 400,
    };
  }

  const code = params.code.replace(/\D/g, "");
  if (code.length !== 6) {
    return { ok: false, error: "Le code doit contenir 6 chiffres.", status: 400 };
  }

  if (await isGuestPhoneVerified(phoneE164)) {
    const verifiedAt = new Date().toISOString();
    return {
      ok: true,
      phoneDisplay: formatFrenchPhoneDisplay(phoneE164),
      phoneVerifiedE164: phoneE164,
      phoneVerifiedAt: verifiedAt,
    };
  }

  const check = await verifyPhoneChallengeCode({
    clientId: GUEST_PHONE_SUBJECT_ID,
    phoneE164,
    codeHash: hashPhoneOtpCode(code),
    maxAttempts: PHONE_OTP_MAX_ATTEMPTS,
  });

  if ("error" in check) {
    return { ok: false, error: check.error, status: check.status };
  }

  const entry = await markGuestPhoneVerified(phoneE164);
  return {
    ok: true,
    phoneDisplay: formatFrenchPhoneDisplay(phoneE164),
    phoneVerifiedE164: phoneE164,
    phoneVerifiedAt: entry.verifiedAt,
  };
}
