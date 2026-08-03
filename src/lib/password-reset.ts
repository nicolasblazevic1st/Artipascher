import { createPasswordResetToken } from "./store";
import { sendPasswordResetEmail } from "./email";
import type { PasswordResetUserType } from "./store-types";

export const PASSWORD_RESET_SUCCESS_MESSAGE =
  "Si un compte existe avec cet email, un message de réinitialisation vient d'être envoyé.";

export async function requestPasswordReset(
  email: string,
  userType: PasswordResetUserType
): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) return;

  const token = await createPasswordResetToken(trimmed, userType);
  if (!token) return;

  try {
    await sendPasswordResetEmail(trimmed, token.token, userType);
  } catch (error) {
    console.error("[password-reset] Échec envoi email:", error);
  }
}
