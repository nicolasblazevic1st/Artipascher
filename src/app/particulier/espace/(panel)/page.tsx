import Link from "next/link";
import { getClientSession } from "@/lib/client-auth";
import { formatAuctionDurationDays } from "@/lib/auction-duration";
import { formatPrice } from "@/lib/data";
import { getClientDashboardStats } from "@/lib/store";

const STATUS_LABELS = {
  pending: { text: "En validation", className: "bg-amber-100 text-amber-800" },
  approved: { text: "Enchère active", className: "bg-client-100 text-client-800" },
  rejected: { text: "Refusée", className: "bg-red-100 text-red-800" },
};

export default async function ClientDashboardPage() {
  const session = await getClientSession();
  if (!session) return null;

  const stats = await getClientDashboardStats(session.clientId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
      <p className="mt-1 text-sm text-slate-600">
        Bienvenue, {session.firstName} {session.lastName}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Mes demandes" value={stats.totalRequests} href="/particulier/espace/demandes" />
        <StatCard label="En validation" value={stats.pending} />
        <StatCard label="Enchères en cours" value={stats.active} highlight={stats.active > 0} />
        <StatCard label="Artisan choisi" value={stats.chosen} />
      </div>

      <section className="mt-10 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Demandes récentes</h2>
          <Link href="/particulier/espace/demandes" className="text-sm text-client-600">
            Voir tout →
          </Link>
        </div>
        {stats.recentRequests.length === 0 ? (
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-500">Aucune demande pour le moment.</p>
            <Link
              href="/particulier#demande"
              className="mt-3 inline-block text-sm font-medium text-client-600"
            >
              Créer une demande →
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {stats.recentRequests.map((request) => {
              const status = request.selectedBidId
                ? { text: "Artisan choisi", className: "bg-client-100 text-client-800" }
                : STATUS_LABELS[request.status];

              return (
                <li key={request.id} className="rounded-lg bg-slate-50 p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {request.category} · {request.city}
                      </p>
                      <p className="mt-1 text-slate-500">
                        Budget {formatPrice(request.budget)} ·{" "}
                        {formatAuctionDurationDays(request.auctionDurationDays ?? 30)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                    >
                      {status.text}
                    </span>
                  </div>
                  <Link
                    href={`/particulier/espace/demandes/${request.id}`}
                    className="mt-2 inline-block text-xs font-medium text-client-600"
                  >
                    Gérer ma demande →
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href?: string;
  highlight?: boolean;
}) {
  const content = (
    <div
      className={`rounded-xl border bg-white p-5 ${
        highlight ? "border-client-300 ring-1 ring-client-200" : "border-slate-200"
      }`}
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
