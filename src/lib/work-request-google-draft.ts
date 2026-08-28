import type { SelectedBanAddress } from "@/components/BanAddressAutocomplete";
import type { ClientKind, WorkScope } from "@/lib/store-types";
import type { PricingTierId } from "@/lib/pricing-tiers";

const KEY = "nap_google_work_form_draft";

export type GoogleWorkFormDraft = {
  category: string;
  unknownTrade: boolean;
  selectedNafCodes: string[];
  workOptionId: string;
  pricingTier: PricingTierId | "";
  workOptionOtherDescription: string;
  description: string;
  descriptionTouched: boolean;
  selectedAddress: SelectedBanAddress | null;
  propertyType: string;
  clientKind: ClientKind;
  workScope: WorkScope | "";
  clientSiret: string;
  maxContactArtisans: number;
  minGoogleRating: number | "";
  requireRge: boolean;
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
