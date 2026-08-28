"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  validateDescription,
  validatePhotoFile,
  MAX_PHOTOS,
  MIN_DESCRIPTION_LENGTH,
} from "@/lib/demandes-validation";
import type { SelectedBanAddress } from "@/components/BanAddressAutocomplete";
import BanCityAutocomplete from "@/components/BanCityAutocomplete";
import GoogleSignInButton, {
  GOOGLE_AUTH_MESSAGES,
  googleAuthHref,
} from "@/components/GoogleSignInButton";
import { GoogleConnectedLabel } from "@/components/GoogleAccountAvatar";
import {
  readGoogleWorkFormDraft,
  saveGoogleWorkFormDraft,
} from "@/lib/work-request-google-draft";
import { WORK_REQUEST_FORM_PATH } from "@/lib/work-request-form-path";
import {
  formatFrenchPhoneDisplay,
  normalizeFrenchMobile,
} from "@/lib/phone-format";
import {
  ANALYTICS_EVENT,
  bindFormLeaveListeners,
  leadFormDescriptionErrorCode,
  leadFormParams,
  leadFormStepId,
  sanitizeWorkCategoryParam,
  saveLeadFormDraft,
  trackEvent,
  trackLeadFormConversion,
} from "@/lib/analytics-events";
import {
  MAX_CONTACT_UNLOCKS_PUBLIC_FORM,
  MIN_CONTACT_ARTISANS,
} from "@/lib/contact-slots";
import { adsWorkQueryFromParams } from "@/lib/work-categories";
import { readPersistedAdsLanding } from "@/lib/ads-landing";

type FormStep = 1 | 2 | 3;

export interface WorkRequestFormDefaults {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  phoneVerifiedE164?: string;
  phoneVerifiedAt?: string;
  googleLinked?: boolean;
  googlePictureUrl?: string | null;
}

interface Props {
  defaults?: WorkRequestFormDefaults;
  successHref?: string;
  initialCategory?: string;
  initialUnknownTrade?: boolean;
  guestMode?: boolean;
  variant?: "default" | "general";
  googleEnabled?: boolean;
  googleReturnTo?: string;
  googleError?: string | null;
}

export default function WorkRequestForm({
  defaults,
  successHref = "/particulier/espace/demandes",
  initialCategory,
  initialUnknownTrade = false,
  guestMode = false,
  variant = "general",
  googleEnabled = false,
  googleReturnTo = WORK_REQUEST_FORM_PATH,
  googleError = null,
}: Props) {
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
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
  const [selectedCity, setSelectedCity] = useState<SelectedBanAddress | null>(
    null
  );
  const [acceptContactTerms, setAcceptContactTerms] = useState(false);
  const [maxContactArtisans, setMaxContactArtisans] = useState(
    MAX_CONTACT_UNLOCKS_PUBLIC_FORM
  );
  const [phone, setPhone] = useState(defaults?.phone ?? "");
  const [phoneVerifiedE164, setPhoneVerifiedE164] = useState(
    defaults?.phoneVerifiedE164 ?? ""
  );
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [step, setStep] = useState<FormStep>(1);
  const [adsHint, setAdsHint] = useState(initialCategory ?? "");

  useEffect(() => {
    const draft = readGoogleWorkFormDraft();
    if (!draft) return;
    setSelectedCity(draft.selectedAddress);
    if (draft.phone) setPhone(draft.phone);
    if (descriptionRef.current && draft.description) {
      descriptionRef.current.value = draft.description;
      syncDescriptionLength(draft.description);
    }
  }, []);

  const stepRef = useRef(step);
  const statusRef = useRef(status);
  const adsCategoryRef = useRef(
    sanitizeWorkCategoryParam({
      workCategory: initialCategory,
      unknownTrade: initialUnknownTrade,
    })
  );
  const stepEnteredAtRef = useRef(Date.now());
  const abandonSentRef = useRef(false);
  const completedStepsRef = useRef<Set<number>>(new Set());
  stepRef.current = step;
  statusRef.current = status;

  function leadTrack(extra?: Parameters<typeof leadFormParams>[1]) {
    return leadFormParams(
      {
        variant,
        guestMode,
        adsCategory: adsCategoryRef.current,
      },
      extra
    );
  }

  function persistLeadDraft() {
    const desc = (descriptionRef.current?.value ?? "").trim();
    if (!desc) return;
    saveLeadFormDraft({ description: desc });
  }

  function persistGoogleFormDraft() {
    saveGoogleWorkFormDraft({
      description: descriptionRef.current?.value ?? "",
      selectedAddress: selectedCity,
      phone,
    });
  }

  const descriptionOk = descriptionLength >= MIN_DESCRIPTION_LENGTH;
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
    if (initialCategory) {
      setAdsHint(initialCategory);
      return;
    }
    const landing = readPersistedAdsLanding();
    const prefill = adsWorkQueryFromParams({
      category: landing.category,
      utm_content: landing.utm_content,
      utm_term: landing.utm_term,
      keyword: landing.keyword,
    });
    const hint = prefill.utmContent || prefill.utmTerm || prefill.keyword || "";
    if (hint) setAdsHint(hint);
  }, [initialCategory]);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (cancelled) return;
      trackEvent(ANALYTICS_EVENT.LEAD_FORM_START, leadTrack());
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
      leadTrack({ step_id: leadFormStepId(step), step_index: step })
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

  function currentStepValidation(
    current: FormStep
  ): { message: string; code: string } | null {
    if (current === 1) {
      const descError = validateDescription(getDescriptionValue());
      if (descError) {
        return {
          message: descError,
          code: leadFormDescriptionErrorCode(descError),
        };
      }
      return null;
    }
    if (current === 2) {
      if (!selectedCity?.banAddressId) {
        return {
          message: "Indiquez la ville du chantier et choisissez une suggestion.",
          code: "city_required",
        };
      }
      return null;
    }
    return null;
  }

  function trackLeadValidationError(stepIndex: FormStep, errorCode: string) {
    trackEvent(
      ANALYTICS_EVENT.LEAD_FORM_VALIDATION_ERROR,
      leadTrack({
        step_id: leadFormStepId(stepIndex),
        step_index: stepIndex,
        error_code: errorCode,
      })
    );
  }

  function goToStep(next: FormStep) {
    setError(null);
    setStep(next);
  }

  function unlockedStep(): FormStep {
    if (currentStepValidation(1)) return 1;
    if (currentStepValidation(2)) return 2;
    return 3;
  }

  function missingToUnlockNext(): string[] {
    if (step === 1) {
      const remaining = Math.max(0, MIN_DESCRIPTION_LENGTH - descriptionLength);
      if (remaining > 0) {
        return [
          `encore ${remaining} caractère${remaining > 1 ? "s" : ""} dans la description (${descriptionLength}/${MIN_DESCRIPTION_LENGTH})`,
        ];
      }
    }
    if (step === 2 && !selectedCity?.banAddressId) {
      return ["la ville du chantier (choisir une suggestion)"];
    }
    return [];
  }

  useEffect(() => {
    if (status === "success") return;
    const maxUnlocked = unlockedStep();
    const next = maxUnlocked > step ? ((step + 1) as FormStep) : maxUnlocked;
    if (next === step) return;
    if (next > step) {
      persistLeadDraft();
      if (!completedStepsRef.current.has(step)) {
        completedStepsRef.current.add(step);
        trackEvent(
          ANALYTICS_EVENT.LEAD_FORM_STEP_COMPLETE,
          leadTrack({
            step_id: leadFormStepId(step),
            step_index: step,
            time_on_step_ms: Math.max(0, Date.now() - stepEnteredAtRef.current),
          })
        );
      }
    } else {
      for (let from = next; from <= 3; from += 1) {
        completedStepsRef.current.delete(from);
      }
      trackEvent(
        ANALYTICS_EVENT.LEAD_FORM_STEP_BACK,
        leadTrack({
          from_step: leadFormStepId(step),
          to_step: leadFormStepId(next),
        })
      );
    }
    goToStep(next);
  }, [selectedCity, descriptionLength, status, step]);

  function handlePhoneChange(value: string) {
    setPhone(value);
    setOtpMessage(null);
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
    trackEvent(ANALYTICS_EVENT.LEAD_FORM_OTP_SENT, leadTrack());
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
    trackEvent(ANALYTICS_EVENT.LEAD_FORM_OTP_VERIFIED, leadTrack());
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (step < 3) return;

    for (const current of [1, 2] as FormStep[]) {
      const invalid = currentStepValidation(current);
      if (invalid) {
        setError(invalid.message);
        setStatus("error");
        trackLeadValidationError(current, invalid.code);
        return;
      }
    }

    trackEvent(
      ANALYTICS_EVENT.LEAD_FORM_SUBMIT_ATTEMPT,
      leadTrack({ step_id: leadFormStepId(3), step_index: 3 })
    );
    persistLeadDraft();

    if (!selectedCity) {
      setError("Indiquez la ville du chantier.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("description", getDescriptionValue().trim());
    formData.set("addressLine", selectedCity.city);
    formData.set("postalCode", selectedCity.postalCode);
    formData.set("city", selectedCity.city);
    formData.set("banAddressId", selectedCity.banAddressId);
    formData.set("phone", phone);
    formData.set("acceptContactTerms", acceptContactTerms ? "true" : "false");
    formData.set("clientKind", "individual");
    formData.set("maxContactArtisans", String(maxContactArtisans));
    formData.set("adsHint", adsHint);
    formData.delete("photos");
    photoFiles.forEach((file) => formData.append("photos", file));
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
      workCategory: adsHint || undefined,
    });
    setCreatedRequestId(body.id ?? null);
    setSubmittedContact({
      email: String(formData.get("email") ?? "").trim(),
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
    });
    setStatus("success");
    if (descriptionRef.current) descriptionRef.current.value = "";
    setDescriptionLength(0);
    setPhotoFiles([]);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
    setAcceptContactTerms(false);
    setSelectedCity(null);
    setStep(1);
    completedStepsRef.current = new Set();
    form.reset();
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm";
  const unlockHints =
    status === "success" || step >= 3 ? [] : missingToUnlockNext();

  const googleContinue =
    googleEnabled && guestMode ? (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-sm font-semibold text-slate-900">
          Continuer avec Google
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Nom et email préremplis. Le mobile se confirme toujours par SMS. Le
          formulaire déjà commencé est conservé.
        </p>
        {googleError ? (
          <p className="mt-2 text-xs font-medium text-amber-800">
            {GOOGLE_AUTH_MESSAGES[googleError] ?? googleError}
          </p>
        ) : null}
        <div className="mt-3">
          <GoogleSignInButton
            href={googleAuthHref("client", googleReturnTo)}
            label="Continuer avec Google"
            onNavigate={persistGoogleFormDraft}
          />
        </div>
      </div>
    ) : !guestMode && defaults?.googleLinked ? (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <GoogleConnectedLabel
          pictureUrl={defaults.googlePictureUrl}
          name={`${defaults.firstName} ${defaults.lastName}`.trim()}
          detail="Connecté avec Google — le mobile se confirme toujours par SMS."
        />
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      {googleContinue}
      {googleEnabled && guestMode ? (
        <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-400">
          ou remplissez sans compte
        </p>
      ) : null}
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
            {guestMode
              ? "Gratuit · sans compte obligatoire"
              : "Gratuit · sans commission"}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-900">
            Décrivez vos travaux
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Un texte suffit : on oriente vers les bons artisans, y compris les
            métiers moins courants.
          </p>
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Description du projet <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            ref={descriptionRef}
            name="description"
            placeholder="Ex. Fuite en toiture terrasse, membrane à reprendre, environ 20 m², accès par l’escalier…"
            rows={6}
            lang="fr"
            spellCheck
            className={`${inputClass} ${
              !descriptionOk && descriptionLength > 0 ? "border-amber-400" : ""
            }`}
            required
            minLength={MIN_DESCRIPTION_LENGTH}
            onInput={(e) => syncDescriptionLength(e.currentTarget.value)}
            onChange={(e) => syncDescriptionLength(e.currentTarget.value)}
          />
          <p
            className={`mt-1 text-xs ${
              descriptionOk ? "text-brand-600" : "text-slate-500"
            }`}
          >
            {descriptionLength} / {MIN_DESCRIPTION_LENGTH} caractères
            {descriptionOk
              ? " ✓"
              : " — un peu de détail aide à trouver le bon métier"}
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

        <div
          className={
            step >= 2 ? "space-y-4 border-t border-slate-200 pt-5" : "hidden"
          }
        >
          <div>
            <p className="text-sm font-medium text-slate-900">
              Où se situe le chantier ?
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Le nom de la ville suffit. On cherche les artisans autour.
            </p>
          </div>
          <BanCityAutocomplete
            inputClass={inputClass}
            onSelect={setSelectedCity}
            initialSelected={selectedCity}
          />
          <input
            type="hidden"
            name="postalCode"
            value={selectedCity?.postalCode ?? ""}
          />
          <input type="hidden" name="city" value={selectedCity?.city ?? ""} />
          <input
            type="hidden"
            name="banAddressId"
            value={selectedCity?.banAddressId ?? ""}
          />
          <p className="-mt-2 text-xs text-slate-500">
            Nord et Pas-de-Calais uniquement.
          </p>
        </div>

        <div
          className={
            step >= 3 ? "space-y-4 border-t border-slate-200 pt-5" : "hidden"
          }
        >
          <div>
            <p className="text-sm font-medium text-slate-900">Vos coordonnées</p>
            <p className="mt-1 text-sm text-slate-600">
              On vous rappelle. Gratuit, sans engagement.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              name="firstName"
              type="text"
              placeholder="Prénom"
              className={inputClass}
              required
              defaultValue={defaults?.firstName ?? ""}
              readOnly={!guestMode}
            />
            <input
              name="lastName"
              type="text"
              placeholder="Nom"
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

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-900">
              Combien d&apos;artisans peuvent vous contacter ?
            </legend>
            <p className="mb-2 text-xs text-slate-500">
              Ils débloquent vos coordonnées. 1 à 3, à vous de choisir.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {Array.from(
                {
                  length:
                    MAX_CONTACT_UNLOCKS_PUBLIC_FORM - MIN_CONTACT_ARTISANS + 1,
                },
                (_, i) => MIN_CONTACT_ARTISANS + i
              ).map((n) => (
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
                Jusqu&apos;à {maxContactArtisans} professionnel
                {maxContactArtisans > 1 ? "s" : ""} peuvent débloquer vos
                coordonnées.{" "}
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
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {unlockHints.length > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
            <span className="font-semibold">Pour dérouler la suite</span>
            {` — ${unlockHints.join(" · ")}.`}
          </p>
        )}

        {step >= 3 && (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
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
          </div>
        )}

        {status === "success" && (
          <div className="space-y-3 text-center text-sm text-brand-700">
            <p className="font-semibold">Demande envoyée.</p>
            {guestMode ? (
              <>
                <p className="text-slate-700">
                  Créez un compte gratuit pour suivre vos demandes et les
                  artisans qui vous contactent. Ce n&apos;est pas obligatoire,
                  mais recommandé.
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
