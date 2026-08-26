"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ClientQualificationGuide from "@/components/ClientQualificationGuide";
import {
  validateDescription,
  validatePhotoFile,
  validatePhotoFiles,
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
import {
  GENERAL_WORK_CATEGORY,
  adsWorkQueryFromParams,
  isWorkCategory,
  resolveAdsFormPrefill,
  WORK_CATEGORIES,
} from "@/lib/work-categories";
import { readPersistedAdsLanding } from "@/lib/ads-landing";
import {
  formatFrenchPhoneDisplay,
  normalizeFrenchMobile,
} from "@/lib/phone-format";
import {
  isValidSiretFormat,
  normalizeSiret,
  type RcsVerificationResult,
} from "@/lib/rcs";
import { maxContactArtisansForTier } from "@/lib/contact-slots";
import { MIN_GOOGLE_RATING_OPTIONS } from "@/lib/google-rating";
import { workMayBenefitFromRge } from "@/lib/rge-verification";
import { WORK_SCOPE_LABELS } from "@/lib/copropriete";
import type { ClientKind, WorkScope } from "@/lib/store-types";
import BanAddressAutocomplete, {
  type SelectedBanAddress,
} from "@/components/BanAddressAutocomplete";
import {
  ANALYTICS_EVENT,
  bindFormLeaveListeners,
  leadFormDescriptionErrorCode,
  leadFormNafErrorCode,
  leadFormParams,
  leadFormPhotoErrorCode,
  leadFormPricingErrorCode,
  leadFormStepId,
  sanitizeWorkCategoryParam,
  saveLeadFormDraft,
  trackEvent,
  trackLeadFormConversion,
} from "@/lib/analytics-events";

function buildDescriptionPrefill(input: {
  category: string;
  workOptionName?: string;
  workOptionDetail?: string;
  otherDescription?: string;
}): string {
  const category = input.category.trim();
  if (!category) return "";

  const other = input.otherDescription?.trim();
  const name = input.workOptionName?.trim();
  const detail = input.workOptionDetail?.trim();

  let besoin = "";
  if (other) {
    besoin = other;
  } else if (name && detail) {
    besoin = `${name} (${detail})`;
  } else if (name) {
    besoin = name;
  }

  const first = besoin
    ? `Je souhaite des travaux de ${category.toLowerCase()} : ${besoin}.`
    : `Je souhaite des travaux de ${category.toLowerCase()}.`;

  return `${first}\n\nMerci de me recontacter pour un devis. Je préciserai les détails lors de l'échange.`;
}

const FORM_STEPS = [
  { id: 1, label: "Travaux" },
  { id: 2, label: "Bien" },
  { id: 3, label: "Projet" },
  { id: 4, label: "Contact" },
] as const;
type FormStep = (typeof FORM_STEPS)[number]["id"];

const PROPERTY_TYPES = [
  { id: "maison", label: "Maison" },
  { id: "appartement", label: "Appartement" },
  { id: "local", label: "Local professionnel" },
  { id: "autre", label: "Autre" },
] as const;
type PropertyTypeId = (typeof PROPERTY_TYPES)[number]["id"];

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
  /** Catégorie préremplie (ex. depuis l’accueil ou un mot-clé métier). */
  initialCategory?: string;
  /**
   * Mot-clé vague (« trouver un artisan ») : ouvre déjà
   * « Je ne sais pas / plusieurs métiers ».
   */
  initialUnknownTrade?: boolean;
  /**
   * Demande sans compte : champs contact éditables, OTP invité,
   * puis invitation à créer un espace pour suivre les demandes.
   */
  guestMode?: boolean;
  /**
   * Formulaire type : métier optionnel, bouton « Je ne sais pas ».
   */
  variant?: "default" | "general";
}

export default function WorkRequestForm({
  defaults,
  successHref = "/particulier/espace/demandes",
  initialCategory,
  initialUnknownTrade = false,
  guestMode = false,
  variant = "general",
}: Props) {
  const startUnknown =
    initialUnknownTrade &&
    !(initialCategory && isWorkCategory(initialCategory));
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
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
  const [category, setCategory] = useState(() => {
    if (initialCategory && isWorkCategory(initialCategory)) return initialCategory;
    if (startUnknown) return GENERAL_WORK_CATEGORY;
    return "";
  });
  const [selectedNafCodes, setSelectedNafCodes] = useState<string[]>(() => {
    if (initialCategory && isWorkCategory(initialCategory)) {
      const options = getNafOptionsForCategory(initialCategory);
      return options.length === 1 ? [options[0].code] : [];
    }
    if (startUnknown) {
      return getNafOptionsForCategory(GENERAL_WORK_CATEGORY).map((opt) => opt.code);
    }
    return [];
  });
  const [workOptionId, setWorkOptionId] = useState(() =>
    startUnknown ? OTHER_WORK_OPTION_ID : ""
  );
  const [pricingTier, setPricingTier] = useState<PricingTierId | "">(() =>
    startUnknown ? "bas" : ""
  );
  const [workOptionOtherDescription, setWorkOptionOtherDescription] =
    useState("");
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<SelectedBanAddress | null>(null);
  const [maxContactArtisans, setMaxContactArtisans] = useState(5);
  const [minGoogleRating, setMinGoogleRating] = useState<number | "">("");
  const [requireRge, setRequireRge] = useState(false);
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
  const [step, setStep] = useState<FormStep>(1);
  const [propertyType, setPropertyType] = useState<PropertyTypeId | "">("");
  const [unknownTrade, setUnknownTrade] = useState(startUnknown);

  const stepRef = useRef(step);
  const statusRef = useRef(status);
  const categoryRef = useRef(category);
  const unknownTradeRef = useRef(unknownTrade);
  const adsCategoryRef = useRef(
    sanitizeWorkCategoryParam({
      workCategory: initialCategory,
      unknownTrade: startUnknown,
    })
  );
  const stepEnteredAtRef = useRef(Date.now());
  const abandonSentRef = useRef(false);
  const otherWorkRef = useRef(workOptionOtherDescription);
  const descriptionTouchedRef = useRef(descriptionTouched);
  stepRef.current = step;
  statusRef.current = status;
  categoryRef.current = category;
  unknownTradeRef.current = unknownTrade;
  otherWorkRef.current = workOptionOtherDescription;
  descriptionTouchedRef.current = descriptionTouched;

  function leadTrack(extra?: Parameters<typeof leadFormParams>[1]) {
    return leadFormParams(
      {
        variant,
        guestMode,
        workCategory: categoryRef.current || undefined,
        unknownTrade: unknownTradeRef.current,
        adsCategory: adsCategoryRef.current,
      },
      extra
    );
  }

  function persistLeadDraft() {
    const other = otherWorkRef.current.trim();
    const desc = descriptionTouchedRef.current
      ? (descriptionRef.current?.value ?? "").trim()
      : "";
    if (!other && !desc) return;
    saveLeadFormDraft({
      workCategory: categoryRef.current || undefined,
      unknownTrade: unknownTradeRef.current,
      otherWork: other || undefined,
      description: desc || undefined,
    });
  }

  const descriptionOk = descriptionLength >= MIN_DESCRIPTION_LENGTH;
  const nafOptions = category ? getNafOptionsForCategory(category) : [];
  const requiresNafChoice = nafOptions.length > 1;
  const effectiveNafCodes =
    selectedNafCodes.length > 0
      ? selectedNafCodes
      : nafOptions.length === 1
        ? [nafOptions[0].code]
        : [];
  const workOptions = getWorkOptionsForNafCodes(effectiveNafCodes);
  const allowFullContactCap = variant === "general" || unknownTrade;
  const maxContactCap = maxContactArtisansForTier(pricingTier || undefined, {
    allowFullCap: allowFullContactCap,
  });
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

  useEffect(() => {
    if (initialCategory || startUnknown) return;
    const prefill = resolveAdsFormPrefill(
      adsWorkQueryFromParams(readPersistedAdsLanding())
    );
    if (prefill.category && isWorkCategory(prefill.category)) {
      if (!adsCategoryRef.current) {
        adsCategoryRef.current = sanitizeWorkCategoryParam({
          workCategory: prefill.category,
        });
      }
      setUnknownTrade(false);
      setCategory(prefill.category);
      const options = getNafOptionsForCategory(prefill.category);
      setSelectedNafCodes(options.length === 1 ? [options[0].code] : []);
      setWorkOptionId("");
      setPricingTier("");
      return;
    }
    if (!prefill.unknownTrade) return;
    if (!adsCategoryRef.current) {
      adsCategoryRef.current = sanitizeWorkCategoryParam({
        unknownTrade: true,
      });
    }
    setUnknownTrade(true);
    setCategory(GENERAL_WORK_CATEGORY);
    setSelectedNafCodes(
      getNafOptionsForCategory(GENERAL_WORK_CATEGORY).map((opt) => opt.code)
    );
    setWorkOptionId(OTHER_WORK_OPTION_ID);
    setPricingTier("bas");
  }, [initialCategory, startUnknown]);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (cancelled) return;
      trackEvent(
        ANALYTICS_EVENT.LEAD_FORM_START,
        leadTrack()
      );
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [variant, guestMode]);

  useEffect(() => {
    if (statusRef.current === "success") return;
    stepEnteredAtRef.current = Date.now();
    trackEvent(
      ANALYTICS_EVENT.LEAD_FORM_STEP_VIEW,
      leadTrack(
        { step_id: leadFormStepId(step), step_index: step }
      )
    );
  }, [step, variant, guestMode]);

  useEffect(() => {
    return bindFormLeaveListeners(() => {
      if (abandonSentRef.current || statusRef.current === "success") return;
      const current = stepRef.current;
      persistLeadDraft();
      trackEvent(
        ANALYTICS_EVENT.LEAD_FORM_ABANDON,
        leadTrack({
          step_id: leadFormStepId(current),
          step_index: current,
          time_on_step_ms: Math.max(0, Date.now() - stepEnteredAtRef.current),
        })
      );
    });
  }, [variant, guestMode]);

  useEffect(() => {
    if (descriptionTouched) return;
    if (unknownTrade && !workOptionOtherDescription.trim()) {
      if (descriptionRef.current) descriptionRef.current.value = "";
      syncDescriptionLength("");
      return;
    }
    const selectedOption = workOptions.find((opt) => opt.id === workOptionId);
    const draft = buildDescriptionPrefill({
      category,
      workOptionName:
        workOptionId && workOptionId !== OTHER_WORK_OPTION_ID
          ? selectedOption?.name
          : undefined,
      workOptionDetail:
        workOptionId && workOptionId !== OTHER_WORK_OPTION_ID
          ? selectedOption?.detail
          : undefined,
      otherDescription:
        workOptionId === OTHER_WORK_OPTION_ID
          ? workOptionOtherDescription
          : undefined,
    });
    if (descriptionRef.current) {
      descriptionRef.current.value = draft;
    }
    syncDescriptionLength(draft);
  }, [
    category,
    workOptionId,
    workOptionOtherDescription,
    workOptions,
    descriptionTouched,
    unknownTrade,
  ]);

  useEffect(() => {
    setMaxContactArtisans((current) =>
      current > maxContactCap ? maxContactCap : current
    );
  }, [maxContactCap]);

  function handleCategoryChange(next: string) {
    setUnknownTrade(false);
    setCategory(next);
    const options = getNafOptionsForCategory(next);
    setSelectedNafCodes(options.length === 1 ? [options[0].code] : []);
    setWorkOptionId("");
    setPricingTier("");
    setWorkOptionOtherDescription("");
    setError(null);
  }

  function clearUnknownTrade() {
    setUnknownTrade(false);
    setCategory("");
    setSelectedNafCodes([]);
    setWorkOptionId("");
    setPricingTier("");
    setWorkOptionOtherDescription("");
    setError(null);
  }

  function handleUnknownTrade() {
    const options = getNafOptionsForCategory(GENERAL_WORK_CATEGORY);
    setUnknownTrade(true);
    setCategory(GENERAL_WORK_CATEGORY);
    setSelectedNafCodes(options.map((opt) => opt.code));
    setWorkOptionId(OTHER_WORK_OPTION_ID);
    setPricingTier("bas");
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
      if (data.smsUnavailable === true) {
        setOtpMessage(
          "SMS momentanément indisponible. Vous pouvez envoyer la demande sans code."
        );
        return;
      }
      setOtpMessage(data.error ?? "Envoi du SMS impossible.");
      return;
    }
    if (typeof data.cooldownSeconds === "number") {
      setOtpCooldown(data.cooldownSeconds);
    }
    setOtpMessage(data.message ?? "Code envoyé par SMS.");
    trackEvent(
      ANALYTICS_EVENT.LEAD_FORM_OTP_SENT,
      leadTrack()
    );
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
    trackEvent(
      ANALYTICS_EVENT.LEAD_FORM_OTP_VERIFIED,
      leadTrack()
    );
  }

  function syncDescriptionLength(value: string) {
    setDescriptionLength(value.trim().length);
  }

  function getDescriptionValue() {
    return descriptionRef.current?.value ?? "";
  }

  function addPhotoFiles(list: FileList | null) {
    if (!list) return;

    const nextFiles = [...photoFiles];
    const nextPreviews = [...previews];
    let err: string | null = null;

    for (const file of Array.from(list)) {
      if (nextFiles.length >= MAX_PHOTOS) {
        err = `Maximum ${MAX_PHOTOS} photos autorisées.`;
        break;
      }
      const fileError = validatePhotoFile(file);
      if (fileError) {
        err = fileError;
        break;
      }
      nextFiles.push(file);
      nextPreviews.push(URL.createObjectURL(file));
    }

    setPhotoFiles(nextFiles);
    setPreviews(nextPreviews);
    setError(err);
  }

  function handlePhotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    addPhotoFiles(e.target.files);
    e.target.value = "";
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(previews[index]!);
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  }

  function currentStepValidation(
    current: FormStep
  ): { message: string; code: string } | null {
    if (current === 1) {
      if (!category) {
        return { message: "Choisissez le type de travaux.", code: "category_required" };
      }
      const nafCheck = validateWorkRequestNafSelection(category, selectedNafCodes);
      if (!nafCheck.ok) {
        return {
          message: nafCheck.error,
          code: leadFormNafErrorCode(nafCheck.error),
        };
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
        return {
          message: pricingCheck.error,
          code: leadFormPricingErrorCode(pricingCheck.error),
        };
      }
      return null;
    }

    if (current === 2) {
      if (!propertyType) {
        return { message: "Indiquez le type de bien.", code: "property_type_required" };
      }
      if (clientKind === "company" && !companyVerification?.valid) {
        return {
          message: "Vérifiez le SIRET de l'entreprise pour continuer.",
          code: "company_siret_not_verified",
        };
      }
      if (clientKind === "copropriete" && !workScope) {
        return {
          message: "Précisez si ce sont les parties communes ou un lot privatif.",
          code: "work_scope_required",
        };
      }
      if (!selectedAddress?.banAddressId) {
        return {
          message: "Indiquez l'adresse du chantier et choisissez une suggestion.",
          code: "address_required",
        };
      }
      return null;
    }

    if (current === 3) {
      const descError = validateDescription(getDescriptionValue());
      if (descError) {
        return {
          message: descError,
          code: leadFormDescriptionErrorCode(descError),
        };
      }
      return null;
    }

    return null;
  }

  function trackLeadValidationError(stepIndex: FormStep, errorCode: string) {
    trackEvent(
      ANALYTICS_EVENT.LEAD_FORM_VALIDATION_ERROR,
      leadTrack(
        {
          step_id: leadFormStepId(stepIndex),
          step_index: stepIndex,
          error_code: errorCode,
        }
      )
    );
  }

  function trackLeadStepBack(from: FormStep, to: FormStep) {
    trackEvent(
      ANALYTICS_EVENT.LEAD_FORM_STEP_BACK,
      leadTrack(
        {
          from_step: leadFormStepId(from),
          to_step: leadFormStepId(to),
        }
      )
    );
  }

  function goToStep(next: FormStep) {
    setError(null);
    setStep(next);
  }

  function goNext() {
    persistLeadDraft();
    const invalid = currentStepValidation(step);
    if (invalid) {
      setError(invalid.message);
      trackLeadValidationError(step, invalid.code);
      return;
    }
    trackEvent(
      ANALYTICS_EVENT.LEAD_FORM_STEP_COMPLETE,
      leadTrack({
        step_id: leadFormStepId(step),
        step_index: step,
        time_on_step_ms: Math.max(0, Date.now() - stepEnteredAtRef.current),
      })
    );
    if (step < 4) goToStep((step + 1) as FormStep);
  }

  function goBack() {
    if (step > 1) {
      const next = (step - 1) as FormStep;
      trackLeadStepBack(step, next);
      goToStep(next);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (step < 4) {
      goNext();
      return;
    }

    trackEvent(
      ANALYTICS_EVENT.LEAD_FORM_SUBMIT_ATTEMPT,
      leadTrack(
        { step_id: leadFormStepId(4), step_index: 4 }
      )
    );
    persistLeadDraft();

    const descError = validateDescription(getDescriptionValue());
    if (descError) {
      setError(descError);
      setStatus("error");
      trackLeadValidationError(4, leadFormDescriptionErrorCode(descError));
      return;
    }

    const photosError = validatePhotoFiles(photoFiles);
    if (photosError) {
      setError(photosError);
      setStatus("error");
      trackLeadValidationError(4, leadFormPhotoErrorCode(photosError));
      return;
    }

    const form = e.currentTarget;

    if (!selectedAddress?.banAddressId) {
      setError(
        "Sélectionnez votre adresse dans la liste officielle (Base Adresse Nationale)."
      );
      setStatus("error");
      trackLeadValidationError(4, "address_required");
      return;
    }

    const phoneValue = phone.trim();
    if (!phoneValue) {
      setError("Le numéro de téléphone est obligatoire.");
      setStatus("error");
      trackLeadValidationError(4, "phone_required");
      return;
    }
    if (!normalizeFrenchMobile(phoneValue)) {
      setError("Indiquez un mobile français valide (06 ou 07).");
      setStatus("error");
      trackLeadValidationError(4, "phone_invalid");
      return;
    }

    if (clientKind === "company") {
      if (!companyVerification?.valid) {
        setError("Vérifiez le SIRET de votre entreprise avant d'envoyer.");
        setStatus("error");
        trackLeadValidationError(4, "company_siret_not_verified");
        return;
      }
    }

    if (clientKind === "copropriete" && !workScope) {
      setError(
        "Indiquez si les travaux concernent les parties communes ou un lot privatif."
      );
      setStatus("error");
      trackLeadValidationError(4, "work_scope_required");
      return;
    }

    if (!acceptContactTerms) {
      setError(
        "Vous devez accepter les CGU / CGV pour autoriser la mise en contact avec les artisans."
      );
      setStatus("error");
      trackLeadValidationError(4, "terms_not_accepted");
      return;
    }

    if (!category) {
      setError("Choisissez un type de travaux.");
      setStatus("error");
      trackLeadValidationError(4, "category_required");
      return;
    }

    const nafCheck = validateWorkRequestNafSelection(category, selectedNafCodes);
    if (!nafCheck.ok) {
      setError(nafCheck.error);
      setStatus("error");
      trackLeadValidationError(4, leadFormNafErrorCode(nafCheck.error));
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
      trackLeadValidationError(4, leadFormPricingErrorCode(pricingCheck.error));
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
    const propertyLabel = PROPERTY_TYPES.find((p) => p.id === propertyType)?.label;
    const description = getDescriptionValue().trim();
    formData.set(
      "description",
      propertyLabel ? `${propertyLabel}. ${description}` : description
    );
    formData.set("addressLine", selectedAddress.addressLine);
    formData.set("postalCode", selectedAddress.postalCode);
    formData.set("city", selectedAddress.city);
    formData.set("banAddressId", selectedAddress.banAddressId);
    formData.delete("requestedWorkStartDate");
    formData.set("phone", phoneValue);
    formData.delete("auctionDurationHours");
    formData.delete("auctionDurationDays");
    formData.set("preferEstablishedCompany", "any");
    formData.set("maxContactArtisans", String(maxContactArtisans));
    if (minGoogleRating !== "") {
      formData.set("minGoogleRating", String(minGoogleRating));
    } else {
      formData.delete("minGoogleRating");
    }
    formData.set("requireRge", requireRge ? "true" : "false");
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
    formData.delete("previousQuoteAmount");
    formData.delete("previousQuoteNote");
    formData.delete("previousQuoteProof");
    if (guestMode) {
      formData.delete("email");
    } else if (defaults?.email) {
      formData.set("email", defaults.email);
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
    statusRef.current = "success";
    abandonSentRef.current = true;
    trackLeadFormConversion({
      variant,
      guestMode,
      workCategory: category || undefined,
      unknownTrade,
    });
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
    setDescriptionTouched(false);
    setPhotoFiles([]);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
    setCategory("");
    setAcceptContactTerms(false);
    setSelectedAddress(null);
    setClientKind("individual");
    setPropertyType("");
    setStep(1);
    setWorkScope("");
    setClientSiret("");
    setCompanyVerification(null);
    setMaxContactArtisans(5);
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
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Formulaire de demande de travaux"
        className="space-y-5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
      >
      <div className="-mx-4 -mt-4 border-b border-brand-100 bg-brand-50 px-4 py-3 sm:-mx-6 sm:-mt-6 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">
          Formulaire à remplir
        </p>
        <p className="mt-0.5 text-sm font-semibold text-slate-900">
          Demande de travaux · artisans vérifiés 59/62
        </p>
        <p className="mt-0.5 text-xs text-slate-600">
          4 étapes
          {guestMode
            ? " · gratuit · sans compte obligatoire"
            : " · gratuit · sans commission"}
        </p>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-900">
          {step === 1 &&
            (variant === "general"
              ? "Étape 1 — de quels travaux s’agit-il ?"
              : "Étape 1 — quel type de travaux ?")}
          {step === 2 && "Étape 2 — où se situe le chantier ?"}
          {step === 3 && "Étape 3 — décrivez le projet"}
          {step === 4 && "Étape 4 — vos coordonnées"}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {step === 1 &&
            (variant === "general"
              ? "Remplissez ce formulaire même si vous ne connaissez pas le métier."
              : "Cochez une catégorie, puis continuez le formulaire.")}
          {step === 2 && "Type de bien et adresse : on trouve les artisans autour de vous."}
          {step === 3 && "Quelques mots sur ce que vous voulez, et des photos si vous en avez."}
          {step === 4 && "On vous rappelle. Gratuit, sans engagement."}
        </p>
        <ol className="mt-4 grid grid-cols-4 gap-2">
          {FORM_STEPS.map((item) => {
            const done = step > item.id;
            const current = step === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (item.id < step) {
                      trackLeadStepBack(step, item.id);
                      goToStep(item.id);
                    }
                  }}
                  disabled={item.id > step}
                  className={`w-full rounded-lg px-2 py-2 text-center text-xs font-medium ${
                    current
                      ? "bg-brand-600 text-white"
                      : done
                        ? "bg-brand-50 text-brand-800"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {item.id}. {item.label}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className={step === 1 ? "space-y-4" : "hidden"}>
      <fieldset>
        <legend className="text-sm font-semibold text-slate-900">
          {variant === "general" ? "De quels travaux s'agit-il ?" : "Type de travaux"}
        </legend>
        {variant === "general" ? (
          <p className="mt-1 text-xs text-slate-600">
            Pas besoin de connaître le métier : décrivez, on s&apos;occupe
            d&apos;orienter les artisans.
          </p>
        ) : null}
        <input type="hidden" name="category" value={category} />
        {variant === "general" ? (
          <input type="hidden" name="generalWorkForm" value="1" />
        ) : null}
        {variant === "general" ? (
          <button
            type="button"
            onClick={handleUnknownTrade}
            className={`mt-3 w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
              unknownTrade
                ? "border-brand-500 bg-brand-50 text-slate-900"
                : "border-slate-200 bg-white text-slate-800 hover:border-brand-300"
            }`}
          >
            <span className="block font-semibold">
              Je ne sais pas / plusieurs métiers
            </span>
            <span className="mt-0.5 block text-xs text-slate-600">
              Peinture, fuite, toiture… décrivez simplement ce qu&apos;il faut
              faire.
            </span>
          </button>
        ) : null}
        {unknownTrade ? (
          <p className="mt-2 text-xs text-slate-600">
            <button
              type="button"
              onClick={clearUnknownTrade}
              className="font-medium text-brand-700 underline-offset-2 hover:underline"
            >
              Choisir un métier à la place
            </button>
          </p>
        ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {WORK_CATEGORIES.map((cat) => {
            const selected = !unknownTrade && category === cat;
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
        )}
        {!category && (
          <p className="mt-2 text-xs font-medium text-amber-700">
            {variant === "general"
              ? "Choisissez un métier, ou « Je ne sais pas / plusieurs métiers »."
              : "Sélectionnez un type de travaux pour continuer."}
          </p>
        )}
      </fieldset>

      {requiresNafChoice && !unknownTrade && (
        <fieldset className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-900">
            Précisez un peu
          </legend>
          <p className="mt-1 text-xs text-slate-600">
            Ce métier couvre plusieurs activités. Cochez ce qui correspond.
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
                    <span className="font-medium text-slate-900">{opt.label}</span>
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

      {unknownTrade && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
          <label className="mb-1 block text-sm font-semibold text-slate-900">
            Décrivez vos travaux{" "}
            <span className="text-red-500">*</span>
          </label>
          <p className="mb-2 text-xs text-slate-600">
            Peinture, fuite, toiture, plusieurs pièces… écrivez comme vous
            parlez. On orientera vers les bons artisans.
          </p>
          <textarea
            name="workOptionOtherDescription"
            value={workOptionOtherDescription}
            onChange={(e) =>
              setWorkOptionOtherDescription(
                e.target.value.slice(0, OTHER_WORK_DESCRIPTION_MAX)
              )
            }
            placeholder="Ex. repeindre le salon et changer une fenêtre qui frotte"
            className={`${inputClass} min-h-[6.5rem] resize-y`}
            required
            minLength={OTHER_WORK_DESCRIPTION_MIN}
            maxLength={OTHER_WORK_DESCRIPTION_MAX}
            rows={4}
          />
          <p className="mt-1 text-xs text-slate-500">
            {workOptionOtherDescription.trim().length} /{" "}
            {OTHER_WORK_DESCRIPTION_MIN} car. min.
          </p>
        </div>
      )}

      {category && effectiveNafCodes.length > 0 && !unknownTrade && (
        <fieldset className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-900">
            Qu&apos;est-ce qu&apos;il faut faire ?
          </legend>

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
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="workOptionOtherDescription"
                value={workOptionOtherDescription}
                onChange={(e) =>
                  setWorkOptionOtherDescription(e.target.value.slice(0, OTHER_WORK_DESCRIPTION_MAX))
                }
                placeholder="Ex. débouchage WC + remplacement robinet cuisine"
                className={`${inputClass} min-h-[5rem] resize-y`}
                required
                minLength={OTHER_WORK_DESCRIPTION_MIN}
                maxLength={OTHER_WORK_DESCRIPTION_MAX}
                rows={3}
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
      </div>

      <div className={step === 2 ? "space-y-4" : "hidden"}>
      <fieldset>
        <legend className="sr-only">Type de bien</legend>
        <div className="grid grid-cols-2 gap-2">
          {PROPERTY_TYPES.map((opt) => {
            const selected = propertyType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setPropertyType(opt.id);
                  setError(null);
                }}
                className={`rounded-xl border px-4 py-4 text-left text-sm font-medium transition ${
                  selected
                    ? "border-brand-500 bg-brand-50 text-slate-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-brand-300"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-900">
          Vous êtes
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
        Nord et Pas-de-Calais uniquement. L&apos;adresse exacte reste masquée
        jusqu&apos;à ce qu&apos;un artisan prenne contact.
      </p>
      </div>

      <div className={step === 3 ? "space-y-4" : "hidden"}>
      <div>
        <label
          htmlFor="description"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Description du projet
        </label>
        <p className="mb-2 text-xs text-slate-500">
          Préremplie avec vos choix de l&apos;étape 1 — complétez ou corrigez
          si besoin.
        </p>
        <textarea
          id="description"
          ref={descriptionRef}
          name="description"
          placeholder="Ex. Remplacer la baignoire par une douche, carrelage à refaire, environ 6 m²…"
          rows={5}
          lang="fr"
          spellCheck
          className={`${inputClass} ${!descriptionOk && descriptionLength > 0 ? "border-amber-400" : ""}`}
          required
          minLength={MIN_DESCRIPTION_LENGTH}
          onInput={(e) => {
            setDescriptionTouched(true);
            syncDescriptionLength(e.currentTarget.value);
          }}
          onChange={(e) => {
            setDescriptionTouched(true);
            syncDescriptionLength(e.currentTarget.value);
          }}
        />
        <p
          className={`mt-1 text-xs ${descriptionOk ? "text-brand-600" : "text-slate-500"}`}
        >
          {descriptionLength} / {MIN_DESCRIPTION_LENGTH} caractères
          {descriptionOk ? " ✓" : " — un peu de détail aide à avoir un devis juste"}
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">
          Photos{" "}
          <span className="font-normal text-slate-500">
            ({photoFiles.length}/{MAX_PHOTOS}, si vous en avez)
          </span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={photoFiles.length >= MAX_PHOTOS}
            className="flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l.8-1.4A1.5 1.5 0 0 1 9.8 4h4.4a1.5 1.5 0 0 1 1.3.6L16.3 6h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"
              />
              <circle cx="12" cy="12.5" r="3.2" />
            </svg>
            Prendre une photo
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={photoFiles.length >= MAX_PHOTOS}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 hover:border-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Choisir dans la galerie
          </button>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handlePhotosChange}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp"
          multiple
          className="sr-only"
          onChange={handlePhotosChange}
        />
        <p className="mt-2 text-xs text-slate-500">
          Sur téléphone, « Prendre une photo » ouvre l&apos;appareil photo.
        </p>
        {previews.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={src} className="relative">
                <img
                  src={src}
                  alt={`Aperçu ${i + 1}`}
                  className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -right-2 -top-2 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white shadow hover:bg-red-700"
                  aria-label="Retirer la photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-sm font-medium text-slate-900">
          Qui peut me contacter
        </p>
        <p className="text-xs text-slate-500">
          Choisissez combien d&apos;artisans pourront débloquer vos
          coordonnées (1 à {maxContactCap}
          {pricingTier === "bas" && !allowFullContactCap
            ? " pour cette petite intervention"
            : ""}
          ).
        </p>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">
            Nombre d&apos;artisans
          </legend>
          <div
            className={`grid gap-2 ${
              maxContactCap === 3 ? "grid-cols-3" : "grid-cols-5"
            }`}
          >
            {Array.from({ length: maxContactCap }, (_, i) => i + 1).map((n) => (
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

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">
          Label RGE
        </legend>
        <p className="mb-2 text-xs text-slate-500">
          {workMayBenefitFromRge(category)
            ? "Recommandé pour ce type de travaux : le label RGE est souvent exigé pour MaPrimeRénov’, les CEE et l’éco-PTZ."
            : "Optionnel. Cochez si vous voulez uniquement des artisans RGE (aides à la rénovation énergétique)."}
        </p>
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            requireRge
              ? "border-emerald-500 bg-emerald-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <input
            type="checkbox"
            name="requireRge"
            checked={requireRge}
            onChange={(e) => setRequireRge(e.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="font-semibold text-slate-900">
              Uniquement un artisan RGE
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Mention vérifiée sur l’annuaire officiel ADEME. Seuls ces artisans
              pourront débloquer vos coordonnées.
            </span>
          </span>
        </label>
      </fieldset>

      <ClientQualificationGuide selectedCategory={category} />
      </div>

      <p className="text-xs text-slate-500">
        Seuls des artisans en activité, avec décennale et RC pro à jour, pourront
        vous joindre. Si vous exigez le label RGE, la mention est vérifiée sur
        l&apos;annuaire ADEME.
      </p>
      <input type="hidden" name="requireActiveCompany" value="true" />
      <input type="hidden" name="requireValidInsurances" value="true" />
      </div>

      <div className={step === 4 ? "space-y-4" : "hidden"}>
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
      {!guestMode && defaults?.email ? (
        <input type="hidden" name="email" value={defaults.email} />
      ) : null}
      <div>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          placeholder="Mobile (06 ou 07)"
          className={inputClass}
          required
          autoComplete="tel"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          Un code SMS pour confirmer que c&apos;est bien vous. Si l&apos;envoi
          SMS échoue, la demande part quand même. Les artisans ne voient le
          numéro qu&apos;après avoir pris le contact.
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
            J&apos;accepte d&apos;être rappelé par des artisans de ma zone
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">
            Jusqu&apos;à {maxContactArtisans} professionnels peuvent débloquer
            vos coordonnées.{" "}
            <Link href="/cgu" className="underline" target="_blank">
              CGU
            </Link>{" "}
            et{" "}
            <Link href="/cgv" className="underline" target="_blank">
              CGV
            </Link>
            .
          </span>
        </span>
      </label>

      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        {step > 1 && status !== "success" && (
          <button
            type="button"
            onClick={goBack}
            className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Retour
          </button>
        )}
        {step < 4 ? (
          <button
            type="button"
            onClick={goNext}
            className="w-full rounded-lg bg-accent-500 py-3 text-sm font-semibold text-white hover:bg-accent-600"
          >
            Continuer
          </button>
        ) : (
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
                : "Recevoir des propositions"}
          </button>
        )}
      </div>

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
