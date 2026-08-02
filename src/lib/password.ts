import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre.";
  }
  if (!/[0-9]/.test(password)) {
    return "Le mot de passe doit contenir au moins un chiffre.";
  }
  return null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;

  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(password, salt, expected.length);
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
