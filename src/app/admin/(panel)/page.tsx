import Link from "next/link";
import { getAdminStats, readStore } from "@/lib/store";
import { VERIFIED_PROFESSIONALS } from "@/lib/professionals";
import { listAdminAuctionViews } from "@/lib/work-request-auctions";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();
  const store = await readStore();
  const recentPending = store.proRegistrations.filter((p) => p.status === "pending").slice(0, 3);
  const recentRequests = store.workRequests.filter((r) => r.status === "pending").slice(0, 3);
  const activePublicAuctions = (await listAdminAuctionViews()).filter(
    (a) => a.source === "workRequest" && a.status === "active"
  ).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
      <p className="mt-1 text-sm text-slate-600">
        Vue d&apos;ensemble — Artipascher Nord 59/62
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Inscriptions en attente"
          value={stats.pendingPros}
          href="/admin/artisans/certification"
          urgent={stats.pendingPros > 0}
        />
        <StatCard
          label="Demandes travaux en attente"
          value={stats.pendingRequests}
          href="/admin/particuliers/demandes"
          urgent={stats.pendingRequests > 0}
        />
        <StatCard
          label="Devis à modérer"
          value={stats.pendingQuotes}
          href="/admin/artisans/devis"
          urgent={stats.pendingQuotes > 0}
        />
        <StatCard
          label="Artisans approuvés"
          value={stats.approvedPros}
          href="/admin/artisans/comptes"
        />
        <StatCard
          label="Comptes particuliers"
          value={stats.totalClients}
          href="/admin/particuliers/comptes"
        />
        <StatCard
          label="Enchères actives (site)"
          value={activePublicAuctions}
          href="/admin/particuliers/encheres"
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Inscriptions artisans à valider</h2>
            <Link href="/admin/artisans/certification" className="text-sm text-brand-600">
              Voir tout →
            </Link>
          </div>
          {recentPending.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Aucune inscription en attente.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentPending.map((p) => (
                <li key={p.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-medium">{p.companyName}</p>
                  <p className="text-slate-500">
                    SIRET {p.siret} · {p.city} ({p.department})
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Demandes particuliers à valider</h2>
            <Link href="/admin/particuliers/demandes" className="text-sm text-brand-600">
              Voir tout →
            </Link>
          </div>
          {recentRequests.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Aucune demande en attente.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentRequests.map((r) => (
                <li key={r.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-medium">
                    {r.firstName} {r.lastName} — {r.city}
                  </p>
                  <p className="text-slate-500">
                    {r.category} ·{" "}
                    {r.startPrice != null
                      ? `Prix de départ ${r.startPrice} €`
                      : "Prix : en attente du 1er devis"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Artisans RCS vérifiés (catalogue démo)</h2>
        <p className="mt-1 text-sm text-slate-500">
          {VERIFIED_PROFESSIONALS.length} artisans actifs dans les enchères de démonstration
        </p>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  urgent,
}: {
  label: string;
  value: number;
  href?: string;
  urgent?: boolean;
}) {
  const content = (
    <div
      className={`rounded-xl border bg-white p-5 ${urgent ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200"}`}
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      {urgent && <p className="mt-1 text-xs font-medium text-amber-600">Action requise</p>}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
