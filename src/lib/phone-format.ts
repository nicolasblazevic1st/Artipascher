/** Accepte mobile ou fixe français (10 chiffres commençant par 0). */
export function normalizeFrenchPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  let national: string | null = null;
  if (digits.length === 10 && digits.startsWith("0")) {
    national = digits;
  } else if (digits.length === 11 && digits.startsWith("33")) {
    national = `0${digits.slice(2)}`;
  } else if (digits.length === 12 && digits.startsWith("330")) {
    national = `0${digits.slice(3)}`;
  }
  if (!national || !/^0[1-9]\d{8}$/.test(national)) return null;
  return `+33${national.slice(1)}`;
}

/** Normalise un mobile français (06/07) vers +33XXXXXXXXX. */
export function normalizeFrenchMobile(phone: string): string | null {
  const normalized = normalizeFrenchPhone(phone);
  if (!normalized) return null;
  const national = `0${normalized.slice(3)}`;
  if (!/^0[67]\d{8}$/.test(national)) return null;
  return normalized;
}

export function formatFrenchPhoneDisplay(phone: string): string {
  const normalized = normalizeFrenchPhone(phone);
  if (!normalized) return phone.trim();
  const national = `0${normalized.slice(3)}`;
  return national.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}
