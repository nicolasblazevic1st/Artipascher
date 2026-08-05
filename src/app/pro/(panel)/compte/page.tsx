import type { Metadata } from "next";
import { getProSession } from "@/lib/pro-auth";
import ProCreditsPanel from "@/components/pro/ProCreditsPanel";
import ProReferralPanel from "@/components/pro/ProReferralPanel";
import ProDocumentsList from "@/components/ProDocumentsList";
import { DECENNALE_STATUS_LABELS } from "@/lib/decennale-verification";
import { CATEGORY_LABELS } from "@/lib/data";
import { formatProTradeSelections, getProTradeSelections } from "@/lib/pro-trades";
import {
  getContactUnlocksForPro,
  getProCreditBalance,
  getProDashboardStats,
  getProForSession,
} from "@/lib/store";
import { maskSiret } from "@/lib/professionals";

export const metadata: Metadata = {
  title: "Mon compte",
};

export default async function ProComptePage() {
  const session = await getProSession();
  if (!session) return null;

  const [pro, stats, unlocks, creditBalance] = await Promise.all([
    getProForSession(session),
    getProDashboardStats(session.proId),
    getContactUnlocksForPro(session.proId),
    getProCreditBalance(session.proId),
  ]);

  if (!pro) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Mon compte</h1>
      <p className="mt-1 text-sm text-slate-600">
        Informations de votre entreprise vérifiée au RCS · {creditBalance} crédit
        {creditBalance !== 1 ? "s" : ""} disponible{creditBalance !== 1 ? "s" : ""}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <ProCreditsPanel />
        </div>

        <div className="lg:col-span-2">
          <ProReferralPanel />
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Entreprise</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Raison sociale" value={pro.companyName} />
            <Row label="SIRET" value={maskSiret(pro.siret)} />
            <Row label="SIREN" value={pro.siren} />
            <Row label="Siège" value={`${pro.city} (${pro.department})`} />
            <Row
              label="Corps de métier"
              value={
                getProTradeSelections(pro)
                  .map((s) => s.tradeGroupLabel)
                  .join(" · ") || CATEGORY_LABELS[pro.category] || pro.category
              }
            />
            <Row label="Métiers Qualibat" value={formatProTradeSelections(pro)} />
            <Row
              label="Catégorie enchères (principale)"
              value={CATEGORY_LABELS[pro.category] ?? pro.category}
            />
            <Row label="Email" value={pro.email} />
            <Row label="Téléphone" value={pro.phone} />
          </dl>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            ✓ Compte approuvé · RCS vérifié
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Activité</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Offres placées" value={String(stats.totalBids)} />
            <Row label="Projets suivis" value={String(stats.auctionsParticipated)} />
            <Row label="Contacts débloqués" value={String(stats.contactUnlocks)} />
            <Row
              label="Frais d'enchères cumulés"
              value={`${stats.totalFeesEur.toFixed(2)} €`}
            />
            <Row
              label="Inscription"
              value={new Date(pro.createdAt).toLocaleDateString("fr-FR")}
            />
          </dl>
        </section>

        {(pro.documents?.length ?? 0) > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
            <h2 className="font-semibold text-slate-900">Documents transmis</h2>
            <p className="mt-1 text-sm text-slate-500">
              Fichiers déposés lors de votre inscription.
            </p>
            <div className="mt-4">
              <ProDocumentsList documents={pro.documents!} />
            </div>
          </section>
        )}

        {getProTradeSelections(pro).length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
            <h2 className="font-semibold text-slate-900">Décennale par corps de métier</h2>
            <p className="mt-1 text-sm text-slate-500">
              Vous ne pouvez enchérir sur un chantier que si la décennale correspondante
              a été validée pour ce métier.
            </p>
            <ul className="mt-4 space-y-3">
              {getProTradeSelections(pro).map((selection) => {
                const status = selection.decennaleStatus ?? "en_attente_verification";
                const meta = DECENNALE_STATUS_LABELS[status];
                return (
                  <li
                    key={selection.tradeGroupId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{selection.tradeGroupLabel}</p>
                      <p className="text-xs text-slate-500">{selection.qualibatJobLabel}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
                    >
                      {status === "validé" ? "Décennale vérifiée ✓" : meta.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      {unlocks.length > 0 && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Contacts débloqués</h2>
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {unlocks.map((unlock) => (
              <li
                key={unlock.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <span>Enchère #{unlock.auctionId}</span>
                <span className="text-slate-500">
                  {new Date(unlock.paidAt).toLocaleDateString("fr-FR")} ·{" "}
                  {unlock.amountEur.toFixed(2)} €
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-xs text-slate-500">
        Pour modifier vos informations, contactez l&apos;administrateur Artipascher.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-slate-50 pb-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
