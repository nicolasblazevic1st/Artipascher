import type { SelectedBanAddress } from "@/components/BanAddressAutocomplete";

const KEY = "nap_google_work_form_draft";

export type GoogleWorkFormDraft = {
  description: string;
  selectedAddress: SelectedBanAddress | null;
  phone: string;
};

let memory: GoogleWorkFormDraft | null | undefined;

export function saveGoogleWorkFormDraft(draft: GoogleWorkFormDraft): void {
  memory = draft;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // ignore quota / private mode
  }
}

/** Lit le brouillon une fois par chargement de page (survît au double-mount React). */
export function readGoogleWorkFormDraft(): GoogleWorkFormDraft | null {
  if (memory !== undefined) return memory;
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    memory = raw ? (JSON.parse(raw) as GoogleWorkFormDraft) : null;
  } catch {
    memory = null;
  }
  return memory;
}
