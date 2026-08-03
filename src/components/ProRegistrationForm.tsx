"use client";

import { useMemo, useState } from "react";
import HelpTooltip from "@/components/HelpTooltip";
import {
  PRO_REGISTRATION_DOCUMENTS,
  proDocumentFieldName,
  validateProRegistrationDocuments,
} from "@/lib/pro-documents";
import {
  GROUPED_QUALIBAT_JOBS,
  getJobsForTradeGroup,
  resolveMultipleTradeSelections,
} from "@/lib/qualibat-job-groups";
import { primaryTradeCategory } from "@/lib/pro-trades";
import { applyRcsActivitiesToTradeSelection } from "@/lib/naf-trade-groups";
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
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});
  const [jobByGroup, setJobByGroup] = useState<Record<string, string>>({});
  const [rcsGroupIds, setRcsGroupIds] = useState<Set<string>>(new Set());
  const [documents, setDocuments] = useState<Record<string, File | null>>({});
  const [verification, setVerification] = useState<RcsVerificationResult | null>(null);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const activeGroupIds = useMemo(
    () =>
      GROUPED_QUALIBAT_JOBS.filter(({ group }) => selectedGroups[group.id]).map(
        ({ group }) => group.id
      ),
    [selectedGroups]
  );

  function resetTradeSelection() {
    setSelectedGroups({});
    setJobByGroup({});
    setRcsGroupIds(new Set());
  }

  function applyRegisteredActivities(data: RcsVerificationResult) {
    if (!data.registeredActivities?.length) {
      resetTradeSelection();
      return;
    }

    const applied = applyRcsActivitiesToTradeSelection(data.registeredActivities);
    setSelectedGroups(applied.selectedGroups);
    setJobByGroup(applied.jobByGroup);
    setRcsGroupIds(applied.rcsGroupIds);
  }

  function toggleTradeGroup(groupId: string, checked: boolean) {
    setSelectedGroups((prev) => ({ ...prev, [groupId]: checked }));
    if (!checked) {
      setJobByGroup((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      setRcsGroupIds((prev) => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
    setError(null);
  }

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
        resetTradeSelection();
        setError(data.error ?? "Vérification RCS échouée.");
        setStatus("error");
        return;
      }

      setVerification(data);
      if (data.companyName) setCompanyName(data.companyName);
      applyRegisteredActivities(data);
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

    if (activeGroupIds.length === 0) {
      setError("Cochez au moins un corps de métier.");
      setStatus("error");
      return;
    }

    for (const groupId of activeGroupIds) {
      if (!jobByGroup[groupId]) {
        setError("Choisissez un métier Qualibat pour chaque corps de métier coché.");
        setStatus("error");
        return;
      }
    }

    const tradeSelections = resolveMultipleTradeSelections(
      activeGroupIds.map((groupId) => ({
        tradeGroupId: groupId,
        qualibatJobId: Number(jobByGroup[groupId]),
      }))
    );

    if (!tradeSelections) {
      setError("Sélection métier invalide. Vérifiez vos choix.");
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
    formData.set("category", primaryTradeCategory(tradeSelections));
    formData.set("tradeSelections", JSON.stringify(tradeSelections));
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
              resetTradeSelection();
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
            {(verification.registeredActivities?.length ?? 0) > 0 && (
              <li className="pt-2">
                <span className="font-medium">Activités au registre :</span>
                <ul className="mt-1 space-y-1">
                  {verification.registeredActivities!.map((activity) => (
                    <li key={activity.nafCode}>
                      {activity.nafCode} — {activity.label}
                    </li>
                  ))}
                </ul>
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

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Vos métiers</h3>
          <p className="mt-1 text-xs text-slate-500">
            Les activités déclarées au RCS sont pré-cochées ci-dessous. Complétez
            le métier Qualibat pour chacune, et cochez d&apos;autres corps de métier
            si vous intervenez sur d&apos;autres domaines.
          </p>
        </div>

        <fieldset disabled={!fieldsEnabled}>
          <legend className="mb-2 block text-sm font-medium text-slate-700">
            1. Corps de métier <span className="text-red-500">*</span>
          </legend>
          <ul className="grid gap-2 sm:grid-cols-2">
            {GROUPED_QUALIBAT_JOBS.map(({ group, jobs }) => (
              <li key={group.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm hover:border-brand-300">
                  <input
                    type="checkbox"
                    checked={selectedGroups[group.id] === true}
                    onChange={(e) => toggleTradeGroup(group.id, e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
                  />
                  <span>
                    <span className="font-medium text-slate-800">
                      {group.label}
                      {rcsGroupIds.has(group.id) && (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                          RCS
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {jobs.length} métier{jobs.length > 1 ? "s" : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {activeGroupIds.length > 0 && (
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <p className="text-sm font-medium text-slate-700">
              2. Métier Qualibat par corps de métier{" "}
              <span className="text-red-500">*</span>
            </p>
            {activeGroupIds.map((groupId) => {
              const group = GROUPED_QUALIBAT_JOBS.find((g) => g.group.id === groupId)?.group;
              const jobs = getJobsForTradeGroup(groupId);
              return (
                <div key={groupId}>
                  <label
                    htmlFor={`job-${groupId}`}
                    className="mb-1 block text-xs font-medium text-slate-600"
                  >
                    {group?.label}
                  </label>
                  <select
                    id={`job-${groupId}`}
                    value={jobByGroup[groupId] ?? ""}
                    onChange={(e) => {
                      setJobByGroup((prev) => ({ ...prev, [groupId]: e.target.value }));
                      setError(null);
                    }}
                    className={`${inputClass} text-slate-700`}
                    required
                    disabled={!fieldsEnabled}
                  >
                    <option value="" disabled>
                      Sélectionnez votre métier
                    </option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </section>

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
