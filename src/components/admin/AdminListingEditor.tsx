"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BanAddressAutocomplete, {
  type SelectedBanAddress,
} from "@/components/BanAddressAutocomplete";
import {
  AUCTION_DURATION_OPTIONS,
  resolveAuctionDurationHours,
} from "@/lib/auction-duration";
import { formatWorkRequestAddress } from "@/lib/client-address";
import {
  MAX_CONTACT_UNLOCKS_PER_REQUEST,
  MIN_CONTACT_ARTISANS,
} from "@/lib/contact-slots";
import { CLIENT_KIND_LABELS, WORK_SCOPE_LABELS } from "@/lib/copropriete";
import {
  MAX_PHOTOS,
  MIN_DESCRIPTION_LENGTH,
  validatePhotoFile,
} from "@/lib/demandes-validation";
import { MIN_GOOGLE_RATING_OPTIONS } from "@/lib/google-rating";
import { getNafOptionsForCategory } from "@/lib/naf-codes";
import {
  formatUnlockPriceEur,
  getWorkOptionsForNafCodes,
  OTHER_WORK_OPTION_ID,
  resolveUnlockPricing,
} from "@/lib/pricing-tiers";
import type { ClientKind, WorkRequest, WorkScope } from "@/lib/store-types";
import { WORK_CATEGORIES } from "@/lib/work-categories";

const INPUT =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900";

function toDatetimeLocal(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function listingStatus(request: WorkRequest): {
  text: string;
  className: string;
} {
  if (request.status === "pending") {
    return { text: "En attente", className: "bg-amber-100 text-amber-800" };
  }
  if (request.status === "rejected") {
    return { text: "Refusée", className: "bg-red-100 text-red-800" };
  }
  if (request.unpublishedAt) {
    return { text: "Dépubliée", className: "bg-orange-100 text-orange-800" };
  }
  if (request.auctionEndsAt && new Date(request.auctionEndsAt).getTime() <= Date.now()) {
    return { text: "Terminée", className: "bg-slate-100 text-slate-600" };
  }
  return { text: "Publiée", className: "bg-emerald-100 text-emerald-800" };
}

interface Props {
  request: WorkRequest;
  backHref: string;
}

export default function AdminListingEditor({ request, backHref }: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(request.firstName);
  const [lastName, setLastName] = useState(request.lastName);
  const [email, setEmail] = useState(request.email);
  const [phone, setPhone] = useState(request.phone ?? "");
  const [clientKind, setClientKind] = useState<ClientKind>(
    request.clientKind ?? "individual"
  );
  const [workScope, setWorkScope] = useState<WorkScope | "">(
    request.workScope ?? ""
  );
  const [companyName, setCompanyName] = useState(request.companyName ?? "");
  const [clientSiret, setClientSiret] = useState(request.clientSiret ?? "");
  const [category, setCategory] = useState(request.category);
  const [selectedNafCodes, setSelectedNafCodes] = useState<string[]>(
    request.nafCodes ?? []
  );
  const [workOptionId, setWorkOptionId] = useState(request.workOptionId ?? "");
  const [workOptionOtherDescription, setWorkOptionOtherDescription] = useState(
    request.workOptionOtherDescription ?? ""
  );
  const [description, setDescription] = useState(request.description);
  const [requestedWorkStartDate, setRequestedWorkStartDate] = useState(
    request.requestedWorkStartDate ?? ""
  );
  const [addressLine2, setAddressLine2] = useState(request.addressLine2 ?? "");
  const [changingAddress, setChangingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState<SelectedBanAddress | null>(null);
  const [auctionDurationHours, setAuctionDurationHours] = useState(
    resolveAuctionDurationHours(request)
  );
  const [auctionEndsAt, setAuctionEndsAt] = useState(
    toDatetimeLocal(request.auctionEndsAt)
  );
  const [recalculateEndsAt, setRecalculateEndsAt] = useState(false);
  const [maxContactArtisans, setMaxContactArtisans] = useState(
    request.maxContactArtisans ?? 5
  );
  const [preferEstablishedCompany, setPreferEstablishedCompany] = useState<
    "any" | "true" | "false"
  >(
    request.preferEstablishedCompany === true
      ? "true"
      : request.preferEstablishedCompany === false
        ? "false"
        : "any"
  );
  const [minGoogleRating, setMinGoogleRating] = useState<number | "">(
    request.minGoogleRating ?? ""
  );
  const [isTest, setIsTest] = useState(request.isTest === true);
  const [adminNote, setAdminNote] = useState(request.adminNote ?? "");
  const [keepPhotos, setKeepPhotos] = useState<string[]>(request.photos ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const nafOptions = useMemo(
    () => getNafOptionsForCategory(category),
    [category]
  );
  const requiresNafChoice = nafOptions.length > 1;
  const effectiveNafCodes =
    selectedNafCodes.length > 0
      ? selectedNafCodes
      : nafOptions.length === 1
        ? [nafOptions[0].code]
        : [];
  const workOptions = getWorkOptionsForNafCodes(effectiveNafCodes);
  const unlock = resolveUnlockPricing({
    pricingTier: request.pricingTier,
    workOptionId,
  });
  const status = listingStatus({
    ...request,
    unpublishedAt: request.unpublishedAt,
    auctionEndsAt: request.auctionEndsAt,
  });
  const published = request.status === "approved" && Boolean(request.auctionId);
  const photosChanged =
    newFiles.length > 0 ||
    keepPhotos.length !== (request.photos ?? []).length ||
    keepPhotos.some((url, i) => url !== request.photos?.[i]);

  function handleCategoryChange(next: string) {
    setCategory(next);
    const options = getNafOptionsForCategory(next);
    setSelectedNafCodes(options.length === 1 ? [options[0].code] : []);
    setWorkOptionId("");
    setWorkOptionOtherDescription("");
  }

  function toggleNaf(code: string) {
    setSelectedNafCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
    setWorkOptionId("");
    setWorkOptionOtherDescription("");
  }

  async function persist(
    extra?: Record<string, unknown>,
    success = "Annonce mise à jour."
  ) {
    setSaving(true);
    setError(null);
    setMessage(null);

    const payload: Record<string, unknown> = {
      firstName,
      lastName,
      email,
      phone,
      clientKind,
      workScope: workScope || null,
      companyName,
      clientSiret,
      category,
      nafCodes: effectiveNafCodes,
      workOptionId:
        workOptionId ||
        (category === request.category ? request.workOptionId : null) ||
        null,
      workOptionOtherDescription: workOptionOtherDescription || null,
      pricingTier: request.pricingTier ?? null,
      description,
      requestedWorkStartDate: requestedWorkStartDate || null,
      addressLine2,
      auctionDurationHours,
      ...(published
        ? {
            auctionEndsAt: auctionEndsAt
              ? new Date(auctionEndsAt).toISOString()
              : null,
            recalculateEndsAt,
          }
        : {}),
      maxContactArtisans,
      preferEstablishedCompany:
        preferEstablishedCompany === "any" ? null : preferEstablishedCompany === "true",
      minGoogleRating: minGoogleRating === "" ? null : minGoogleRating,
      isTest,
      adminNote,
      ...extra,
    };

    if (changingAddress && newAddress) {
      payload.addressLine = newAddress.addressLine;
      payload.postalCode = newAddress.postalCode;
      payload.city = newAddress.city;
      payload.banAddressId = newAddress.banAddressId;
    }

    try {
      const res = await fetch(`/api/admin/demandes/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; request?: WorkRequest };
      if (!res.ok) {
        setError(data.error ?? "Enregistrement impossible.");
        return;
      }

      if (photosChanged) {
        const formData = new FormData();
        formData.set("keep", JSON.stringify(keepPhotos));
        for (const file of newFiles) formData.append("photos", file);
        const photoRes = await fetch(`/api/admin/demandes/${request.id}/photos`, {
          method: "POST",
          body: formData,
        });
        const photoData = (await photoRes.json()) as {
          error?: string;
          photos?: string[];
        };
        if (!photoRes.ok) {
          setError(photoData.error ?? "Photos non enregistrées.");
          return;
        }
        if (photoData.photos) {
          setKeepPhotos(photoData.photos);
          setNewFiles([]);
        }
      }

      if (data.request?.auctionEndsAt) {
        setAuctionEndsAt(toDatetimeLocal(data.request.auctionEndsAt));
      }
      setMessage(success);
      setRecalculateEndsAt(false);
      setChangingAddress(false);
      setNewAddress(null);
      router.refresh();
      if (extra?.action) {
        router.push(backHref);
      }
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(action: "unpublish" | "republish" | "end_now") {
    const confirmations = {
      unpublish:
        "Dépublier cette annonce ? Elle disparaîtra du site public et des listes artisans.",
      republish:
        "Remettre cette annonce en ligne ? Si elle est expirée, la durée choisie partira de maintenant.",
      end_now: "Terminer l’annonce immédiatement ?",
    };
    if (!window.confirm(confirmations[action])) return;
    await persist({ action }, "Publication mise à jour.");
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (changingAddress && !newAddress) {
          setError("Sélectionnez une nouvelle adresse BAN, ou annulez le changement.");
          return;
        }
        void persist();
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
            >
              {status.text}
            </span>
            {isTest && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                Démo
              </span>
            )}
          </div>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Rééditer l’annonce
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Toutes les modifications sont visibles immédiatement sur le site
            public (sauf si l’annonce est dépubliée).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Publication</h3>
        <p className="mt-1 text-sm text-slate-600">
          Contrôle de la visibilité et de la durée de mise en contact.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Durée catalogue
            </span>
            <select
              className={INPUT}
              value={auctionDurationHours}
              onChange={(e) => setAuctionDurationHours(Number(e.target.value))}
            >
              {!AUCTION_DURATION_OPTIONS.some((o) => o.value === auctionDurationHours) && (
                <option value={auctionDurationHours}>
                  {auctionDurationHours} heures (valeur actuelle)
                </option>
              )}
              {AUCTION_DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {published && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Fin d’annonce
              </span>
              <input
                type="datetime-local"
                className={INPUT}
                value={auctionEndsAt}
                onChange={(e) => {
                  setAuctionEndsAt(e.target.value);
                  setRecalculateEndsAt(false);
                }}
                disabled={recalculateEndsAt}
              />
            </label>
          )}
        </div>
        {published && (
          <>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={recalculateEndsAt}
                onChange={(e) => setRecalculateEndsAt(e.target.checked)}
              />
              Recalculer la date de fin à partir de maintenant (durée ci-dessus)
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              {request.unpublishedAt ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleAction("republish")}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Remettre en ligne
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleAction("unpublish")}
                  className="rounded-lg border border-orange-200 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-60"
                >
                  Dépublier
                </button>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => handleAction("end_now")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Terminer maintenant
              </button>
            </div>
          </>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Chantier</h3>
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-700">Catégorie</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ...WORK_CATEGORIES,
              ...(!WORK_CATEGORIES.includes(category as (typeof WORK_CATEGORIES)[number])
                ? [category]
                : []),
            ].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  category === cat
                    ? "border-brand-500 bg-brand-50 font-medium"
                    : "border-slate-200 hover:border-brand-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {requiresNafChoice && (
          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-slate-700">
              Activités NAF
            </legend>
            <ul className="mt-2 space-y-2">
              {nafOptions.map((opt) => (
                <li key={opt.code}>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedNafCodes.includes(opt.code)}
                      onChange={() => toggleNaf(opt.code)}
                      className="mt-0.5"
                    />
                    <span>{opt.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        {workOptions.length > 0 && (
          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Prestation
            </span>
            <select
              className={INPUT}
              value={workOptionId}
              onChange={(e) => setWorkOptionId(e.target.value)}
            >
              <option value="">— Conserver / choisir —</option>
              {workOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name} — {opt.detail}
                </option>
              ))}
              <option value={OTHER_WORK_OPTION_ID}>Autre prestation</option>
            </select>
          </label>
        )}
        {workOptionId === OTHER_WORK_OPTION_ID && (
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Description autre prestation
            </span>
            <input
              className={INPUT}
              value={workOptionOtherDescription}
              onChange={(e) => setWorkOptionOtherDescription(e.target.value)}
            />
          </label>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Prix de déblocage actuel : {formatUnlockPriceEur(unlock.unlockPriceEur)}
        </p>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Description publique ({description.trim().length}/{MIN_DESCRIPTION_LENGTH} min.)
          </span>
          <textarea
            className={`${INPUT} min-h-40`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Début de travaux souhaité
          </span>
          <input
            type="date"
            className={INPUT}
            value={requestedWorkStartDate}
            onChange={(e) => setRequestedWorkStartDate(e.target.value)}
          />
        </label>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Adresse</h3>
        <p className="mt-2 text-sm text-slate-700">
          {formatWorkRequestAddress(request)}
        </p>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Complément (bâtiment, appartement…)
          </span>
          <input
            className={INPUT}
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
          />
        </label>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => {
              setChangingAddress((v) => !v);
              setNewAddress(null);
            }}
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            {changingAddress ? "Annuler le changement d’adresse" : "Changer l’adresse"}
          </button>
        </div>
        {changingAddress && (
          <div className="mt-3">
            <BanAddressAutocomplete
              inputClass={INPUT}
              onSelect={setNewAddress}
              required={false}
            />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Photos</h3>
        <p className="mt-1 text-sm text-slate-600">
          Jusqu’à {MAX_PHOTOS} photos. Cliquez une miniature pour la retirer.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {keepPhotos.map((photo) => (
            <button
              key={photo}
              type="button"
              onClick={() =>
                setKeepPhotos((prev) => prev.filter((url) => url !== photo))
              }
              className="relative overflow-hidden rounded-lg border border-slate-200"
              title="Retirer"
            >
              <img src={photo} alt="" className="h-20 w-20 object-cover" />
            </button>
          ))}
          {newFiles.map((file, index) => (
            <button
              key={`${file.name}-${index}`}
              type="button"
              onClick={() =>
                setNewFiles((prev) => prev.filter((_, i) => i !== index))
              }
              className="relative overflow-hidden rounded-lg border border-dashed border-brand-300"
              title="Retirer"
            >
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="h-20 w-20 object-cover"
              />
            </button>
          ))}
        </div>
        {keepPhotos.length + newFiles.length < MAX_PHOTOS && (
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Ajouter des photos
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                const next: File[] = [];
                for (const file of files) {
                  const err = validatePhotoFile(file);
                  if (err) {
                    setError(err);
                    return;
                  }
                  next.push(file);
                }
                setNewFiles((prev) =>
                  [...prev, ...next].slice(0, MAX_PHOTOS - keepPhotos.length)
                );
              }}
            />
          </label>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Critères de matching</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Artisans max
            </span>
            <select
              className={INPUT}
              value={maxContactArtisans}
              onChange={(e) => setMaxContactArtisans(Number(e.target.value))}
            >
              {Array.from(
                { length: MAX_CONTACT_UNLOCKS_PER_REQUEST - MIN_CONTACT_ARTISANS + 1 },
                (_, i) => MIN_CONTACT_ARTISANS + i
              ).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Ancienneté entreprise
            </span>
            <select
              className={INPUT}
              value={preferEstablishedCompany}
              onChange={(e) =>
                setPreferEstablishedCompany(e.target.value as "any" | "true" | "false")
              }
            >
              <option value="any">Indifférent</option>
              <option value="true">Uniquement 5 ans et +</option>
              <option value="false">Uniquement moins de 5 ans</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Note Google minimale
            </span>
            <select
              className={INPUT}
              value={minGoogleRating}
              onChange={(e) =>
                setMinGoogleRating(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            >
              <option value="">Peu importe</option>
              {MIN_GOOGLE_RATING_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  ≥ {String(n).replace(".", ",")}/5
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isTest}
            onChange={(e) => setIsTest(e.target.checked)}
          />
          Annonce de démonstration (bandeau test, 1 seule démo publique à la fois)
        </label>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Client</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Prénom</span>
            <input className={INPUT} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Nom</span>
            <input className={INPUT} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">E-mail</span>
            <input className={INPUT} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Téléphone</span>
            <input className={INPUT} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Type de client</span>
            <select
              className={INPUT}
              value={clientKind}
              onChange={(e) => setClientKind(e.target.value as ClientKind)}
            >
              {(Object.keys(CLIENT_KIND_LABELS) as ClientKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {CLIENT_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </label>
          {clientKind === "copropriete" && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Périmètre</span>
              <select
                className={INPUT}
                value={workScope}
                onChange={(e) => setWorkScope(e.target.value as WorkScope | "")}
              >
                <option value="">— Choisir —</option>
                {(Object.keys(WORK_SCOPE_LABELS) as WorkScope[]).map((scope) => (
                  <option key={scope} value={scope}>
                    {WORK_SCOPE_LABELS[scope]}
                  </option>
                ))}
              </select>
            </label>
          )}
          {clientKind === "company" && (
            <>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Raison sociale</span>
                <input className={INPUT} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">SIRET</span>
                <input className={INPUT} value={clientSiret} onChange={(e) => setClientSiret(e.target.value)} />
              </label>
            </>
          )}
        </div>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Note interne (non visible hors admin)
          </span>
          <textarea
            className={`${INPUT} min-h-20`}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
        </label>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Enregistrer les modifications"}
        </button>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
