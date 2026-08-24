/** Alphabet GSM 7-bit (3GPP 23.038) — un caractère hors set bascule tout le SMS en Unicode. */
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€";

const GSM_FOLD: Record<string, string> = {
  ê: "e",
  ë: "e",
  Ê: "E",
  Ë: "E",
  â: "a",
  Â: "A",
  î: "i",
  ï: "i",
  Î: "I",
  Ï: "I",
  ô: "o",
  Ô: "O",
  û: "u",
  Û: "U",
  ç: "c",
  ÿ: "y",
  Ÿ: "Y",
  œ: "oe",
  Œ: "OE",
  "’": "'",
  "‘": "'",
  "`": "'",
  "«": '"',
  "»": '"',
  "–": "-",
  "—": "-",
  "…": "...",
  "≥": ">=",
  "≤": "<=",
};

/** Réserve le STOP OVH ajouté aux SMS marketing (~" STOP au XXXXX"). */
export const SMS_MARKETING_STOP_RESERVE = 20;
/** Un SMS GSM simple = 160 septets. */
export const SMS_GSM_SINGLE_MAX = 160;

export function isGsm7Char(ch: string): boolean {
  return GSM_BASIC.includes(ch) || GSM_EXT.includes(ch);
}

/** Remplace les accents hors GSM, enlève le reste. */
export function toGsm7Sms(text: string): string {
  let out = "";
  for (const ch of text.normalize("NFC")) {
    if (GSM_FOLD[ch]) out += GSM_FOLD[ch];
    else if (ch === "\n" || ch === "\r" || ch === "\t") out += " ";
    else if (isGsm7Char(ch)) out += ch;
  }
  return out.replace(/ {2,}/g, " ").trim();
}

export function gsmSeptetCount(text: string): number | null {
  let n = 0;
  for (const ch of text) {
    if (GSM_EXT.includes(ch)) n += 2;
    else if (GSM_BASIC.includes(ch)) n += 1;
    else return null;
  }
  return n;
}

export function estimateSmsCredits(message: string): {
  unicode: boolean;
  units: number;
  credits: number;
} {
  const gsm = gsmSeptetCount(message);
  if (gsm != null) {
    return {
      unicode: false,
      units: gsm,
      credits: gsm <= 160 ? 1 : Math.ceil(gsm / 153),
    };
  }
  const units = [...message].length;
  return {
    unicode: true,
    units,
    credits: units <= 70 ? 1 : Math.ceil(units / 67),
  };
}
