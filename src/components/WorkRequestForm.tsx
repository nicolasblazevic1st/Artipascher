"use client";

import { useState } from "react";
import ClientQualificationGuide from "@/components/ClientQualificationGuide";
import {
  MIN_DESCRIPTION_LENGTH,
  MAX_PHOTOS,
  validateDescription,
  validatePhotoFiles,
} from "@/lib/demandes-validation";

export default function WorkRequestForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [category, setCategory] = useState("");

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
    form.reset();
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm";

  return (
    <div className="mt-8 space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-medium">Pour une enchère de qualité :</p>
        <ul className="mt-1 list-inside list-disc text-blue-800">
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
          className={`mt-1 text-xs ${descriptionOk ? "text-emerald-600" : "text-slate-500"}`}
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

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting" || status === "success" || !descriptionOk || !photosOk}
        className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting"
          ? "Envoi…"
          : status === "success"
            ? "Demande envoyée ✓"
            : "Envoyer ma demande"}
      </button>

      {status === "success" && (
        <p className="text-center text-sm text-emerald-600">
          Votre demande sera validée par notre équipe avant création de l&apos;enchère.
        </p>
      )}
      </form>
    </div>
  );
}
