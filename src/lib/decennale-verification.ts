import { proCoversTradeCategory } from "./pro-trades";
import type { DecennaleVerificationStatus, ProRegistration, ProTradeSelection } from "./store-types";
import {
  getTradeGuaranteeType,
  guaranteeTypeShortLabel,
  isTradeGuaranteeSatisfied,
  tradeRequiresGuaranteeDocument,
  type TradeGuaranteeType,
} from "./trade-guarantees";

export const DECENNALE_STATUS_LABELS: Record<
  DecennaleVerificationStatus,
  { text: string; className: string }
> = {
  en_attente_verification: {
    text: "En attente de vérification",
    className: "bg-amber-100 text-amber-800",
  },
  validé: {
    text: "Garantie validée",
    className: "bg-emerald-100 text-emerald-800",
  },
  non_couvert: {
    text: "Non couvert",
    className: "bg-red-100 text-red-800",
  },
};

export function resolveSelectionGuaranteeType(
  selection: ProTradeSelection
): TradeGuaranteeType {
  return selection.guaranteeType ?? getTradeGuaranteeType(selection.tradeGroupId);
}

export function guaranteeStatusLabel(
  status: DecennaleVerificationStatus,
  guaranteeType: TradeGuaranteeType
): { text: string; className: string } {
  const base = DECENNALE_STATUS_LABELS[status];
  if (guaranteeType === "none") {
    return {
      text: "RC pro seule (OK)",
      className: "bg-emerald-100 text-emerald-800",
    };
  }
  if (status === "validé") {
    return {
      text: `${guaranteeTypeShortLabel(guaranteeType)} validée`,
      className: base.className,
    };
  }
  if (status === "en_attente_verification") {
    return {
      text: `${guaranteeTypeShortLabel(guaranteeType)} — en attente`,
      className: base.className,
    };
  }
  return {
    text: `${guaranteeTypeShortLabel(guaranteeType)} — non couvert`,
    className: base.className,
  };
}

export function defaultDecennaleStatus(): DecennaleVerificationStatus {
  return "en_attente_verification";
}

/** Corps de métier inscrits qui correspondent au chantier. */
export function getMatchingTradesForWorkCategory(
  pro: ProRegistration,
  workCategoryLabel: string
): ProTradeSelection[] {
  return (pro.tradeSelections ?? []).filter((selection) =>
    tradeSelectionCoversWorkCategory(selection, workCategoryLabel)
  );
}

function tradeSelectionCoversWorkCategory(
  selection: ProTradeSelection,
  workCategoryLabel: string
): boolean {
  const pseudoPro: ProRegistration = {
    id: "",
    companyName: "",
    siret: "",
    siren: "",
    email: "",
    phone: "",
    city: "",
    department: "59",
    category: selection.category,
    tradeSelections: [selection],
    rcsVerified: true,
    passwordHash: "",
    status: "approved",
    createdAt: "",
  };
  return proCoversTradeCategory(pseudoPro, workCategoryLabel);
}

export function getValidatedDecennaleLabelsForWorkCategory(
  pro: ProRegistration,
  workCategoryLabel: string
): string[] {
  return getMatchingTradesForWorkCategory(pro, workCategoryLabel)
    .filter((s) =>
      isTradeGuaranteeSatisfied({
        guaranteeType: resolveSelectionGuaranteeType(s),
        decennaleStatus: s.decennaleStatus,
      })
    )
    .map((s) => s.tradeGroupLabel);
}

export function checkDecennaleForWorkCategory(
  pro: ProRegistration,
  workCategoryLabel: string
): { ok: boolean; reason?: string } {
  const matching = getMatchingTradesForWorkCategory(pro, workCategoryLabel);

  if (matching.length === 0) {
    return {
      ok: false,
      reason:
        "Ce chantier ne correspond à aucun corps de métier déclaré sur votre compte. Modifiez votre inscription ou choisissez une autre enchère.",
    };
  }

  const validated = matching.filter((s) =>
    isTradeGuaranteeSatisfied({
      guaranteeType: resolveSelectionGuaranteeType(s),
      decennaleStatus: s.decennaleStatus,
    })
  );
  if (validated.length > 0) {
    return { ok: true };
  }

  const pending = matching.find((s) => {
    const type = resolveSelectionGuaranteeType(s);
    return (
      tradeRequiresGuaranteeDocument(type) &&
      s.decennaleStatus === "en_attente_verification"
    );
  });
  if (pending) {
    const type = resolveSelectionGuaranteeType(pending);
    return {
      ok: false,
      reason: `Votre attestation (${guaranteeTypeShortLabel(type)}) pour « ${pending.tradeGroupLabel} » est en cours de vérification par Nord Artisan Pro. Vous pourrez enchérir dès validation.`,
    };
  }

  const rejected = matching.find((s) => s.decennaleStatus === "non_couvert");
  const label = rejected?.tradeGroupLabel ?? matching[0].tradeGroupLabel;
  const type = resolveSelectionGuaranteeType(rejected ?? matching[0]);
  return {
    ok: false,
    reason: `Garantie non vérifiée pour ce corps de métier (« ${label} » — ${guaranteeTypeShortLabel(type)}). Votre contrat doit couvrir nommément cette activité pour enchérir sur ce type de chantier.`,
  };
}
