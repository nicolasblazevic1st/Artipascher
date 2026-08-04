"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import ClientQualificationGuide from "@/components/ClientQualificationGuide";
import {
  MIN_DESCRIPTION_LENGTH,
  MAX_PHOTOS,
  minRequestedWorkStartDate,
  validateDescription,
  validatePhotoFiles,
  validatePreviousQuotePair,
  validateRequestedWorkStartDate,
} from "@/lib/demandes-validation";
import BanAddressAutocomplete, {
  type SelectedBanAddress,
} from "@/components/BanAddressAutocomplete";
import {
  AUCTION_DURATION_OPTIONS,
  DEFAULT_AUCTION_DURATION_DAYS,
} from "@/lib/auction-duration";
import { WORK_CATEGORIES } from "@/lib/work-categories";
import {
  isValidSiretFormat,
  normalizeSiret,
  type RcsVerificationResult,
} from "@/lib/rcs";

export default function WorkRequestForm() {
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [hasPreviousQuote, setHasPreviousQuote] = useState(false);
  const [previousQuoteAmount, setPreviousQuoteAmount] = useState("");
  const [previousQuoteProof, setPreviousQuoteProof] = useState<File | null>(null);
  const [previousQuoteNote, setPreviousQuoteNote] = useState("");
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<SelectedBanAddress | null>(null);
  const [requestedWorkStartDate, setRequestedWorkStartDate] = useState("");
  const [isCompany, setIsCompany] = useState(false);
  const [clientSiret, setClientSiret] = useState("");
  const [companyVerification, setCompanyVerification] =
    useState<RcsVerificationResult | null>(null);
  const [verifyingCompany, setVerifyingCompany] = useState(false);

  const descriptionOk = descriptionLength >= MIN_DESCRIPTION_LENGTH;
  const photosOk = photoFiles.length >= 1;

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

    const startDateError = validateRequestedWorkStartDate(requestedWorkStartDate);
    if (startDateError) {
      setError(startDateError);
      setStatus("error");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      setStatus("error");
      return;
    }

    if (isCompany) {
      if (!companyVerification?.valid) {
        setError("Vérifiez le SIRET de votre entreprise avant d'envoyer.");
        setStatus("error");
        return;
      }
    }

    setStatus("submitting");

    const formData = new FormData(form);
    formData.set("description", getDescriptionValue().trim());
    formData.set("addressLine", selectedAddress.addressLine);
    formData.set("postalCode", selectedAddress.postalCode);
    formData.set("city", selectedAddress.city);
    formData.set("banAddressId", selectedAddress.banAddressId);
    formData.set("requestedWorkStartDate", requestedWorkStartDate);
    formData.set("clientKind", isCompany ? "company" : "individual");
    if (isCompany && companyVerification) {
      formData.set("clientSiret", companyVerification.siret);
      formData.set("clientSiren", companyVerification.siren);
      formData.set("companyName", companyVerification.companyName ?? "");
    } else {
      formData.delete("clientSiret");
      formData.delete("clientSiren");
      formData.delete("companyName");
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

    setStatus("success");
    if (descriptionRef.current) {
      descriptionRef.current.value = "";
    }
    setDescriptionLength(0);
    setPhotoFiles([]);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
    setCategory("");
    setPassword("");
    setPasswordConfirm("");
    setHasPreviousQuote(false);
    setPreviousQuoteAmount("");
    setPreviousQuoteProof(null);
    setPreviousQuoteNote("");
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofPreview(null);
    setSelectedAddress(null);
    setRequestedWorkStartDate("");
    setIsCompany(false);
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
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
        <p className="font-medium">Pour une enchère de qualité :</p>
        <ul className="mt-1 list-inside list-disc text-brand-800">
          <li>Description d&apos;au moins {MIN_DESCRIPTION_LENGTH} caractères</li>
          <li>Au minimum 1 photo du chantier ou de la zone à travailler</li>
          <li>Adresse du chantier vérifiée via la Base Adresse Nationale (État)</li>
          <li>Date souhaitée de début des travaux</li>
          <li>Prix de départ : devis précédent (si fourni) ou 1er devis Artipascher validé</li>
          <li>Option : joindre un devis déjà reçu (montant + justificatif)</li>
        </ul>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isCompany}
          onChange={(e) => {
            setIsCompany(e.target.checked);
            setCompanyVerification(null);
            setClientSiret("");
            setError(null);
          }}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium text-slate-900">Je suis une entreprise</span>
          <span className="mt-0.5 block text-xs text-slate-500">
            Cochez uniquement si vous postez au nom d&apos;une société existante (SIRET
            obligatoire).
          </span>
        </span>
      </label>

      {isCompany && (
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

      <div className="grid gap-4 sm:grid-cols-2">
        <input
          name="firstName"
          type="text"
          placeholder={isCompany ? "Prénom du contact" : "Prénom"}
          className={inputClass}
          required
        />
        <input
          name="lastName"
          type="text"
          placeholder={isCompany ? "Nom du contact" : "Nom"}
          className={inputClass}
          required
        />
      </div>
      <input name="email" type="email" placeholder="Email" className={inputClass} required />

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

      <div>
        <label
          htmlFor="requestedWorkStartDate"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Date de début de travaux souhaitée <span className="text-red-500">*</span>
        </label>
        <input
          id="requestedWorkStartDate"
          name="requestedWorkStartDate"
          type="date"
          value={requestedWorkStartDate}
          onChange={(e) => setRequestedWorkStartDate(e.target.value)}
          min={minRequestedWorkStartDate()}
          className={inputClass}
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          Visible par les artisans pour planifier leur intervention (visite, devis, planning).
        </p>
      </div>

      <select
        name="category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className={`${inputClass} text-slate-600`}
        required
      >
        <option value="" disabled>
          Type de travaux
        </option>
        {WORK_CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>

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
          Photos du projet <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          name="photos"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          required
          onChange={handlePhotosChange}
          className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700"
        />
        <p className="mt-1 text-xs text-slate-500">
          Minimum 1 photo · JPG, PNG ou WebP · max {MAX_PHOTOS} photos · 5 Mo chacune
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
        {!photosOk && (
          <p className="mt-1 text-xs text-amber-600">Ajoutez au moins une photo.</p>
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
              Optionnel — ce montant deviendra le prix de départ de l&apos;enchère (avec
              justificatif). Il sera remplacé par le premier devis Artipascher validé après
              visite sur site.
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

      <div>
        <label htmlFor="auctionDurationDays" className="mb-1 block text-sm font-medium text-slate-700">
          Durée de l&apos;enchère <span className="text-red-500">*</span>
        </label>
        <select
          id="auctionDurationDays"
          name="auctionDurationDays"
          className={`${inputClass} text-slate-700`}
          defaultValue={DEFAULT_AUCTION_DURATION_DAYS}
          required
        >
          {AUCTION_DURATION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Vous choisissez la durée pendant laquelle les artisans peuvent enchérir (maximum 3 mois).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            Mot de passe <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="Min. 8 caractères, lettre + chiffre"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label htmlFor="passwordConfirm" className="mb-1 block text-sm font-medium text-slate-700">
            Confirmer le mot de passe <span className="text-red-500">*</span>
          </label>
          <input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className={inputClass}
            placeholder="Retapez le mot de passe"
            required
            autoComplete="new-password"
          />
        </div>
      </div>
      <p className="-mt-2 text-xs text-slate-500">
        Ce mot de passe vous permet d&apos;accéder à votre{" "}
        <Link href="/particulier/espace/login" className="font-medium text-client-700">
          espace particulier
        </Link>{" "}
        pour suivre votre enchère et choisir votre artisan.
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting" || status === "success" || !descriptionOk || !photosOk}
        className="w-full rounded-lg bg-accent-500 py-3 text-sm font-semibold text-white hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting"
          ? "Envoi…"
          : status === "success"
            ? "Demande envoyée ✓"
            : "Envoyer ma demande"}
      </button>

      {status === "success" && (
        <p className="text-center text-sm text-brand-600">
          Demande envoyée.{" "}
          <Link href="/particulier/espace/login" className="font-semibold underline">
            Connectez-vous à votre espace particulier
          </Link>{" "}
          pour suivre votre enchère.
        </p>
      )}
      </form>
    </div>
  );
}
