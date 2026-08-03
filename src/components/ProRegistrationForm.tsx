"use client";

import { useState } from "react";
import HelpTooltip from "@/components/HelpTooltip";
import {
  PRO_REGISTRATION_DOCUMENTS,
  proDocumentFieldName,
  validateProRegistrationDocuments,
} from "@/lib/pro-documents";
import { isValidSiretFormat, normalizeSiret, type RcsVerificationResult } from "@/lib/rcs";

type FormStatus = "idle" | "verifying" | "verified" | "submitting" | "success" | "error";

export default function ProRegistrationForm() {
  const [siret, setSiret] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [zone, setZone] = useState("");
  const [category, setCategory] = useState("");
  const [documents, setDocuments] = useState<Record<string, File | null>>({});
  const [verification, setVerification] = useState<RcsVerificationResult | null>(null);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleVerifyRcs() {
    setError(null);
    const normalized = normalizeSiret(siret);

    if (!isValidSiretFormat(normalized)) {
      setError("SIRET invalide. Saisissez 14 chiffres (ex. 552 100 554 00013).");
      setVerification(null);
      setStatus("error");
      return;
    }

    setStatus("verifying");

    try {
      const response = await fetch("/api/verify-rcs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siret: normalized, requireNord: true }),
      });

      const data = (await response.json()) as RcsVerificationResult & {
        message?: string;
      };

      if (!response.ok || !data.valid) {
        setVerification(null);
        setError(data.error ?? "Vérification RCS échouée.");
        setStatus("error");
        return;
      }

      setVerification(data);
      if (data.companyName) setCompanyName(data.companyName);
      setStatus("verified");
    } catch {
      setError("Impossible de contacter le registre du commerce.");
      setStatus("error");
    }
  }

  function handleDocumentChange(id: string, file: File | null) {
    setDocuments((prev) => ({ ...prev, [id]: file }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!verification?.valid) {
      setError("Vous devez d'abord vérifier votre SIRET au registre du commerce.");
      setStatus("error");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      setStatus("error");
      return;
    }

    const documentsError = validateProRegistrationDocuments(documents);
    if (documentsError) {
      setError(documentsError);
      setStatus("error");
      return;
    }

    setStatus("submitting");

    const formData = new FormData();
    formData.set("companyName", companyName);
    formData.set("siret", verification.siret);
    formData.set("siren", verification.siren ?? verification.siret.slice(0, 9));
    formData.set("email", email);
    formData.set("phone", phone);
    formData.set("city", verification.city ?? "");
    formData.set("department", verification.department ?? "59");
    formData.set("category", category);
    formData.set("zone", zone);
    formData.set("rcsVerified", "true");
    formData.set("password", password);
    formData.set("passwordConfirm", passwordConfirm);

    for (const doc of PRO_REGISTRATION_DOCUMENTS) {
      const file = documents[doc.id];
      if (file) {
        formData.append(proDocumentFieldName(doc.id), file);
      }
    }

    const res = await fetch("/api/inscriptions", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Erreur lors de l'inscription.");
      setStatus("error");
      return;
    }

    setStatus("success");
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

  const fieldsEnabled = verification?.valid;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Accès réservé aux entreprises inscrites au RCS</p>
        <p className="mt-1 text-amber-800">
          Seules les entreprises vérifiées au registre du commerce (SIRET valide,
          établissement actif, siège en 59 ou 62) peuvent s&apos;inscrire et enchérir.
          Joignez vos documents dès l&apos;inscription pour accélérer la validation.
        </p>
      </div>

      <div>
        <label htmlFor="siret" className="mb-1 block text-sm font-medium text-slate-700">
          Numéro SIRET <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            id="siret"
            type="text"
            inputMode="numeric"
            placeholder="552 100 554 00013"
            value={siret}
            onChange={(e) => {
              setSiret(e.target.value);
              setVerification(null);
              setStatus("idle");
              setError(null);
            }}
            className={inputClass}
            required
          />
          <button
            type="button"
            onClick={handleVerifyRcs}
            disabled={status === "verifying"}
            className="shrink-0 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
          >
            {status === "verifying" ? "Vérification…" : "Vérifier RCS"}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Vérification en direct auprès du registre national des entreprises.
        </p>
      </div>

      {verification?.valid && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="font-semibold text-emerald-800">✓ Entreprise vérifiée au RCS</p>
          <ul className="mt-2 space-y-1 text-emerald-700">
            <li>
              <strong>{verification.companyName}</strong>
            </li>
            <li>
              SIRET : {verification.siret} · SIREN : {verification.siren}
            </li>
            {verification.city && (
              <li>
                Siège : {verification.city} ({verification.department})
              </li>
            )}
          </ul>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <input
        type="text"
        placeholder="Nom de l'entreprise"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        className={inputClass}
        required
        readOnly={!!verification?.companyName}
      />

      <input
        type="email"
        placeholder="Email professionnel"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
        required
        disabled={!fieldsEnabled}
      />

      <input
        type="tel"
        placeholder="Téléphone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className={inputClass}
        required
        disabled={!fieldsEnabled}
      />

      <input
        type="text"
        placeholder="Zone d'intervention (ex. Lille et 30 km)"
        value={zone}
        onChange={(e) => setZone(e.target.value)}
        className={inputClass}
        required
        disabled={!fieldsEnabled}
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className={`${inputClass} text-slate-600`}
        required
        disabled={!fieldsEnabled}
      >
        <option value="" disabled>
          Corps de métier principal
        </option>
        <option>Peinture</option>
        <option>Plomberie</option>
        <option>Électricité</option>
        <option>Maçonnerie</option>
        <option>Menuiserie</option>
      </select>

      {fieldsEnabled && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Vos documents</h3>
          <p className="mt-1 text-xs text-slate-500">
            JPG, PNG, WebP ou PDF · max 10 Mo par fichier. KBIS et assurance RC
            obligatoires.
          </p>
          <ul className="mt-4 space-y-4">
            {PRO_REGISTRATION_DOCUMENTS.map((doc) => (
              <li key={doc.id}>
                <label
                  htmlFor={proDocumentFieldName(doc.id)}
                  className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700"
                >
                  {doc.label}
                  {doc.required && <span className="text-red-500">*</span>}
                  <HelpTooltip label={doc.label} content={doc.help} />
                </label>
                <input
                  id={proDocumentFieldName(doc.id)}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  required={doc.required}
                  disabled={!fieldsEnabled}
                  onChange={(e) =>
                    handleDocumentChange(doc.id, e.target.files?.[0] ?? null)
                  }
                  className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700"
                />
                {documents[doc.id] && (
                  <p className="mt-1 text-xs text-brand-700">
                    Fichier sélectionné : {documents[doc.id]!.name}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Mot de passe <span className="text-red-500">*</span>
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="Min. 8 caractères, lettre et chiffre"
          required
          minLength={8}
          disabled={!fieldsEnabled}
          autoComplete="new-password"
        />
      </div>

      <div>
        <label
          htmlFor="passwordConfirm"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Confirmer le mot de passe <span className="text-red-500">*</span>
        </label>
        <input
          id="passwordConfirm"
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className={inputClass}
          placeholder="Retapez le mot de passe"
          required
          minLength={8}
          disabled={!fieldsEnabled}
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-slate-500">
          Ce mot de passe servira à vous connecter à votre espace pro.
        </p>
      </div>

      <button
        type="submit"
        disabled={!fieldsEnabled || status === "submitting" || status === "success"}
        className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting"
          ? "Inscription en cours…"
          : status === "success"
            ? "Inscription envoyée"
            : "Finaliser mon inscription"}
      </button>

      {status === "success" && (
        <p className="text-center text-sm text-emerald-600">
          Inscription et documents reçus. Un administrateur validera votre dossier sous
          24-48 h.
        </p>
      )}

      {!fieldsEnabled && (
        <p className="text-center text-xs text-slate-500">
          Les champs ci-dessous seront débloqués après vérification RCS réussie.
        </p>
      )}
    </form>
  );
}
