/**
 * Client API Pennylane v2 — factures clients après paiement Stripe.
 * Docs: https://pennylane.readme.io/docs/create-a-customer-invoice-use-case
 */

import { BRAND } from "./brand";
import type { ProRegistration } from "./store-types";

const API_BASE = "https://app.pennylane.com/api/external/v2";

const FRANCHISE_MENTION =
  "TVA non applicable, article 293 B du CGI (franchise en base de TVA).";

function envFlagTrue(value: string | undefined): boolean {
  if (value == null) return false;
  const v = value.trim().toLowerCase();
  return v === "true" || v === "1" || v === "on" || v === "yes";
}

export function isPennylaneEnabled(): boolean {
  return (
    envFlagTrue(process.env.PENNYLANE_ENABLED) &&
    Boolean(process.env.PENNYLANE_API_TOKEN?.trim())
  );
}

function apiToken(): string {
  return process.env.PENNYLANE_API_TOKEN?.trim() ?? "";
}

function vatRate(): string {
  return (process.env.PENNYLANE_VAT_RATE?.trim() || "exempt").trim();
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatEurAmount(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

type PennylaneListResponse<T> = {
  items?: T[];
  total_items?: number;
};

async function pennylaneFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; status: number; data: T } | { ok: false; status: number; error: string }> {
  const token = apiToken();
  if (!token) {
    return { ok: false, status: 0, error: "PENNYLANE_API_TOKEN manquant." };
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 204) {
    return { ok: true, status: 204, data: undefined as T };
  }

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok) {
    const errObj = data as { error?: string; message?: string } | undefined;
    const msg =
      errObj?.error ||
      errObj?.message ||
      text.slice(0, 300) ||
      `HTTP ${res.status}`;
    return { ok: false, status: res.status, error: msg };
  }

  return { ok: true, status: res.status, data: data as T };
}

function billingAddressForPro(pro: ProRegistration): {
  address: string;
  postal_code: string;
  city: string;
  country_alpha2: "FR";
} {
  const city = (pro.city || "France").trim();
  const postal =
    pro.department === "62" ? "62000" : pro.department === "59" ? "59000" : "59000";
  return {
    address: `Siège social — ${city}`,
    postal_code: postal,
    city,
    country_alpha2: "FR",
  };
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Cherche un client Pennylane par external_reference (= proId). */
export async function findCustomerByExternalRef(
  externalReference: string
): Promise<number | null> {
  const filter = encodeURIComponent(
    JSON.stringify([
      {
        field: "external_reference",
        operator: "eq",
        value: externalReference,
      },
    ])
  );
  const result = await pennylaneFetch<
    PennylaneListResponse<{ id: number; external_reference?: string }>
  >(`/customers?filters=${filter}`);
  if (!result.ok) {
    console.error("[pennylane] find customer failed", result.error);
    return null;
  }
  const first = result.data.items?.[0];
  return first?.id ?? null;
}

/** Crée ou réutilise le client société Pennylane pour un pro. */
export async function upsertCompanyCustomer(
  pro: ProRegistration
): Promise<{ customerId: number } | { error: string }> {
  if (pro.pennylaneCustomerId && Number.isFinite(pro.pennylaneCustomerId)) {
    return { customerId: pro.pennylaneCustomerId };
  }

  const existing = await findCustomerByExternalRef(pro.id);
  if (existing != null) {
    return { customerId: existing };
  }

  const body = {
    name: pro.companyName,
    reg_no: digitsOnly(pro.siren || pro.siret).slice(0, 9) || undefined,
    phone: pro.phone || undefined,
    emails: pro.email ? [pro.email] : [],
    external_reference: pro.id,
    billing_language: "fr_FR" as const,
    payment_conditions: "upon_receipt" as const,
    billing_address: billingAddressForPro(pro),
  };

  const created = await pennylaneFetch<{ id: number }>(`/company_customers`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!created.ok) {
    return { error: created.error };
  }
  if (!created.data?.id) {
    return { error: "Réponse Pennylane sans customer id." };
  }
  return { customerId: created.data.id };
}

export type CreateCreditInvoiceInput = {
  pro: ProRegistration;
  customerId: number;
  stripeSessionId: string;
  /** Montant payé (€ TTC / HT selon régime — prix Checkout). */
  priceEur: number;
  /** Solde crédité (€). */
  creditEur: number;
};

export type CreateCreditInvoiceResult =
  | {
      invoiceId: number;
      invoiceNumber?: string;
      alreadyExisted: boolean;
      emailSent: boolean;
    }
  | { error: string; skipped?: boolean };

/**
 * Crée une facture finalisée pour un achat de solde, puis tente l’envoi e-mail.
 * Idempotent via external_reference = stripeSessionId (+ check local).
 */
export async function createPaidInvoiceForCreditPurchase(
  input: CreateCreditInvoiceInput
): Promise<CreateCreditInvoiceResult> {
  if (!isPennylaneEnabled()) {
    return { error: "Pennylane désactivé.", skipped: true };
  }

  const existingLocal = input.pro.pennylaneInvoices?.find(
    (inv) => inv.stripeSessionId === input.stripeSessionId
  );
  if (existingLocal) {
    return {
      invoiceId: existingLocal.invoiceId,
      invoiceNumber: existingLocal.invoiceNumber,
      alreadyExisted: true,
      emailSent: false,
    };
  }

  const price = Number(input.priceEur);
  if (!(price > 0)) {
    return { error: "Montant facture invalide." };
  }

  const date = todayIsoDate();
  const vat = vatRate();
  const label = `Solde ${BRAND.name} — ${formatEurAmount(input.creditEur)} € crédités`;

  const payload = {
    date,
    deadline: date,
    customer_id: input.customerId,
    draft: false,
    external_reference: input.stripeSessionId,
    pdf_invoice_subject: `Achat de solde ${BRAND.name}`,
    language: "fr_FR" as const,
    ...(vat === "exempt" ? { special_mention: FRANCHISE_MENTION } : {}),
    invoice_lines: [
      {
        label,
        quantity: 1,
        unit: "piece",
        raw_currency_unit_price: formatEurAmount(price),
        vat_rate: vat,
      },
    ],
  };

  const created = await pennylaneFetch<{
    id: number;
    invoice_number?: string | null;
  }>(`/customer_invoices`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!created.ok) {
    // Doublon éventuel (external_reference unique) → tenter de ne pas planter
    if (created.status === 409 || created.status === 422) {
      console.warn(
        "[pennylane] create invoice conflict",
        input.stripeSessionId,
        created.error
      );
    }
    return { error: created.error };
  }

  const invoiceId = created.data.id;
  const invoiceNumber = created.data.invoice_number ?? undefined;
  if (!invoiceId) {
    return { error: "Réponse Pennylane sans invoice id." };
  }

  const emailSent = await sendInvoiceByEmail(invoiceId, input.pro.email);
  return {
    invoiceId,
    invoiceNumber,
    alreadyExisted: false,
    emailSent,
  };
}

/** Envoie la facture ; en cas de 409 (PDF pas prêt), log et retourne false. */
export async function sendInvoiceByEmail(
  invoiceId: number,
  recipientEmail: string
): Promise<boolean> {
  const body =
    recipientEmail.trim().length > 0
      ? JSON.stringify({ recipients: [recipientEmail.trim()] })
      : undefined;

  const result = await pennylaneFetch<undefined>(
    `/customer_invoices/${invoiceId}/send_by_email`,
    {
      method: "POST",
      body,
    }
  );

  if (result.ok) return true;

  if (result.status === 409) {
    console.warn(
      "[pennylane] send_by_email PDF not ready yet",
      invoiceId,
      result.error
    );
    return false;
  }

  console.error(
    "[pennylane] send_by_email failed",
    invoiceId,
    result.status,
    result.error
  );
  return false;
}

/**
 * Orchestration complète après crédit solde Stripe.
 * Ne throw pas — retourne ok/error pour logging.
 */
export async function invoiceCreditPurchaseAfterStripe(params: {
  pro: ProRegistration;
  stripeSessionId: string;
  priceEur: number;
  creditEur: number;
}): Promise<
  | {
      ok: true;
      customerId: number;
      invoiceId: number;
      invoiceNumber?: string;
      alreadyExisted: boolean;
      emailSent: boolean;
    }
  | { ok: false; error: string; skipped?: boolean }
> {
  if (!isPennylaneEnabled()) {
    return { ok: false, error: "Pennylane désactivé.", skipped: true };
  }

  try {
    const customer = await upsertCompanyCustomer(params.pro);
    if ("error" in customer) {
      return { ok: false, error: customer.error };
    }

    const invoice = await createPaidInvoiceForCreditPurchase({
      pro: params.pro,
      customerId: customer.customerId,
      stripeSessionId: params.stripeSessionId,
      priceEur: params.priceEur,
      creditEur: params.creditEur,
    });

    if ("error" in invoice) {
      return {
        ok: false,
        error: invoice.error,
        skipped: invoice.skipped,
      };
    }

    return {
      ok: true,
      customerId: customer.customerId,
      invoiceId: invoice.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      alreadyExisted: invoice.alreadyExisted,
      emailSent: invoice.emailSent,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[pennylane] unexpected error", message);
    return { ok: false, error: message };
  }
}
