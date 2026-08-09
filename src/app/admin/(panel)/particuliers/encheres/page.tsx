import Link from "next/link";
import TestBanner from "@/components/TestBanner";
import { formatLocation } from "@/lib/data";
import { listAdminAuctionViews } from "@/lib/work-request-auctions";

export default async function AdminOffresPage() {
  const auctions = await listAdminAuctionViews();
  const fromSite = auctions.filter((a) => a.source === "workRequest");
  const samples = auctions.filter((a) => a.source === "sample");
  const activeCount = fromSite.filter((a) => a.status === "active").length;

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Offres publiées</h2>
      <p className="mt-1 text-sm text-slate-600">
        Annonces publiées après validation admin — mise en contact jusqu&apos;à 5
        artisans · {activeCount} active{activeCount > 1 ? "s" : ""} ·{" "}
        {fromSite.length} au total
      </p>

      {fromSite.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
          Aucune offre issue du site pour le moment. Validez une demande dans{" "}
          <Link href="/admin/particuliers/demandes" className="text-brand-700 underline">
            Demandes travaux
          </Link>{" "}
          pour en publier une.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {fromSite.map((auction) => (
            <li
              key={auction.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-brand-600">
                      {auction.categoryLabel}
                    </span>
                    {auction.isTest && <TestBanner />}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        auction.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {auction.status === "active" ? "Active" : "Terminée"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      Site public
                    </span>
                  </div>
                  <h3 className="mt-1 font-semibold text-slate-900">{auction.title}</h3>
                  <p className="text-sm text-slate-500">
                    {formatLocation(auction.city, auction.department)}
                    {auction.clientName ? ` · ${auction.clientName}` : ""}
                  </p>
                  {auction.clientEmail && (
                    <p className="mt-1 text-xs text-slate-400">
                      {auction.clientEmail}
                      {auction.clientPhone ? ` · ${auction.clientPhone}` : ""}
                    </p>
                  )}
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                    {auction.description}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-brand-700">
                    {auction.acceptedArtisansCount}/
                    {auction.maxAcceptedArtisans} contacts débloqués
                  </p>
                  {auction.endsAt && (
                    <p className="mt-1 text-xs text-slate-400">
                      Fin d&apos;annonce :{" "}
                      {new Date(auction.endsAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link
                  href={`/admin/particuliers/encheres/${auction.id}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  Consulter →
                </Link>
                {auction.workRequestId && (
                  <Link
                    href="/admin/particuliers/demandes"
                    className="text-slate-600 hover:underline"
                  >
                    Demande associée
                  </Link>
                )}
                <Link
                  href={`/encheres/${auction.id}`}
                  className="text-slate-600 hover:underline"
                  target="_blank"
                >
                  Voir sur le site public
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {samples.length > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer text-sm font-medium text-slate-600">
            Catalogue démo ({samples.length}) — hors demandes du site
          </summary>
          <ul className="mt-4 space-y-3">
            {samples.map((auction) => (
              <li
                key={auction.id}
                className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-800">{auction.title}</p>
                    <p className="text-sm text-slate-500">
                      {formatLocation(auction.city, auction.department)} · démo
                    </p>
                  </div>
                  <Link
                    href={`/admin/particuliers/encheres/${auction.id}`}
                    className="text-sm text-brand-700 hover:underline"
                  >
                    Consulter →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
