"use client";

import { useCallback, useEffect, useState } from "react";

type RangeDays = 7 | 30 | 90;
type FormTab = "lead" | "pro";

interface FunnelStepStat {
  id: string;
  label: string;
  sessions: number;
  percentOfStart: number;
  dropOffFromPrevious: number | null;
}

interface CountRow {
  key: string;
  label: string;
  sessions: number;
  events: number;
}

interface IntentRow {
  key: string;
  label: string;
  sessions: number;
  submitted: number;
  conversionPercent: number;
}

interface StepTimeRow {
  key: string;
  label: string;
  samples: number;
  medianSeconds: number;
}

interface FunnelSessionRow {
  sessionShort: string;
  startedAt: string;
  lastAt: string;
  outcome: string;
  lastLabel: string;
  variant?: string;
  guestMode?: boolean;
  utmContent?: string;
  utmSource?: string;
  utmCampaign?: string;
  utmTerm?: string;
  device?: string;
  adsClick?: boolean;
  workCategory?: string;
  adsCategory?: string;
  keywordCategory?: string;
  gaSent: boolean;
  otherWork?: string;
  descriptionDraft?: string;
  internal?: boolean;
  ip?: string;
}

interface FunnelSavedTextRow {
  sessionShort: string;
  updatedAt: string;
  workCategory?: string;
  otherWork?: string;
  description?: string;
  submitted: boolean;
  internal?: boolean;
  ip?: string;
}

interface FormFunnelSide {
  sessions: number;
  submitted: number;
  conversionPercent: number;
  funnel: FunnelStepStat[];
  lastStep: CountRow[];
  abandons: CountRow[];
  validationErrors: CountRow[];
  byVariant: CountRow[];
  byUtmContent: CountRow[];
  byUtmSource: CountRow[];
  byUtmCampaign: IntentRow[];
  byUtmTerm: IntentRow[];
  byWorkCategory: IntentRow[];
  byDevice: IntentRow[];
  byAdsMismatch: IntentRow[];
  stepTimes: StepTimeRow[];
  recent: FunnelSessionRow[];
  savedTexts?: FunnelSavedTextRow[];
}

interface FormFunnelReport {
  rangeDays: number;
  since: string;
  until: string;
  totalEvents: number;
  internalLeadSessions: number;
  internalProSessions: number;
  lead: FormFunnelSide;
  pro: FormFunnelSide;
}

const VARIANT_LABELS: Record<string, string> = {
  default: "Métier précoche",
  general: "Plusieurs métiers",
};

const DEVICE_LABELS: Record<string, string> = {
  mobile: "Téléphone",
  tablet: "Tablette",
  desktop: "Ordinateur",
};

function formatMedian(seconds: number) {
  if (seconds < 60) return `${seconds} s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec === 0 ? `${min} min` : `${min} min ${sec} s`;
}

function realTrade(value: string | undefined): string | undefined {
  if (!value || value === "unknown") return undefined;
  return value;
}

function tradeDetailLabel(row: FunnelSessionRow): string {
  const chosen = realTrade(row.workCategory);
  const arrival =
    realTrade(row.adsCategory) ?? realTrade(row.keywordCategory);

  if (chosen) {
    if (arrival && arrival !== chosen) return `${arrival} → ${chosen}`;
    return chosen;
  }
  if (row.workCategory === "unknown") {
    if (arrival) return `${arrival} → Je ne sais pas`;
    return "Aucun métier coché";
  }
  if (arrival) return `${arrival} (non coché)`;
  return "Aucun métier coché";
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function workCategoryLabel(value?: string) {
  if (!value) return null;
  return value === "unknown" ? "Je ne sais pas / plusieurs métiers" : value;
}

function SavedTextsTable({ rows }: { rows: FunnelSavedTextRow[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">Textes saisis</h3>
      <p className="mt-1 text-sm text-slate-500">
        Ce que la personne a écrit dans le formulaire, même si la demande n&apos;a
        pas été envoyée. Conservé 90 jours, admin seulement — pas envoyé à Google.
      </p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Aucun texte conservé sur cette période. Les prochaines saisies
          (« Autre », description) apparaîtront ici.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {rows.map((row) => (
            <li
              key={`${row.sessionShort}-${row.updatedAt}`}
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3"
            >
              <p className="text-xs text-slate-500">
                {formatWhen(row.updatedAt)}
                <span className="ml-2 font-mono text-[10px] text-slate-400">
                  …{row.sessionShort}
                </span>
                {row.ip ? (
                  <span className="ml-2 font-mono text-[10px] text-slate-400">
                    {row.ip}
                  </span>
                ) : null}
                {workCategoryLabel(row.workCategory) ? (
                  <span className="ml-2">{workCategoryLabel(row.workCategory)}</span>
                ) : null}
                {row.submitted ? (
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                    Envoyée
                  </span>
                ) : null}
                {row.internal ? (
                  <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-white">
                    Toi (admin)
                  </span>
                ) : null}
              </p>
              {row.otherWork ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                  <span className="font-medium text-slate-500">Autre / travaux : </span>
                  {row.otherWork}
                </p>
              ) : null}
              {row.description ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                  <span className="font-medium text-slate-500">Description : </span>
                  {row.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FunnelBars({ steps }: { steps: FunnelStepStat[] }) {
  const max = Math.max(1, ...steps.map((s) => s.sessions));
  return (
    <ol className="space-y-3">
      {steps.map((step) => (
        <li key={step.id}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-slate-800">{step.label}</span>
            <span className="shrink-0 tabular-nums text-slate-500">
              {step.sessions}{" "}
              <span className="text-xs">({step.percentOfStart} %)</span>
              {step.dropOffFromPrevious != null && step.dropOffFromPrevious > 0 && (
                <span className="ml-2 text-xs font-medium text-red-600">
                  −{step.dropOffFromPrevious} %
                </span>
              )}
            </span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-600"
              style={{
                width:
                  step.sessions === 0
                    ? "0%"
                    : `${Math.max(2, (step.sessions / max) * 100)}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

function CountTable({
  title,
  empty,
  rows,
  valueLabel = "Sessions",
}: {
  title: string;
  empty: string;
  rows: CountRow[];
  valueLabel?: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      ) : (
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="pb-2 font-medium">Libellé</th>
              <th className="pb-2 text-right font-medium">{valueLabel}</th>
              <th className="pb-2 text-right font-medium">Événements</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="py-2 text-slate-700">{row.label}</td>
                <td className="py-2 text-right tabular-nums font-medium">
                  {row.sessions}
                </td>
                <td className="py-2 text-right tabular-nums text-slate-500">
                  {row.events}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function IntentTable({
  title,
  hint,
  empty,
  rows,
}: {
  title: string;
  hint: string;
  empty: string;
  rows: IntentRow[];
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      ) : (
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="pb-2 font-medium">Libellé</th>
              <th className="pb-2 text-right font-medium">Visites</th>
              <th className="pb-2 text-right font-medium">Demandes</th>
              <th className="pb-2 text-right font-medium">Conv.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="py-2 text-slate-700">{row.label}</td>
                <td className="py-2 text-right tabular-nums font-medium">
                  {row.sessions}
                </td>
                <td className="py-2 text-right tabular-nums text-slate-700">
                  {row.submitted}
                </td>
                <td className="py-2 text-right tabular-nums text-slate-500">
                  {row.conversionPercent} %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function StepTimeTable({ rows }: { rows: StepTimeRow[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">Temps médian par étape</h3>
      <p className="mt-1 text-sm text-slate-500">
        Entre l&apos;ouverture de l&apos;étape et la validation ou l&apos;abandon.
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          Pas encore de durées : elles s&apos;enregistrent aux prochaines visites.
        </p>
      ) : (
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="pb-2 font-medium">Étape</th>
              <th className="pb-2 text-right font-medium">Médiane</th>
              <th className="pb-2 text-right font-medium">Mesures</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="py-2 text-slate-700">{row.label}</td>
                <td className="py-2 text-right tabular-nums font-medium">
                  {formatMedian(row.medianSeconds)}
                </td>
                <td className="py-2 text-right tabular-nums text-slate-500">
                  {row.samples}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function SidePanel({ side, form }: { side: FormFunnelSide; form: FormTab }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-slate-500">
            Sessions formulaire
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            {side.sessions}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium uppercase text-emerald-700">
            {form === "lead" ? "Demandes envoyées" : "Inscriptions envoyées"}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-900">
            {side.submitted}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-slate-500">
            Taux de conversion
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            {side.conversionPercent} %
          </p>
        </div>
      </div>

      {form === "lead" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <IntentTable
            title="Mots-clés Google"
            hint="Mot-clé de l’annonce qui a matché (pas forcément la requête tapée). Classé par nombre de visites."
            empty="Aucun mot-clé réel pour l’instant. Ils arrivent dès qu’un clic Search envoie utm_term avec {keyword} remplacé (suffixe d’URL Google Ads)."
            rows={side.byUtmTerm ?? []}
          />
          <IntentTable
            title="Métiers choisis"
            hint="Ce que la personne a coché à l’étape 1 — y compris hors pub. Meilleur signal de demande réelle."
            empty="Pas encore de métier enregistré sur cette période."
            rows={side.byWorkCategory ?? []}
          />
          <IntentTable
            title="Campagnes (utm_campaign)"
            hint="Nom de campagne Google Ads, souvent la ville (ex. loc-bailleul)."
            empty="Aucune campagne UTM pour l’instant."
            rows={side.byUtmCampaign ?? []}
          />
          <IntentTable
            title="Téléphone / ordinateur"
            hint="Largeur d’écran à l’ouverture du formulaire."
            empty="Pas encore de ventilation appareil."
            rows={side.byDevice ?? []}
          />
        </div>
      )}

      {form === "lead" && (
        <IntentTable
          title="Pub vs métier coché"
          hint="Écart entre le métier d’arrivée (annonce, mot-clé ou précoche) et celui coché ensuite — y compris une arrivée sans métier puis un choix réel."
          empty="Aucun écart pub / métier pour l’instant."
          rows={side.byAdsMismatch ?? []}
        />
      )}

      {form === "pro" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <IntentTable
            title="Téléphone / ordinateur"
            hint="Largeur d’écran à l’ouverture du formulaire."
            empty="Pas encore de ventilation appareil."
            rows={side.byDevice ?? []}
          />
          <IntentTable
            title="Campagnes (utm_campaign)"
            hint="UTM campagne si l’artisan vient d’une pub."
            empty="Aucune campagne UTM pour l’instant."
            rows={side.byUtmCampaign ?? []}
          />
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Jusqu&apos;où vont-ils ?</h3>
        <p className="mt-1 text-sm text-slate-500">
          Sessions uniques par étape. Le % rouge est la perte depuis l&apos;étape
          précédente.
        </p>
        <div className="mt-5">
          {side.funnel.length === 0 ? (
            <p className="text-sm text-slate-500">Pas encore de parcours.</p>
          ) : (
            <FunnelBars steps={side.funnel} />
          )}
        </div>
      </section>

      {form === "lead" && <StepTimeTable rows={side.stepTimes ?? []} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <CountTable
          title="Dernière étape atteinte"
          empty="Aucune session sur la période."
          rows={side.lastStep}
        />
        <CountTable
          title="Abandons"
          empty="Aucun abandon enregistré."
          rows={side.abandons}
        />
        <CountTable
          title="Erreurs de validation"
          empty="Aucune erreur de validation."
          rows={side.validationErrors}
          valueLabel="Personnes"
        />
        {form === "lead" ? (
          <CountTable
            title="Type de formulaire"
            empty="Pas encore de ventilation."
            rows={side.byVariant}
          />
        ) : (
          <CountTable
            title="Source UTM"
            empty="Pas de source UTM sur ces sessions."
            rows={side.byUtmSource}
          />
        )}
      </div>

      {form === "lead" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <CountTable
            title="Métier pub (utm_content)"
            empty="Aucun utm_content pour l&apos;instant (annonces métier)."
            rows={side.byUtmContent}
          />
          <CountTable
            title="Source UTM"
            empty="Pas de source UTM sur ces sessions."
            rows={side.byUtmSource}
          />
        </div>
      )}

      {form === "lead" && (
        <div className="mb-6">
          <SavedTextsTable rows={side.savedTexts ?? []} />
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Sessions récentes</h3>
        <p className="mt-1 text-sm text-slate-500">
          Identifiant anonyme (6 derniers caractères) et adresse IP (sécurité /
          diagnostic, 90 jours). Les textes saisis sont dans le bloc ci-dessus.
        </p>
        {side.recent.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Aucune session récente.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2 pr-3 font-medium">Quand</th>
                  <th className="py-2 pr-3 font-medium">Jusqu&apos;où</th>
                  <th className="py-2 pr-3 font-medium">Résultat</th>
                  <th className="hidden py-2 pr-3 font-medium lg:table-cell">
                    IP
                  </th>
                  <th className="hidden py-2 pr-3 font-medium md:table-cell">
                    Détail
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {side.recent.map((row) => (
                  <tr key={`${row.sessionShort}-${row.startedAt}`}>
                    <td className="py-2 pr-3 text-slate-600">
                      <p className="tabular-nums">{formatWhen(row.lastAt)}</p>
                      <p className="font-mono text-[10px] text-slate-400">
                        …{row.sessionShort}
                      </p>
                    </td>
                    <td className="py-2 pr-3 font-medium text-slate-800">
                      {row.lastLabel}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.outcome === "Envoyée"
                            ? "bg-emerald-100 text-emerald-800"
                            : row.outcome === "Abandonnée"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {row.outcome}
                      </span>
                      {row.internal ? (
                        <span className="ml-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-white">
                          Toi
                        </span>
                      ) : null}
                    </td>
                    <td className="hidden py-2 pr-3 font-mono text-[11px] text-slate-500 lg:table-cell">
                      {row.ip ?? "—"}
                    </td>
                    <td className="hidden py-2 text-xs text-slate-500 md:table-cell">
                      {[
                        form === "lead"
                          ? tradeDetailLabel(row)
                          : row.variant
                            ? VARIANT_LABELS[row.variant] ?? row.variant
                            : null,
                        row.guestMode ? "Invité" : null,
                        row.utmContent ? `pub ${row.utmContent}` : null,
                        row.utmCampaign ? row.utmCampaign : null,
                        row.utmTerm ? `mot-clé « ${row.utmTerm} »` : null,
                        row.device ? DEVICE_LABELS[row.device] ?? row.device : null,
                        row.adsClick ? "clic Ads" : null,
                        row.gaSent ? "GA" : null,
                        row.internal ? "Toi (admin)" : null,
                        row.otherWork
                          ? `« ${row.otherWork.slice(0, 80)}${row.otherWork.length > 80 ? "…" : ""} »`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function AdminParcoursFormulairesPage() {
  const [days, setDays] = useState<RangeDays>(30);
  const [tab, setTab] = useState<FormTab>("lead");
  const [report, setReport] = useState<FormFunnelReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideMine, setHideMine] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ days: String(days) });
    if (hideMine) qs.set("excludeInternal", "1");
    const res = await fetch(`/api/admin/form-funnel?${qs.toString()}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Chargement impossible.");
      return;
    }
    setReport(data as FormFunnelReport);
  }, [days, hideMine]);

  useEffect(() => {
    void load();
  }, [load]);

  const side = tab === "lead" ? report?.lead : report?.pro;

  return (
    <div>
      <p className="text-sm text-slate-600">
        Entonnoir des balises analytics : où les gens s&apos;arrêtent dans le
        formulaire de demande, et dans l&apos;inscription artisan. Pas de nom,
        e-mail, téléphone ni adresse postale. L&apos;IP est conservée 90 jours
        (sécurité / diagnostic, admin seulement). Les textes « Autre » /
        description aussi. Si tu es connecté à l&apos;admin dans le même
        navigateur, tes tests sont marqués <strong>Toi</strong>.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {([7, 30, 90] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              days === d
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {d} jours
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-white"
        >
          Actualiser
        </button>
        <label className="ml-1 inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={hideMine}
            onChange={(e) => setHideMine(e.target.checked)}
            className="rounded border-slate-300"
          />
          Masquer mes tests
          {report &&
          (report.internalLeadSessions > 0 || report.internalProSessions > 0)
            ? ` (${tab === "lead" ? report.internalLeadSessions : report.internalProSessions})`
            : ""}
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("lead")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "lead"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 ring-1 ring-slate-200"
          }`}
        >
          Demandes particuliers
          {report ? ` (${report.lead.sessions})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setTab("pro")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "pro"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 ring-1 ring-slate-200"
          }`}
        >
          Inscription artisans
          {report ? ` (${report.pro.sessions})` : ""}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && !report ? (
        <p className="mt-8 text-sm text-slate-500">Chargement du parcours…</p>
      ) : side && report && report.totalEvents === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Aucun parcours enregistré pour l&apos;instant. Dès qu&apos;un visiteur ouvre le
          formulaire, les étapes apparaissent ici (même sans cookies Google).
        </p>
      ) : side ? (
        <div className="mt-6">
          {loading && (
            <p className="mb-3 text-xs text-slate-400">Mise à jour…</p>
          )}
          <SidePanel side={side} form={tab} />
        </div>
      ) : null}
    </div>
  );
}
