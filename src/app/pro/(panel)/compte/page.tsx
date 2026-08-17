import type { Metadata } from "next";
import Link from "next/link";
import { getProSession } from "@/lib/pro-auth";
import ProCreditsPanel from "@/components/pro/ProCreditsPanel";
import ProReferralPanel from "@/components/pro/ProReferralPanel";
import ProDocumentsManager from "@/components/pro/ProDocumentsManager";
import { CATEGORY_LABELS } from "@/lib/data";
import { formatProTradeSelections, getProTradeSelections } from "@/lib/pro-trades";
import {
  getProCreditBalance,
  getProDashboardStats,
  getProForSession,
} from "@/lib/store";
import { formatUnlockPriceEur } from "@/lib/pricing-tiers";
import { maskSiret } from "@/lib/professionals";

export const metadata: Metadata = {
  title: "Mon compte",
};

export default async function ProComptePage() {
  const session = await getProSession();
  if (!session) return null;

  const [pro, stats, creditBalance] = await Promise.all([
    getProForSession(session),
    getProDashboardStats(session.proId),
    getProCreditBalance(session.proId),
  ]);

  if (!pro) return null;

  const tradeSelections = getProTradeSelections(pro);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Mon compte</h1>
      <p className="mt-1 text-sm text-slate-600">
        Informations de votre entreprise vérifiée au RCS · solde{" "}
        {formatUnlockPriceEur(creditBalance)}
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
                tradeSelections.map((s) => s.tradeGroupLabel).join(" · ") ||
                CATEGORY_LABELS[pro.category] ||
                pro.category
              }
            />
            <Row label="Métiers Qualibat" value={formatProTradeSelections(pro)} />
            <Row
              label="Catégorie principale"
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
            <Row label="Contacts débloqués" value={String(stats.contactUnlocks)} />
            <Row label="Projets suivis" value={String(stats.auctionsParticipated)} />
            <Row
              label="Crédits dépensés (historique)"
              value={`${stats.totalFeesEur.toFixed(2)} €`}
            />
            <Row
              label="Inscription"
              value={new Date(pro.createdAt).toLocaleDateString("fr-FR")}
            />
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Documents</h2>
          <p className="mt-1 text-sm text-slate-500">
            Documents regroupés par niveau de certification (1 = essentiel, 2 = qualifié,
            3 = premium en développement). Chaque nouveau fichier repasse en vérification.
          </p>
          <div className="mt-4">
            <ProDocumentsManager
              documents={pro.documents ?? []}
              tradeSelections={tradeSelections}
            />
          </div>
        </section>
      </div>

      {stats.contactUnlocks > 0 && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Contacts débloqués</h2>
          <p className="mt-2 text-sm text-slate-600">
            {stats.contactUnlocks} contact
            {stats.contactUnlocks > 1 ? "s" : ""} — consultez le détail (téléphone,
            email, adresse) dans le menu Contacts.
          </p>
          <Link
            href="/pro/contacts"
            className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Ouvrir Contacts →
          </Link>
        </section>
      )}

      <p className="mt-6 text-xs text-slate-500">
        Pour modifier les informations d&apos;entreprise (SIRET, siège…), contactez
        l&apos;administrateur Nord Artisan Pro.
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
