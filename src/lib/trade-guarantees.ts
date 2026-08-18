/**
 * Politique plateforme : type de garantie exigée par corps de métier.
 * Indicative — ne se substitue pas aux obligations légales de l'Artisan.
 */

export type TradeGuaranteeType = "decennale" | "biennale" | "none";

export const GUARANTEE_TYPE_BY_TRADE_GROUP: Record<string, TradeGuaranteeType> = {
  maconnerie: "decennale",
  "charpente-couverture": "decennale",
  "plomberie-chauffage": "decennale",
  platrerie: "decennale",
  "facade-etancheite": "decennale",
  "isolation-energie": "decennale",
  carrelage: "decennale",
  menuiserie: "decennale",
  electricite: "biennale",
  amenagement: "biennale",
  peinture: "none",
  "terrassement-vrd": "none",
  autres: "none",
};

export function getTradeGuaranteeType(tradeGroupId: string): TradeGuaranteeType {
  return GUARANTEE_TYPE_BY_TRADE_GROUP[tradeGroupId] ?? "decennale";
}

export function tradeRequiresGuaranteeDocument(type: TradeGuaranteeType): boolean {
  return type === "decennale" || type === "biennale";
}

export function guaranteeTypeShortLabel(type: TradeGuaranteeType): string {
  switch (type) {
    case "decennale":
      return "Décennale";
    case "biennale":
      return "Biennale / bon fonctionnement";
    case "none":
      return "RC pro seule";
  }
}

export function guaranteeTypeUploadLabel(type: TradeGuaranteeType): string {
  switch (type) {
    case "decennale":
      return "Attestation décennale";
    case "biennale":
      return "Attestation biennale / bon fonctionnement (éléments dissociables)";
    case "none":
      return "Aucune attestation de garantie métier";
  }
}

export function guaranteeTypeHelp(type: TradeGuaranteeType): string {
  switch (type) {
    case "decennale":
      return "PDF original de l'assureur : l'attestation doit nommer cette activité.";
    case "biennale":
      return "PDF original : garantie biennale / bon fonctionnement pour équipements ou éléments dissociables.";
    case "none":
      return "Pour ce métier, la plateforme n'exige pas d'attestation décennale ou biennale (RC pro obligatoire).";
  }
}

/** Statut « document de garantie » satisfait pour un métier (ou non requis). */
export function isTradeGuaranteeSatisfied(params: {
  guaranteeType: TradeGuaranteeType;
  decennaleStatus?: string;
}): boolean {
  if (params.guaranteeType === "none") return true;
  return params.decennaleStatus === "validé";
}
