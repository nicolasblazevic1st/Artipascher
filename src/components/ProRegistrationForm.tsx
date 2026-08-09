"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import HelpTooltip from "@/components/HelpTooltip";
import {
  PRO_REGISTRATION_COMPARTMENTS,
  PRO_REGISTRATION_DOCUMENTS,
  proDocumentFieldName,
  tradeDecennaleFieldName,
  validateProDocumentFile,
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
import {
  REFERRAL_REWARD_CREDITS,
  REFERRAL_SPEND_THRESHOLD,
} from "@/lib/store-types";

type FormStatus = "idle" | "verifying" | "verified" | "submitting" | "success" | "error";

export default function ProRegistrationForm() {
  const [siret, setSiret] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});
  const [jobByGroup, setJobByGroup] = useState<Record<string, string>>({});
  const [rcsGroupIds, setRcsGroupIds] = useState<Set<string>>(new Set());
  const [documents, setDocuments] = useState<Record<string, File | null>>({});
  const [decennaleByGroup, setDecennaleByGroup] = useState<Record<string, File | null>>({});
  const [verification, setVerification] = useState<RcsVerificationResult | null>(null);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferralCode(ref.trim().toUpperCase());
  }, []);

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
    setDecennaleByGroup({});
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
      setDecennaleByGroup((prev) => {
        const next = { ...prev };
        delete next[groupId];
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

    for (const groupId of activeGroupIds) {
      const decennaleError = validateProDocumentFile(decennaleByGroup[groupId]!);
      if (decennaleError) {
        const group = GROUPED_QUALIBAT_JOBS.find((g) => g.group.id === groupId)?.group;
        setError(
          `${group?.label ?? "Corps de métier"} : ${
            decennaleError === "Fichier manquant."
              ? "attestation décennale couvrant ce métier obligatoire."
              : decennaleError
          }`
        );
        setStatus("error");
        return;
      }
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
    formData.set("rcsVerified", "true");
    formData.set("password", password);
    formData.set("passwordConfirm", passwordConfirm);
    if (referralCode.trim()) {
      formData.set("referralCode", referralCode.trim());
    }

    for (const doc of PRO_REGISTRATION_DOCUMENTS) {
      const file = documents[doc.id];
      if (file) {
        formData.append(proDocumentFieldName(doc.id), file);
      }
    }

    for (const groupId of activeGroupIds) {
      const file = decennaleByGroup[groupId];
      if (file) {
        formData.append(tradeDecennaleFieldName(groupId), file);
      }
    }

    const res = await fetch("/api/inscriptions", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const body = (await res.json()) as { error?: string; details?: string[] };
      const detailText =
        body.details && body.details.length > 1
          ? `${body.error ?? "Erreur"} ${body.details.slice(1).join(" · ")}`
          : body.error ?? "Erreur lors de l'inscription.";
      setError(detailText);
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
          établissement actif, siège en 59 ou 62) peuvent s&apos;inscrire et
          débloquer des contacts.
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

      {!fieldsEnabled && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
          Vérifiez votre SIRET pour débloquer la suite : coordonnées, métiers,
          documents obligatoires et mot de passe.
        </p>
      )}

      <input
        type="text"
        placeholder="Nom de l'entreprise"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        className={inputClass}
        required={fieldsEnabled}
        readOnly={!!verification?.companyName}
        disabled={!fieldsEnabled}
      />

      <input
        type="email"
        placeholder="Email professionnel"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
        required={fieldsEnabled}
        disabled={!fieldsEnabled}
      />

      <input
        type="tel"
        placeholder="Téléphone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className={inputClass}
        required={fieldsEnabled}
        disabled={!fieldsEnabled}
      />

      <section
        className={`rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4 ${
          !fieldsEnabled ? "opacity-60" : ""
        }`}
      >
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

      <section className={`space-y-4 ${!fieldsEnabled ? "opacity-60" : ""}`}>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Documents obligatoires
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            JPG, PNG, WebP ou PDF · max 10 Mo par fichier.
            {!fieldsEnabled && (
              <span className="mt-1 block font-medium text-slate-600">
                Disponible après vérification RCS réussie.
              </span>
            )}
          </p>
        </div>

        {PRO_REGISTRATION_COMPARTMENTS.filter((c) => c.level === 1).map(
          (compartment) => {
          const docs = PRO_REGISTRATION_DOCUMENTS.filter((doc) =>
            compartment.documentIds.includes(doc.id)
          );
          const isLevel1 = compartment.level === 1;

          return (
            <div
              key={compartment.level}
              className={`rounded-xl border p-4 ${
                isLevel1
                  ? "border-brand-200 bg-brand-50/40"
                  : compartment.infoOnly
                    ? "border-slate-200 bg-slate-50"
                    : "border-dashed border-slate-300 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isLevel1
                      ? "bg-brand-600 text-white"
                      : compartment.infoOnly
                        ? "bg-slate-700 text-white"
                        : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {compartment.badge}
                </span>
                <h4 className="text-sm font-semibold text-slate-900">{compartment.title}</h4>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {compartment.summary}
              </p>

              {isLevel1 && verification?.valid && (
                <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  ✓ SIREN / RNE vérifié en direct · établissement actif en{" "}
                  {verification.department}
                </p>
              )}

              {compartment.infoOnly && compartment.infoItems && (
                <ul className="mt-3 space-y-2">
                  {compartment.infoItems.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-xs text-slate-600"
                    >
                      <span className="mt-0.5 text-slate-400">○</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              {compartment.includesDecennale && activeGroupIds.length > 0 && (
                <div className="mt-4 space-y-3 border-t border-brand-100 pt-4">
                  <div className="rounded-lg border border-brand-200 bg-white p-3 text-xs leading-relaxed text-brand-900">
                    <p className="font-semibold">Garantie décennale par métier</p>
                    <p className="mt-1 text-brand-800">
                      Votre assurance décennale doit <strong>nommer chaque activité</strong>{" "}
                      que vous exercez. Artipascher vérifie chaque attestation pour protéger
                      le client et votre responsabilité.
                    </p>
                  </div>
                  {activeGroupIds.map((groupId) => {
                    const group = GROUPED_QUALIBAT_JOBS.find(
                      (g) => g.group.id === groupId
                    )?.group;
                    return (
                      <div key={`decennale-${groupId}`}>
                        <label
                          htmlFor={`decennale-${groupId}`}
                          className="mb-1 block text-xs font-medium text-slate-700"
                        >
                          Attestation décennale — « {group?.label} »{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          id={`decennale-${groupId}`}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          required={fieldsEnabled}
                          disabled={!fieldsEnabled}
                          onChange={(e) => {
                            setDecennaleByGroup((prev) => ({
                              ...prev,
                              [groupId]: e.target.files?.[0] ?? null,
                            }));
                            setError(null);
                          }}
                          className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700"
                        />
                        {decennaleByGroup[groupId] && (
                          <p className="mt-1 text-xs text-brand-700">
                            Fichier sélectionné : {decennaleByGroup[groupId]!.name}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {compartment.includesDecennale && activeGroupIds.length === 0 && fieldsEnabled && (
                <p className="mt-3 text-xs text-amber-700">
                  Cochez au moins un corps de métier pour joindre vos attestations décennale.
                </p>
              )}

              {docs.length > 0 && (
                <ul className={`space-y-4 ${compartment.includesDecennale ? "mt-4 border-t border-brand-100 pt-4" : "mt-4"}`}>
                  {docs.map((doc) => (
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
                        required={doc.required && fieldsEnabled}
                        disabled={!fieldsEnabled}
                        onChange={(e) =>
                          handleDocumentChange(doc.id, e.target.files?.[0] ?? null)
                        }
                        className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 disabled:cursor-not-allowed"
                      />
                      {documents[doc.id] && (
                        <p className="mt-1 text-xs text-brand-700">
                          Fichier sélectionné : {documents[doc.id]!.name}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      <div>
        <label
          htmlFor="referralCode"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Code de parrainage{" "}
          <span className="font-normal text-slate-400">(optionnel)</span>
        </label>
        <input
          id="referralCode"
          type="text"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
          className={`${inputClass} font-mono uppercase tracking-wider`}
          placeholder="Ex. APXXXXXX"
          disabled={!fieldsEnabled}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-slate-500">
          Si une entreprise vérifiée vous a invité, saisissez son code. Après{" "}
          {REFERRAL_SPEND_THRESHOLD} crédit dépensé, votre parrain reçoit{" "}
          {REFERRAL_REWARD_CREDITS} crédit.
        </p>
      </div>

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
          required={fieldsEnabled}
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
          required={fieldsEnabled}
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
        <div className="space-y-2 text-center text-sm text-emerald-700">
          <p className="font-semibold">Certification obtenue.</p>
          <p>
            Un email de confirmation vient de vous être envoyé. Validez votre adresse
            puis{" "}
            <Link href="/pro/login" className="font-semibold underline">
              connectez-vous à votre espace pro
            </Link>
            .
          </p>
        </div>
      )}
    </form>
  );
}
