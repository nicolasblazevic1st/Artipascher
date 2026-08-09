/**
 * Vérification d'identité à l'achat de crédits.
 *
 * - Si OK → le webhook crédite le pack.
 * - Si KO → remboursement Stripe du pack moins KBIS_VERIFICATION_FEE (3 €).
 *
 * Providers :
 * - `registry` (défaut) : re-contrôle registre gouv (actif, SIREN, zone).
 * - `mock` : KBIS_MOCK_RESULT=pass|fail (tests).
 * - `infogreffe` : achat extrait payant si INFOGREFFE_API_KEY est défini
 *   (sinon repli sur registry).
 */

import {
  isAllowedDepartment,
  verifyWithRegistry,
} from "./rcs";
import type {
  KbisPurchaseProvider,
  KbisPurchaseVerification,
  ProRegistration,
} from "./store-types";
import {
  KBIS_VERIFICATION_FEE_CENTS,
} from "./store-types";

export interface KbisVerifyResult {
  ok: boolean;
  provider: KbisPurchaseProvider;
  reason?: string;
  companyNameAtCheck?: string;
}

function resolveProvider(): KbisPurchaseProvider {
  const raw = (process.env.KBIS_PROVIDER || "registry").toLowerCase().trim();
  if (raw === "mock" || raw === "infogreffe" || raw === "registry") return raw;
  return "registry";
}

async function verifyViaRegistry(pro: ProRegistration): Promise<KbisVerifyResult> {
  const reg = await verifyWithRegistry(pro.siret);
  if (!reg.valid) {
    return {
      ok: false,
      provider: "registry",
      reason: reg.error ?? "Entreprise non validée au registre.",
      companyNameAtCheck: reg.companyName,
    };
  }

  if (reg.siren && reg.siren !== pro.siren) {
    return {
      ok: false,
      provider: "registry",
      reason: `SIREN registre (${reg.siren}) ≠ compte (${pro.siren}).`,
      companyNameAtCheck: reg.companyName,
    };
  }

  if (!isAllowedDepartment(reg.department)) {
    return {
      ok: false,
      provider: "registry",
      reason: `Zone hors 59/62 (${reg.department ?? "?"}).`,
      companyNameAtCheck: reg.companyName,
    };
  }

  return {
    ok: true,
    provider: "registry",
    companyNameAtCheck: reg.companyName,
  };
}

async function verifyViaMock(pro: ProRegistration): Promise<KbisVerifyResult> {
  const forced = (process.env.KBIS_MOCK_RESULT || "pass").toLowerCase().trim();
  if (forced === "fail") {
    return {
      ok: false,
      provider: "mock",
      reason: "Échec simulé (KBIS_MOCK_RESULT=fail).",
      companyNameAtCheck: pro.companyName,
    };
  }
  return {
    ok: true,
    provider: "mock",
    companyNameAtCheck: pro.companyName,
  };
}

/**
 * Branche Infogreffe : dès qu'une API d'achat d'extrait est branchée,
 * remplacer le corps de cette fonction. En attendant → registry.
 */
async function verifyViaInfogreffe(pro: ProRegistration): Promise<KbisVerifyResult> {
  const apiKey = process.env.INFOGREFFE_API_KEY?.trim();
  if (!apiKey) {
    console.warn(
      "[kbis] INFOGREFFE_API_KEY absent — repli sur registre public"
    );
    const fallback = await verifyViaRegistry(pro);
    return { ...fallback, provider: "infogreffe" };
  }

  // Placeholder : brancher ici l'achat PDF Infogreffe (~3 €) + parse SIREN.
  console.warn(
    "[kbis] INFOGREFFE_API_KEY présent mais connecteur d'achat non branché — repli registre"
  );
  const fallback = await verifyViaRegistry(pro);
  return { ...fallback, provider: "infogreffe" };
}

/** Lance la vérif d'identité (achat Kbis / registre) pour un pro. */
export async function purchaseAndVerifyKbis(
  pro: ProRegistration
): Promise<KbisVerifyResult> {
  const provider = resolveProvider();
  if (provider === "mock") return verifyViaMock(pro);
  if (provider === "infogreffe") return verifyViaInfogreffe(pro);
  return verifyViaRegistry(pro);
}

export function proNeedsKbisPurchaseGate(pro: ProRegistration): boolean {
  return pro.kbisPurchaseVerification?.status !== "passed";
}

export function buildKbisVerificationRecord(params: {
  result: KbisVerifyResult;
  stripeSessionId: string;
  feeRetainedCents?: number;
  refundedCents?: number;
  stripeRefundId?: string;
}): KbisPurchaseVerification {
  const fee = params.feeRetainedCents ?? KBIS_VERIFICATION_FEE_CENTS;
  return {
    status: params.result.ok ? "passed" : "failed",
    checkedAt: new Date().toISOString(),
    stripeSessionId: params.stripeSessionId,
    provider: params.result.provider,
    feeRetainedCents: params.result.ok ? 0 : fee,
    refundedCents: params.refundedCents,
    stripeRefundId: params.stripeRefundId,
    reason: params.result.reason,
    companyNameAtCheck: params.result.companyNameAtCheck,
  };
}
