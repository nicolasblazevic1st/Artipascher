import { createEmailVerificationToken } from "./store";
import { sendEmailVerificationEmail } from "./email";
import type { PasswordResetUserType } from "./store-types";

export const EMAIL_VERIFICATION_SUCCESS_MESSAGE =
  "Si un compte non vérifié existe avec cet email, un nouveau message vient d'être envoyé.";

export async function requestEmailVerification(
  email: string,
  userType: PasswordResetUserType
): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) return;

  const token = await createEmailVerificationToken(trimmed, userType);
  if (!token) return;

  try {
    await sendEmailVerificationEmail(trimmed, token.token, userType);
  } catch (error) {
    console.error("[email-verification] Échec envoi email:", error);
  }
}
