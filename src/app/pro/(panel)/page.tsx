import Link from "next/link";
import { getProSession } from "@/lib/pro-auth";
import { getEnrichedAuctions } from "@/lib/pro-dashboard";
import { CATEGORY_LABELS, formatLocation } from "@/lib/data";
import { getProDashboardStats, getProForSession, hasContactUnlock } from "@/lib/store";
import { UNLOCK_CREDITS_COST } from "@/lib/client-contacts";
import {
  MAX_CONTACT_UNLOCKS_PER_REQUEST,
  remainingAcceptSlots,
} from "@/lib/contact-slots";

export default async function ProDashboardPage() {
  const session = await getProSession();
  if (!session) return null;

  const [pro, stats, auctions] = await Promise.all([
    getProForSession(session),
    getProDashboardStats(session.proId),
    getEnrichedAuctions(session.proId),
  ]);

  const unlockFlags = await Promise.all(
    auctions.map((a) => hasContactUnlock(session.proId, a.id))
  );
  const available = auctions.filter((a, i) => {
    if (unlockFlags[i]) return false;
    const left = remainingAcceptSlots(
      a.acceptedArtisansCount ?? 0,
      a.maxAcceptedArtisans ?? MAX_CONTACT_UNLOCKS_PER_REQUEST
    );
    return left > 0;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
      <p className="mt-1 text-sm text-slate-600">
        Bienvenue, {pro?.companyName ?? session.companyName}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Offres ouvertes" value={auctions.length} href="/pro/encheres" />
        <StatCard
          label="Contacts débloqués"
          value={stats.contactUnlocks}
          href="/pro/contacts"
        />
        <StatCard
          label="Crédits / contact"
          value={UNLOCK_CREDITS_COST}
          href="/pro/compte#credits"
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Offres à contacter</h2>
            <Link href="/pro/encheres" className="text-sm text-brand-600">
              Voir tout →
            </Link>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Matching + {UNLOCK_CREDITS_COST} crédits pour débloquer les coordonnées
          </p>
          {available.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Aucune offre disponible pour le moment, ou toutes vos places
              pertinentes sont déjà prises / débloquées.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {available.slice(0, 4).map((a) => (
                <li key={a.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{a.title}</p>
                      <p className="text-slate-500">
                        {formatLocation(a.city, a.department)} ·{" "}
                        {CATEGORY_LABELS[a.category]}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/pro/encheres/${a.id}`}
                    className="mt-2 inline-block text-xs font-medium text-brand-600"
                  >
                    Débloquer le contact →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Comment ça marche</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
            <li>Parcourez les offres qui matchent votre métier et votre zone.</li>
            <li>
              Débloquez les coordonnées ({UNLOCK_CREDITS_COST} crédits) tant qu’il
              reste une place (max. 5 artisans).
            </li>
            <li>
              Contactez le client, visitez le chantier et envoyez votre devis
              directement (hors plateforme).
            </li>
          </ol>
          <Link
            href="/pro/compte#credits"
            className="mt-4 inline-block text-sm font-medium text-brand-600"
          >
            Recharger mes crédits →
          </Link>
        </section>
      </div>
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
  const inner = (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
  if (!href) return inner;
  return (
    <Link href={href} className="block transition hover:opacity-90">
      {inner}
    </Link>
  );
}
