"use client";

import { useState } from "react";
import Link from "next/link";
import ClientQualificationGuide from "@/components/ClientQualificationGuide";
import {
  MIN_DESCRIPTION_LENGTH,
  MAX_PHOTOS,
  validateDescription,
  validatePhotoFiles,
} from "@/lib/demandes-validation";
import {
  AUCTION_DURATION_OPTIONS,
  DEFAULT_AUCTION_DURATION_DAYS,
} from "@/lib/auction-duration";

export default function WorkRequestForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const descriptionLength = description.trim().length;
  const descriptionOk = descriptionLength >= MIN_DESCRIPTION_LENGTH;
  const photosOk = photoFiles.length >= 1;

  function handlePhotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list) return;

    previews.forEach((url) => URL.revokeObjectURL(url));

    const files = Array.from(list);
    setPhotoFiles(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const descError = validateDescription(description);
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

    if (password !== passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      setStatus("error");
      return;
    }

    setStatus("submitting");

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("description", description.trim());
    formData.delete("photos");
    photoFiles.forEach((file) => formData.append("photos", file));

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
    setDescription("");
    setPhotoFiles([]);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
    setCategory("");
    setPassword("");
    setPasswordConfirm("");
    form.reset();
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
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <input name="firstName" type="text" placeholder="Prénom" className={inputClass} required />
        <input name="lastName" type="text" placeholder="Nom" className={inputClass} required />
      </div>
      <input name="email" type="email" placeholder="Email" className={inputClass} required />
      <input
        name="city"
        type="text"
        placeholder="Ville (ex. Lille, Roubaix, Lens…)"
        className={inputClass}
        required
      />
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
        <option>Peinture</option>
        <option>Plomberie</option>
        <option>Électricité</option>
        <option>Maçonnerie</option>
        <option>Isolation</option>
        <option>Chauffage / Pompe à chaleur</option>
        <option>Rénovation énergétique</option>
        <option>Rénovation complète</option>
      </select>

      <ClientQualificationGuide selectedCategory={category} />

      <div>
        <textarea
          name="description"
          placeholder="Décrivez précisément votre projet : surface, matériaux, contraintes, accès…"
          rows={5}
          className={`${inputClass} ${!descriptionOk && descriptionLength > 0 ? "border-amber-400" : ""}`}
          required
          minLength={MIN_DESCRIPTION_LENGTH}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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

      <input
        name="budget"
        type="number"
        placeholder="Budget maximum (€)"
        className={inputClass}
        required
        min={100}
      />

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
