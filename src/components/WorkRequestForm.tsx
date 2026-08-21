"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ClientQualificationGuide from "@/components/ClientQualificationGuide";
import {
  LISTING_DURATION_OPTIONS,
  DEFAULT_LISTING_DURATION_HOURS,
} from "@/lib/auction-duration";
import {
  minRequestedWorkStartDate,
  maxRequestedWorkStartDate,
  validateDescription,
  validatePhotoFiles,
  validatePreviousQuotePair,
  validateRequestedWorkStartDate,
  MIN_DESCRIPTION_LENGTH,
  MAX_PHOTOS,
} from "@/lib/demandes-validation";
import {
  getNafOptionsForCategory,
  validateWorkRequestNafSelection,
} from "@/lib/naf-codes";
import {
  getWorkOptionsForNafCodes,
  OTHER_WORK_DESCRIPTION_MAX,
  OTHER_WORK_DESCRIPTION_MIN,
  OTHER_WORK_OPTION_ID,
  type PricingTierId,
  validatePricingSelection,
} from "@/lib/pricing-tiers";
import { WorkCategoryIcon } from "@/components/WorkTradesIcons";
import { isWorkCategory, WORK_CATEGORIES } from "@/lib/work-categories";
import {
  formatFrenchPhoneDisplay,
  normalizeFrenchMobile,
} from "@/lib/phone-format";
import {
  isValidSiretFormat,
  normalizeSiret,
  type RcsVerificationResult,
} from "@/lib/rcs";
import { MIN_GOOGLE_RATING_OPTIONS } from "@/lib/google-rating";
import { WORK_SCOPE_LABELS } from "@/lib/copropriete";
import type { ClientKind, WorkScope } from "@/lib/store-types";
import BanAddressAutocomplete, {
  type SelectedBanAddress,
} from "@/components/BanAddressAutocomplete";

const LEAD_FORM_CONVERSION_EVENT = "manual_event_SUBMIT_LEAD_FORM";

function trackLeadFormConversion() {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", LEAD_FORM_CONVERSION_EVENT);
}

export interface WorkRequestFormDefaults {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  phoneVerifiedE164?: string;
  phoneVerifiedAt?: string;
}

interface Props {
  defaults?: WorkRequestFormDefaults;
  /** Lien après succès (espace client). */
  successHref?: string;
  /** Catégorie préremplie (ex. depuis l’accueil). */
  initialCategory?: string;
  /**
   * Demande sans compte : champs contact éditables, OTP invité,
   * puis invitation à créer un espace pour suivre les demandes.
   */
  guestMode?: boolean;
}

export default function WorkRequestForm({
  defaults,
  successHref = "/particulier/espace/demandes",
  initialCategory,
  guestMode = false,
}: Props) {
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [submittedContact, setSubmittedContact] = useState<{
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [category, setCategory] = useState(() =>
    initialCategory && isWorkCategory(initialCategory) ? initialCategory : ""
  );
  const [selectedNafCodes, setSelectedNafCodes] = useState<string[]>(() => {
    if (!initialCategory || !isWorkCategory(initialCategory)) return [];
    const options = getNafOptionsForCategory(initialCategory);
    return options.length === 1 ? [options[0].code] : [];
  });
  const [workOptionId, setWorkOptionId] = useState("");
  const [pricingTier, setPricingTier] = useState<PricingTierId | "">("");
  const [workOptionOtherDescription, setWorkOptionOtherDescription] =
    useState("");
  const [hasPreviousQuote, setHasPreviousQuote] = useState(false);
  const [previousQuoteAmount, setPreviousQuoteAmount] = useState("");
  const [previousQuoteProof, setPreviousQuoteProof] = useState<File | null>(null);
  const [previousQuoteNote, setPreviousQuoteNote] = useState("");
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<SelectedBanAddress | null>(null);
  const [requestedWorkStartDate, setRequestedWorkStartDate] = useState("");
  const [listingDurationHours, setListingDurationHours] = useState(
    DEFAULT_LISTING_DURATION_HOURS
  );
  const [preferEstablishedCompany, setPreferEstablishedCompany] = useState(false);
  const [maxContactArtisans, setMaxContactArtisans] = useState(5);
  const [minGoogleRating, setMinGoogleRating] = useState<number | "">("");
  const [acceptContactTerms, setAcceptContactTerms] = useState(false);
  const [phone, setPhone] = useState(defaults?.phone ?? "");
  const [phoneVerifiedE164, setPhoneVerifiedE164] = useState(
    defaults?.phoneVerifiedE164 ?? ""
  );
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [clientKind, setClientKind] = useState<ClientKind>("individual");
  const [workScope, setWorkScope] = useState<WorkScope | "">("");
  const [clientSiret, setClientSiret] = useState("");
  const [companyVerification, setCompanyVerification] =
    useState<RcsVerificationResult | null>(null);
  const [verifyingCompany, setVerifyingCompany] = useState(false);

  const descriptionOk = descriptionLength >= MIN_DESCRIPTION_LENGTH;
  const minStartDate = minRequestedWorkStartDate(listingDurationHours);
  const maxStartDate = maxRequestedWorkStartDate();
  const nafOptions = category ? getNafOptionsForCategory(category) : [];
  const requiresNafChoice = nafOptions.length > 1;
  const effectiveNafCodes =
    selectedNafCodes.length > 0
      ? selectedNafCodes
      : nafOptions.length === 1
        ? [nafOptions[0].code]
        : [];
  const workOptions = getWorkOptionsForNafCodes(effectiveNafCodes);
  const phoneE164 = normalizeFrenchMobile(phone);
  const phoneVerified =
    Boolean(phoneE164) &&
    Boolean(phoneVerifiedE164) &&
    phoneE164 === phoneVerifiedE164;

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const id = window.setInterval(() => {
      setOtpCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [otpCooldown]);

  function handleCategoryChange(next: string) {
    setCategory(next);
    const options = getNafOptionsForCategory(next);
    setSelectedNafCodes(options.length === 1 ? [options[0].code] : []);
    setWorkOptionId("");
    setPricingTier("");
    setWorkOptionOtherDescription("");
    setError(null);
  }

  function toggleNafCode(code: string) {
    setSelectedNafCodes((prev) => {
      const next = prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code];
      return next;
    });
    setWorkOptionId("");
    setPricingTier("");
    setWorkOptionOtherDescription("");
    setError(null);
  }

  function selectWorkOption(id: string) {
    const opt = workOptions.find((o) => o.id === id);
    setWorkOptionId(id);
    if (opt) {
      setPricingTier(opt.tier);
      setWorkOptionOtherDescription("");
    }
    setError(null);
  }

  function selectOtherWorkOption() {
    setWorkOptionId(OTHER_WORK_OPTION_ID);
    setPricingTier("bas");
    setError(null);
  }

  function handlePhoneChange(value: string) {
    setPhone(value);
    setOtpMessage(null);
    const next = normalizeFrenchMobile(value);
    if (!next || next !== phoneVerifiedE164) {
      // Ne pas effacer phoneVerifiedE164 du compte : on recalcule phoneVerified
      // via la comparaison avec la saisie courante.
    }
  }

  async function sendPhoneOtp() {
    setOtpSending(true);
    setOtpMessage(null);
    setError(null);
    const endpoint = guestMode
      ? "/api/guest/phone-verification/send"
      : "/api/client/phone-verification/send";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setOtpSending(false);
    if (!res.ok) {
      if (typeof data.cooldownSeconds === "number") {
        setOtpCooldown(data.cooldownSeconds);
      }
      // En mode invité, un 409 signifie déjà vérifié : on peut continuer.
      if (guestMode && res.status === 409) {
        const e164 = normalizeFrenchMobile(phone);
        if (e164) setPhoneVerifiedE164(e164);
        setOtpMessage(data.error ?? "Mobile déjà vérifié.");
        return;
      }
      setOtpMessage(data.error ?? "Envoi du SMS impossible.");
      return;
    }
    if (typeof data.cooldownSeconds === "number") {
      setOtpCooldown(data.cooldownSeconds);
    }
    setOtpMessage(data.message ?? "Code envoyé par SMS.");
  }

  async function verifyPhoneOtp() {
    setOtpVerifying(true);
    setOtpMessage(null);
    setError(null);
    const endpoint = guestMode
      ? "/api/guest/phone-verification/verify"
      : "/api/client/phone-verification/verify";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code: otpCode }),
    });
    const data = await res.json();
    setOtpVerifying(false);
    if (!res.ok) {
      setOtpMessage(data.error ?? "Code incorrect.");
      return;
    }
    setPhoneVerifiedE164(data.phoneVerifiedE164 ?? "");
    if (data.phoneDisplay) setPhone(data.phoneDisplay);
    setOtpCode("");
    setOtpMessage("Mobile vérifié.");
  }

  function syncDescriptionLength(value: string) {
    setDescriptionLength(value.trim().length);
  }

  function getDescriptionValue() {
    return descriptionRef.current?.value ?? "";
  }

  function handlePhotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list) return;

    previews.forEach((url) => URL.revokeObjectURL(url));

    const files = Array.from(list);
    setPhotoFiles(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
    setError(null);
  }

  function handleProofChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setPreviousQuoteProof(file);
    if (file && file.type.startsWith("image/")) {
      setProofPreview(URL.createObjectURL(file));
    } else {
      setProofPreview(null);
    }
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const descError = validateDescription(getDescriptionValue());
    if (descError) {
      setError(descError);
      setStatus("error");
      return;
    }

    const photosError = validatePhotoFiles(photoFiles);
    if (photosError) {
      setError(photosError);
      setStatus("error");
      return;
    }

    if (hasPreviousQuote) {
      const quoteError = validatePreviousQuotePair(previousQuoteAmount, previousQuoteProof);
      if (quoteError) {
        setError(quoteError);
        setStatus("error");
        return;
      }
    }

    const form = e.currentTarget;

    if (!selectedAddress?.banAddressId) {
      setError(
        "Sélectionnez votre adresse dans la liste officielle (Base Adresse Nationale)."
      );
      setStatus("error");
      return;
    }

    const startDateError = validateRequestedWorkStartDate(
      requestedWorkStartDate,
      listingDurationHours
    );
    if (startDateError) {
      setError(startDateError);
      setStatus("error");
      return;
    }

    const phoneValue = phone.trim();
    if (!phoneValue) {
      setError("Le numéro de téléphone est obligatoire.");
      setStatus("error");
      return;
    }
    if (!normalizeFrenchMobile(phoneValue)) {
      setError("Indiquez un mobile français valide (06 ou 07).");
      setStatus("error");
      return;
    }
    if (!phoneVerified) {
      setError("Vérifiez votre mobile par SMS avant d'envoyer la demande.");
      setStatus("error");
      return;
    }

    if (clientKind === "company") {
      if (!companyVerification?.valid) {
        setError("Vérifiez le SIRET de votre entreprise avant d'envoyer.");
        setStatus("error");
        return;
      }
    }

    if (clientKind === "copropriete" && !workScope) {
      setError(
        "Indiquez si les travaux concernent les parties communes ou un lot privatif."
      );
      setStatus("error");
      return;
    }

    if (!acceptContactTerms) {
      setError(
        "Vous devez accepter les CGU / CGV pour autoriser la mise en contact avec les artisans."
      );
      setStatus("error");
      return;
    }

    if (!category) {
      setError("Choisissez un type de travaux.");
      setStatus("error");
      return;
    }

    const nafCheck = validateWorkRequestNafSelection(category, selectedNafCodes);
    if (!nafCheck.ok) {
      setError(nafCheck.error);
      setStatus("error");
      return;
    }

    const pricingCheck = validatePricingSelection({
      pricingTier,
      workOptionId: workOptionId || undefined,
      workOptionOtherDescription:
        workOptionId === OTHER_WORK_OPTION_ID
          ? workOptionOtherDescription
          : undefined,
      nafCodes: nafCheck.nafCodes,
    });
    if (!pricingCheck.ok) {
      setError(pricingCheck.error);
      setStatus("error");
      return;
    }

    setStatus("submitting");

    const formData = new FormData(form);
    formData.delete("nafCodes");
    for (const code of nafCheck.nafCodes) {
      formData.append("nafCodes", code);
    }
    formData.set("pricingTier", pricingCheck.pricingTier);
    if (pricingCheck.workOptionId) {
      formData.set("workOptionId", pricingCheck.workOptionId);
    } else {
      formData.delete("workOptionId");
    }
    if (pricingCheck.workOptionOtherDescription) {
      formData.set(
        "workOptionOtherDescription",
        pricingCheck.workOptionOtherDescription
      );
    } else {
      formData.delete("workOptionOtherDescription");
    }
    formData.set("description", getDescriptionValue().trim());
    formData.set("addressLine", selectedAddress.addressLine);
    formData.set("postalCode", selectedAddress.postalCode);
    formData.set("city", selectedAddress.city);
    formData.set("banAddressId", selectedAddress.banAddressId);
    formData.set("requestedWorkStartDate", requestedWorkStartDate);
    formData.set("phone", phoneValue);
    formData.set("auctionDurationHours", String(listingDurationHours));
    formData.set(
      "preferEstablishedCompany",
      preferEstablishedCompany ? "true" : "false"
    );
    formData.set("maxContactArtisans", String(maxContactArtisans));
    if (minGoogleRating !== "") {
      formData.set("minGoogleRating", String(minGoogleRating));
    } else {
      formData.delete("minGoogleRating");
    }
    formData.set("acceptContactTerms", acceptContactTerms ? "true" : "false");
    formData.delete("smsContactAlertsEnabled");
    formData.delete("startPriceMode");
    formData.delete("clientStartPrice");
    formData.set("clientKind", clientKind);
    if (clientKind === "company" && companyVerification) {
      formData.set("clientSiret", companyVerification.siret);
      formData.set("clientSiren", companyVerification.siren);
      formData.set("companyName", companyVerification.companyName ?? "");
    } else {
      formData.delete("clientSiret");
      formData.delete("clientSiren");
      formData.delete("companyName");
    }
    if (clientKind === "copropriete" && workScope) {
      formData.set("workScope", workScope);
    } else {
      formData.delete("workScope");
    }
    formData.delete("photos");
    photoFiles.forEach((file) => formData.append("photos", file));
    if (hasPreviousQuote) {
      formData.set("previousQuoteAmount", previousQuoteAmount);
      formData.set("previousQuoteNote", previousQuoteNote);
      formData.delete("previousQuoteProof");
      if (previousQuoteProof) formData.append("previousQuoteProof", previousQuoteProof);
    } else {
      formData.delete("previousQuoteAmount");
      formData.delete("previousQuoteNote");
      formData.delete("previousQuoteProof");
    }

    const res = await fetch("/api/demandes", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Erreur lors de l'envoi.");
      setStatus("error");
      return;
    }

    const body = (await res.json()) as { id?: string; guest?: boolean };
    trackLeadFormConversion();
    setCreatedRequestId(body.id ?? null);
    setSubmittedContact({
      email: String(formData.get("email") ?? "").trim(),
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
    });
    setStatus("success");
    if (descriptionRef.current) {
      descriptionRef.current.value = "";
    }
    setDescriptionLength(0);
    setPhotoFiles([]);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
    setCategory("");
    setHasPreviousQuote(false);
    setPreviousQuoteAmount("");
    setPreviousQuoteProof(null);
    setPreviousQuoteNote("");
    setAcceptContactTerms(false);
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofPreview(null);
    setSelectedAddress(null);
    setRequestedWorkStartDate("");
    setClientKind("individual");
    setWorkScope("");
    setClientSiret("");
    setCompanyVerification(null);
    form.reset();
  }

  async function handleVerifyCompany() {
    setError(null);
    const normalized = normalizeSiret(clientSiret);
    if (!isValidSiretFormat(normalized)) {
      setError("Numéro SIRET invalide (14 chiffres).");
      setCompanyVerification(null);
      return;
    }
    setVerifyingCompany(true);
    try {
      const response = await fetch("/api/verify-rcs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siret: normalized, requireNord: false }),
      });
      const data = (await response.json()) as RcsVerificationResult;
      if (!response.ok || !data.valid) {
        setCompanyVerification(null);
        setError(data.error ?? "Entreprise introuvable ou inactive.");
        return;
      }
      setCompanyVerification(data);
    } catch {
      setError("Impossible de vérifier le SIRET.");
      setCompanyVerification(null);
    } finally {
      setVerifyingCompany(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm";

  return (
    <div className="mt-8 space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
      >
      <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
        <p className="font-medium">Pour une annonce de qualité :</p>
        <ul className="mt-1 list-inside list-disc text-brand-800">
          <li>Description d&apos;au moins {MIN_DESCRIPTION_LENGTH} caractères</li>
          <li>Photos du chantier (recommandées, optionnelles)</li>
          <li>Mobile vérifié par SMS pour être joint par les artisans</li>
          <li>Adresse du chantier vérifiée via la Base Adresse Nationale (État)</li>
          <li>Date souhaitée de début des travaux</li>
          <li>Option : joindre un devis déjà reçu (montant + justificatif) pour contextualiser</li>
        </ul>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-900">
          Type de travaux <span className="text-red-500">*</span>
        </legend>
        <p className="mt-1 text-xs text-slate-600">
          Choisissez la catégorie qui correspond à votre chantier.
        </p>
        <input type="hidden" name="category" value={category} />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {WORK_CATEGORIES.map((cat) => {
            const selected = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  selected
                    ? "border-brand-500 bg-brand-50 text-slate-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-brand-300"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    selected
                      ? "bg-brand-100 text-brand-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <WorkCategoryIcon category={cat} className="h-4 w-4" />
                </span>
                <span className="font-medium leading-snug">{cat}</span>
              </button>
            );
          })}
        </div>
        {!category && (
          <p className="mt-2 text-xs font-medium text-amber-700">
            Sélectionnez un type de travaux pour continuer.
          </p>
        )}
      </fieldset>

      {requiresNafChoice && (
        <fieldset className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-900">
            Spécialité NAF <span className="text-red-500">*</span>
          </legend>
          <p className="mt-1 text-xs text-slate-600">
            Ce type de travaux couvre plusieurs activités. Cochez celles qui
            correspondent à votre chantier (au moins une).
          </p>
          <ul className="mt-3 space-y-2">
            {nafOptions.map((opt) => {
              const checked = selectedNafCodes.includes(opt.code);
              return (
                <li key={opt.code}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm hover:border-brand-300">
                    <input
                      type="checkbox"
                      name="nafCodes"
                      value={opt.code}
                      checked={checked}
                      onChange={() => toggleNafCode(opt.code)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-slate-900">
                        {opt.code}
                      </span>
                      <span className="mt-0.5 block text-slate-600">
                        {opt.label}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {selectedNafCodes.length === 0 && (
            <p className="mt-2 text-xs font-medium text-amber-700">
              Sélection obligatoire pour continuer.
            </p>
          )}
        </fieldset>
      )}

      {category && effectiveNafCodes.length > 0 && (
        <fieldset className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-900">
            Type de prestation <span className="text-red-500">*</span>
          </legend>
          <p className="mt-1 text-xs text-slate-600">
            Indiquez la nature des travaux pour mieux matcher les artisans.
          </p>

          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {workOptions.map((opt) => {
              const checked = workOptionId === opt.id;
              return (
                <li key={opt.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm hover:border-brand-300">
                    <input
                      type="radio"
                      name="workOptionId"
                      value={opt.id}
                      checked={checked}
                      onChange={() => selectWorkOption(opt.id)}
                      className="mt-1"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-slate-900">
                        {opt.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-600">
                        {opt.detail}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
            <li>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm hover:border-brand-300">
                <input
                  type="radio"
                  name="workOptionId"
                  value={OTHER_WORK_OPTION_ID}
                  checked={workOptionId === OTHER_WORK_OPTION_ID}
                  onChange={() => selectOtherWorkOption()}
                  className="mt-1"
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-slate-900">Autre</span>
                  <span className="mt-0.5 block text-xs text-slate-600">
                    Prestation non listée — décrivez-la brièvement
                  </span>
                </span>
              </label>
            </li>
          </ul>

          {workOptionId === OTHER_WORK_OPTION_ID && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Courte description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="workOptionOtherDescription"
                value={workOptionOtherDescription}
                onChange={(e) =>
                  setWorkOptionOtherDescription(e.target.value.slice(0, OTHER_WORK_DESCRIPTION_MAX))
                }
                placeholder="Ex. débouchage WC + remplacement robinet cuisine"
                className={inputClass}
                required
                minLength={OTHER_WORK_DESCRIPTION_MIN}
                maxLength={OTHER_WORK_DESCRIPTION_MAX}
              />
              <p className="mt-1 text-xs text-slate-500">
                {workOptionOtherDescription.trim().length} /{" "}
                {OTHER_WORK_DESCRIPTION_MIN} car. min. (max.{" "}
                {OTHER_WORK_DESCRIPTION_MAX})
              </p>
            </div>
          )}

          {workOptionId && workOptionId !== OTHER_WORK_OPTION_ID && (
            <input type="hidden" name="pricingTier" value={pricingTier} />
          )}
          {workOptionId === OTHER_WORK_OPTION_ID && (
            <input type="hidden" name="pricingTier" value="bas" />
          )}

          {!workOptionId && (
            <p className="mt-2 text-xs font-medium text-amber-700">
              Sélectionnez une prestation pour continuer.
            </p>
          )}
        </fieldset>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-900">
          Vous déposez cette demande en tant que — l&apos;annonce est anonyme
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ["individual", "Particulier", "Travaux pour votre logement."],
              [
                "company",
                "Entreprise",
                "Au nom d’une société (SIRET obligatoire).",
              ],
              [
                "copropriete",
                "Copropriété",
                "Syndic ou conseil — l’annonce restera anonyme.",
              ],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className={`flex cursor-pointer flex-col rounded-lg border px-3 py-3 text-sm ${
                clientKind === value
                  ? "border-brand-400 bg-brand-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="clientKindChoice"
                  checked={clientKind === value}
                  onChange={() => {
                    setClientKind(value);
                    setCompanyVerification(null);
                    setClientSiret("");
                    setWorkScope("");
                    setError(null);
                  }}
                  className="accent-brand-600"
                />
                <span className="font-medium text-slate-900">{label}</span>
              </span>
              <span className="mt-1 text-xs text-slate-500">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {clientKind === "company" && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div>
            <label htmlFor="clientSiret" className="mb-1 block text-sm font-medium text-slate-700">
              SIRET de l&apos;entreprise <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id="clientSiret"
                type="text"
                inputMode="numeric"
                placeholder="14 chiffres"
                value={clientSiret}
                onChange={(e) => {
                  setClientSiret(e.target.value);
                  setCompanyVerification(null);
                }}
                className={`${inputClass} sm:max-w-xs`}
              />
              <button
                type="button"
                onClick={handleVerifyCompany}
                disabled={verifyingCompany}
                className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
              >
                {verifyingCompany ? "Vérification…" : "Vérifier le SIRET"}
              </button>
            </div>
          </div>
          {companyVerification?.valid && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Entreprise vérifiée :{" "}
              <strong>{companyVerification.companyName}</strong> · SIRET{" "}
              {companyVerification.siret}
            </p>
          )}
          <p className="text-xs text-slate-500">
            Vérification via la base SIRENE (existence légale). Indiquez ensuite le contact
            (prénom / nom).
          </p>
        </div>
      )}

      {clientKind === "copropriete" && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-sky-50/60 p-4">
          <p className="text-sm text-slate-700">
            L&apos;annonce affichera uniquement un bandeau{" "}
            <strong>Copropriété</strong>. Le nom de l&apos;immeuble, le syndic et
            vos coordonnées restent masqués jusqu&apos;au déblocage par un artisan.
          </p>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">
              Nature des travaux <span className="text-red-500">*</span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["commun", "privatif"] as const).map((scope) => (
                <label
                  key={scope}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border bg-white px-3 py-2.5 text-sm ${
                    workScope === scope
                      ? "border-sky-400"
                      : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="workScopeChoice"
                    checked={workScope === scope}
                    onChange={() => setWorkScope(scope)}
                    className="mt-0.5 accent-sky-700"
                  />
                  <span>
                    <span className="font-medium text-slate-900">
                      {WORK_SCOPE_LABELS[scope]}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {scope === "commun"
                        ? "Toiture, façade, parties communes…"
                        : "Travaux dans un lot privatif."}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <input
          name="firstName"
          type="text"
          placeholder={
            clientKind === "individual" ? "Prénom" : "Prénom du contact"
          }
          className={inputClass}
          required
          defaultValue={defaults?.firstName ?? ""}
          readOnly={!guestMode}
        />
        <input
          name="lastName"
          type="text"
          placeholder={
            clientKind === "individual" ? "Nom" : "Nom du contact"
          }
          className={inputClass}
          required
          defaultValue={defaults?.lastName ?? ""}
          readOnly={!guestMode}
        />
      </div>
      <input
        name="email"
        type="email"
        placeholder="Email"
        className={inputClass}
        required
        defaultValue={defaults?.email ?? ""}
        readOnly={!guestMode}
      />
      <div>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          placeholder="Mobile (ex. 06 12 34 56 78)"
          className={inputClass}
          required
          autoComplete="tel"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          Mobile français obligatoire, vérifié par SMS — communiqué aux artisans
          uniquement après mise en contact.
        </p>
        {phoneVerified ? (
          <p className="mt-2 text-sm font-medium text-emerald-700">
            ✓ Mobile vérifié
            {phoneE164
              ? ` — ${formatFrenchPhoneDisplay(phoneE164)}`
              : ""}
          </p>
        ) : (
          <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void sendPhoneOtp()}
                disabled={otpSending || otpCooldown > 0 || !phoneE164}
                className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {otpSending
                  ? "Envoi…"
                  : otpCooldown > 0
                    ? `Renvoyer (${otpCooldown}s)`
                    : "Recevoir un code"}
              </button>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="Code à 6 chiffres"
                value={otpCode}
                onChange={(e) =>
                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="min-w-[9rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void verifyPhoneOtp()}
                disabled={otpVerifying || otpCode.length !== 6}
                className="rounded-lg border border-brand-600 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
              >
                {otpVerifying ? "Vérif…" : "Vérifier"}
              </button>
            </div>
            {otpMessage && (
              <p
                className={`text-xs ${
                  otpMessage.includes("vérifié") ||
                  otpMessage.includes("envoyé") ||
                  otpMessage.includes("démo")
                    ? "text-emerald-700"
                    : "text-amber-800"
                }`}
              >
                {otpMessage}
              </p>
            )}
          </div>
        )}
      </div>

      <BanAddressAutocomplete
        inputClass={inputClass}
        onSelect={setSelectedAddress}
      />

      <input type="hidden" name="addressLine" value={selectedAddress?.addressLine ?? ""} />
      <input type="hidden" name="postalCode" value={selectedAddress?.postalCode ?? ""} />
      <input type="hidden" name="city" value={selectedAddress?.city ?? ""} />
      <input type="hidden" name="banAddressId" value={selectedAddress?.banAddressId ?? ""} />

      <div>
        <label htmlFor="addressLine2" className="mb-1 block text-sm font-medium text-slate-700">
          Complément d&apos;adresse
        </label>
        <input
          id="addressLine2"
          name="addressLine2"
          type="text"
          placeholder="Appartement 3, bâtiment B, résidence…"
          className={inputClass}
          autoComplete="address-line2"
        />
      </div>

      <p className="-mt-2 text-xs text-slate-500">
        Nord (59) et Pas-de-Calais (62) uniquement. L&apos;adresse exacte n&apos;est
        communiquée aux artisans qu&apos;après déblocage des coordonnées. Vérification
        automatique via data.gouv.fr à l&apos;envoi.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="listingDurationHours"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Durée de l&apos;annonce <span className="text-red-500">*</span>
          </label>
          <select
            id="listingDurationHours"
            name="auctionDurationHours"
            className={`${inputClass} text-slate-700`}
            value={listingDurationHours}
            onChange={(e) => {
              const next = Number(e.target.value);
              setListingDurationHours(next);
              const minDate = minRequestedWorkStartDate(next);
              if (requestedWorkStartDate && requestedWorkStartDate < minDate) {
                setRequestedWorkStartDate("");
              }
            }}
            required
          >
            {LISTING_DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Période pendant laquelle les artisans peuvent débloquer votre contact
            (de 6&nbsp;h à 3 mois, max. 5 artisans).
          </p>
        </div>
        <div>
          <label
            htmlFor="requestedWorkStartDate"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Date de début de travaux souhaitée <span className="text-red-500">*</span>
          </label>
          <input
            key={`start-date-${minStartDate}`}
            id="requestedWorkStartDate"
            name="requestedWorkStartDate"
            type="date"
            value={requestedWorkStartDate}
            onChange={(e) => {
              const next = e.target.value;
              if (!next) {
                setRequestedWorkStartDate("");
                return;
              }
              if (next < minStartDate || next > maxStartDate) {
                setRequestedWorkStartDate("");
                setError(
                  `Choisissez une date à partir du ${new Date(
                    `${minStartDate}T12:00:00`
                  ).toLocaleDateString("fr-FR")} (fin d'annonce).`
                );
                return;
              }
              setError(null);
              setRequestedWorkStartDate(next);
            }}
            min={minStartDate}
            max={maxStartDate}
            className={inputClass}
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Le calendrier bloque les dates avant la fin de l&apos;annonce (
            {new Date(`${minStartDate}T12:00:00`).toLocaleDateString("fr-FR")}).
          </p>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">
          Nombre d&apos;artisans <span className="text-red-500">*</span>
        </legend>
        <p className="mb-2 text-xs text-slate-500">
          Combien d&apos;artisans maximum pourront débloquer vos coordonnées
          et vous contacter (1 à 5).
        </p>
        <div className="grid grid-cols-5 gap-2">
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <label
              key={n}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border px-2 py-3 text-sm ${
                maxContactArtisans === n
                  ? "border-brand-500 bg-brand-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <input
                type="radio"
                name="maxContactArtisans"
                value={n}
                checked={maxContactArtisans === n}
                onChange={() => setMaxContactArtisans(n)}
                className="sr-only"
              />
              <span className="text-lg font-semibold text-slate-900">{n}</span>
              <span className="text-[10px] text-slate-500">
                {n === 1 ? "artisan" : "artisans"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">
          Ancienneté de l&apos;entreprise <span className="text-red-500">*</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              !preferEstablishedCompany
                ? "border-brand-500 bg-brand-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <input
              type="radio"
              name="preferEstablishedCompany"
              value="false"
              checked={!preferEstablishedCompany}
              onChange={() => setPreferEstablishedCompany(false)}
              className="mt-1"
            />
            <span>
              <span className="font-semibold text-slate-900">
                0 à 5 ans d&apos;existence
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Uniquement des entreprises créées il y a moins de 5 ans.
              </span>
            </span>
          </label>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              preferEstablishedCompany
                ? "border-brand-500 bg-brand-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <input
              type="radio"
              name="preferEstablishedCompany"
              value="true"
              checked={preferEstablishedCompany}
              onChange={() => setPreferEstablishedCompany(true)}
              className="mt-1"
            />
            <span>
              <span className="font-semibold text-slate-900">
                5 ans et plus (5+)
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Uniquement des entreprises créées il y a 5 ans ou plus.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">
          Note Google minimale
        </legend>
        <p className="mb-2 text-xs text-slate-500">
          Optionnel. Les artisans dont la note Google connue est inférieure au
          seuil ne pourront pas débloquer vos coordonnées.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              minGoogleRating === ""
                ? "border-brand-500 bg-brand-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <input
              type="radio"
              name="minGoogleRating"
              value=""
              checked={minGoogleRating === ""}
              onChange={() => setMinGoogleRating("")}
              className="mt-1"
            />
            <span>
              <span className="font-semibold text-slate-900">Peu importe</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Pas de filtre sur la note Google.
              </span>
            </span>
          </label>
          {MIN_GOOGLE_RATING_OPTIONS.map((value) => (
            <label
              key={value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                minGoogleRating === value
                  ? "border-brand-500 bg-brand-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <input
                type="radio"
                name="minGoogleRating"
                value={String(value)}
                checked={minGoogleRating === value}
                onChange={() => setMinGoogleRating(value)}
                className="mt-1"
              />
              <span>
                <span className="font-semibold text-slate-900">
                  ≥ {String(value).replace(".", ",")}/5
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Note Google minimale souhaitée.
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <ClientQualificationGuide selectedCategory={category} />

      <div>
        <textarea
          ref={descriptionRef}
          name="description"
          placeholder="Décrivez précisément votre projet : surface, matériaux, contraintes, accès…"
          rows={5}
          lang="fr"
          spellCheck
          className={`${inputClass} ${!descriptionOk && descriptionLength > 0 ? "border-amber-400" : ""}`}
          required
          minLength={MIN_DESCRIPTION_LENGTH}
          onInput={(e) => syncDescriptionLength(e.currentTarget.value)}
          onChange={(e) => syncDescriptionLength(e.currentTarget.value)}
        />
        <p
          className={`mt-1 text-xs ${descriptionOk ? "text-brand-600" : "text-slate-500"}`}
        >
          {descriptionLength} / {MIN_DESCRIPTION_LENGTH} caractères minimum
          {descriptionOk ? " ✓" : ""}
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Photos du projet{" "}
          <span className="font-normal text-slate-500">(optionnel)</span>
        </label>
        <input
          type="file"
          name="photos"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          onChange={handlePhotosChange}
          className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700"
        />
        <p className="mt-1 text-xs text-slate-500">
          Recommandé pour aider les artisans · JPG, PNG ou WebP · max {MAX_PHOTOS}{" "}
          photos · 5 Mo chacune
        </p>
        {previews.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={`Aperçu ${i + 1}`}
                className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
              />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={hasPreviousQuote}
            onChange={(e) => {
              setHasPreviousQuote(e.target.checked);
              if (!e.target.checked) {
                setPreviousQuoteAmount("");
                setPreviousQuoteProof(null);
                setPreviousQuoteNote("");
                if (proofPreview) URL.revokeObjectURL(proofPreview);
                setProofPreview(null);
              }
              setError(null);
            }}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          <span>
            <span className="block text-sm font-medium text-slate-800">
              J&apos;ai déjà reçu un devis d&apos;un autre artisan
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Optionnel — justificatif visible par Nord Artisan Pro, utile pour
              contextualiser votre projet.
            </span>
          </span>
        </label>

        {hasPreviousQuote && (
          <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
            <div>
              <label htmlFor="previousQuoteAmount" className="mb-1 block text-sm font-medium text-slate-700">
                Montant du devis (€) <span className="text-red-500">*</span>
              </label>
              <input
                id="previousQuoteAmount"
                name="previousQuoteAmount"
                type="number"
                min={1}
                step={1}
                value={previousQuoteAmount}
                onChange={(e) => setPreviousQuoteAmount(e.target.value)}
                placeholder="Ex. 4500"
                className={inputClass}
                required={hasPreviousQuote}
              />
            </div>
            <div>
              <label htmlFor="previousQuoteProof" className="mb-1 block text-sm font-medium text-slate-700">
                Justificatif (photo ou PDF) <span className="text-red-500">*</span>
              </label>
              <input
                id="previousQuoteProof"
                name="previousQuoteProof"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleProofChange}
                className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700"
                required={hasPreviousQuote}
              />
              <p className="mt-1 text-xs text-slate-500">
                Photo du devis papier, capture d&apos;écran ou PDF · max 10 Mo
              </p>
              {proofPreview && (
                <img
                  src={proofPreview}
                  alt="Aperçu du justificatif"
                  className="mt-2 max-h-32 rounded-lg border border-slate-200 object-contain"
                />
              )}
              {previousQuoteProof?.type === "application/pdf" && (
                <p className="mt-2 text-xs text-brand-700">
                  PDF sélectionné : {previousQuoteProof.name}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="previousQuoteNote" className="mb-1 block text-sm font-medium text-slate-700">
                Précisions (optionnel)
              </label>
              <input
                id="previousQuoteNote"
                name="previousQuoteNote"
                type="text"
                value={previousQuoteNote}
                onChange={(e) => setPreviousQuoteNote(e.target.value)}
                placeholder="Ex. Devis SARL Dupont, reçu en mars 2026"
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      <fieldset className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <legend className="px-1 text-sm font-medium text-slate-700">
          Conditions obligatoires{" "}
          <span className="font-normal text-slate-500">(non modifiables)</span>
        </legend>
        <p className="mb-3 text-xs text-slate-500">
          Seuls les artisans respectant ces critères pourront débloquer vos
          coordonnées.
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-3 text-sm text-slate-800">
            <input
              type="checkbox"
              checked
              disabled
              readOnly
              className="mt-1"
              aria-label="Entreprise au statut normal obligatoire"
            />
            <span>
              <span className="font-semibold">
                Entreprise au statut normal
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Active au registre — hors liquidation, dissolution ou cessation
                d&apos;activité.
              </span>
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm text-slate-800">
            <input
              type="checkbox"
              checked
              disabled
              readOnly
              className="mt-1"
              aria-label="Décennale et assurance RC pro à jour obligatoires"
            />
            <span>
              <span className="font-semibold">
                Décennale et assurance RC pro à jour
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Attestations validées par Nord Artisan Pro pour le métier concerné.
              </span>
            </span>
          </li>
        </ul>
        <input type="hidden" name="requireActiveCompany" value="true" />
        <input type="hidden" name="requireValidInsurances" value="true" />
      </fieldset>

      <label
        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
          acceptContactTerms
            ? "border-brand-500 bg-brand-50"
            : "border-slate-200 bg-white"
        }`}
      >
        <input
          type="checkbox"
          name="acceptContactTerms"
          checked={acceptContactTerms}
          onChange={(e) => {
            setAcceptContactTerms(e.target.checked);
            setError(null);
          }}
          className="mt-1"
          required
        />
        <span>
          <span className="font-semibold text-slate-900">
            J&apos;accepte les CGU / CGV et j&apos;autorise la mise en contact{" "}
            <span className="text-red-500">*</span>
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">
            En cochant cette case, vous acceptez les{" "}
            <Link href="/cgu" className="underline" target="_blank">
              CGU
            </Link>{" "}
            et{" "}
            <Link href="/cgv" className="underline" target="_blank">
              CGV
            </Link>
            , et vous autorisez jusqu&apos;à 5 artisans correspondant à votre
            demande à débloquer vos coordonnées pour vous contacter (SMS, email
            ou téléphone).
          </span>
        </span>
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={
          status === "submitting" ||
          status === "success" ||
          !descriptionOk ||
          !acceptContactTerms
        }
        className="w-full rounded-lg bg-accent-500 py-3 text-sm font-semibold text-white hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting"
          ? "Envoi…"
          : status === "success"
            ? "Demande envoyée ✓"
            : "Envoyer ma demande"}
      </button>

      {status === "success" && (
        <div className="space-y-3 text-center text-sm text-brand-700">
          <p className="font-semibold">Demande envoyée.</p>
          {guestMode ? (
            <>
              <p className="text-slate-700">
                Créez un compte gratuit pour suivre vos demandes et les artisans
                qui vous contactent. Ce n&apos;est pas obligatoire, mais
                recommandé.
              </p>
              <p className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={(() => {
                    const params = new URLSearchParams({
                      from: "/particulier/espace/demandes",
                    });
                    if (submittedContact?.email) {
                      params.set("email", submittedContact.email);
                    }
                    if (submittedContact?.firstName) {
                      params.set("firstName", submittedContact.firstName);
                    }
                    if (submittedContact?.lastName) {
                      params.set("lastName", submittedContact.lastName);
                    }
                    if (submittedContact?.phone) {
                      params.set("phone", submittedContact.phone);
                    }
                    return `/particulier/espace/inscription?${params.toString()}`;
                  })()}
                  className="rounded-lg bg-client-600 px-4 py-2 text-sm font-semibold text-white hover:bg-client-700"
                >
                  Créer mon compte
                </Link>
                <Link
                  href="/particulier"
                  className="text-sm font-medium underline"
                >
                  Retour à l&apos;accueil
                </Link>
              </p>
            </>
          ) : (
            <p>
              <Link
                href={
                  createdRequestId
                    ? `/particulier/espace/demandes/${createdRequestId}`
                    : successHref
                }
                className="font-semibold underline"
              >
                Voir ma demande
              </Link>
              {" · "}
              <Link href="/particulier/espace/demandes" className="underline">
                Mes demandes
              </Link>
            </p>
          )}
        </div>
      )}
      </form>
    </div>
  );
}
