import Link from "next/link";
import { getProSession } from "@/lib/pro-auth";
import { getEnrichedAuctions } from "@/lib/pro-dashboard";
import { CATEGORY_LABELS, formatLocation, formatPrice } from "@/lib/data";
import { getProDashboardStats, getProForSession } from "@/lib/store";
import { BID_FEE_EUR } from "@/lib/auctions";

export default async function ProDashboardPage() {
  const session = await getProSession();
  if (!session) return null;

  const [pro, stats, auctions] = await Promise.all([
    getProForSession(session),
    getProDashboardStats(session.proId),
    getEnrichedAuctions(session.proId),
  ]);

  const winningCount = auctions.filter((a) => a.isWinning).length;
  const openAuctions = auctions.filter((a) => !a.myBestBid);
  const outbid = auctions.filter((a) => a.myBestBid && !a.isWinning);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
      <p className="mt-1 text-sm text-slate-600">
        Bienvenue, {pro?.companyName ?? session.companyName}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Enchères actives" value={auctions.length} href="/pro/encheres" />
        <StatCard label="Mes offres" value={stats.totalBids} href="/pro/mes-encheres" />
        <StatCard
          label="Meilleur prix actuel"
          value={winningCount}
          href="/pro/mes-encheres"
          highlight={winningCount > 0}
        />
        <StatCard label="Contacts débloqués" value={stats.contactUnlocks} />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Enchères à saisir</h2>
            <Link href="/pro/encheres" className="text-sm text-brand-600">
              Voir tout →
            </Link>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Projets actifs sans votre offre · {BID_FEE_EUR} € par enchère
          </p>
          {openAuctions.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Vous avez déjà enchéri sur toutes les enchères actives.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {openAuctions.slice(0, 4).map((a) => (
                <li key={a.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{a.title}</p>
                      <p className="text-slate-500">
                        {formatLocation(a.city, a.department)} ·{" "}
                        {CATEGORY_LABELS[a.category]}
                      </p>
                    </div>
                    <span className="shrink-0 font-bold text-brand-700">
                      {formatPrice(a.liveCurrentPrice)}
                    </span>
                  </div>
                  <Link
                    href={`/encheres/${a.id}`}
                    className="mt-2 inline-block text-xs font-medium text-brand-600"
                  >
                    Enchérir →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Offres à reprendre</h2>
            <Link href="/pro/mes-encheres" className="text-sm text-brand-600">
              Mes offres →
            </Link>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Enchères où vous avez été surenchéri
          </p>
          {outbid.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Aucune surenchère pour le moment.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {outbid.slice(0, 4).map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm"
                >
                  <p className="font-medium">{a.title}</p>
                  <p className="mt-1 text-slate-600">
                    Votre offre : {formatPrice(a.myBestBid!)} · Actuel :{" "}
                    <strong className="text-brand-700">
                      {formatPrice(a.liveCurrentPrice)}
                    </strong>
                  </p>
                  <Link
                    href={`/encheres/${a.id}`}
                    className="mt-2 inline-block text-xs font-medium text-brand-600"
                  >
                    Repositionner →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {stats.recentBids.length > 0 && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Dernières offres</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {stats.recentBids.map((bid) => {
              const auction = auctions.find((a) => a.id === bid.auctionId);
              return (
                <li
                  key={bid.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {auction?.title ?? `Enchère #${bid.auctionId}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(bid.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <span className="font-bold text-brand-700">
                    {formatPrice(bid.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
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
        highlight ? "border-emerald-300 ring-1 ring-emerald-200" : "border-slate-200"
      }`}
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
