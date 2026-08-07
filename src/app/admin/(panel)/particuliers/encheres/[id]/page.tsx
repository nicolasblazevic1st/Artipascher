import Link from "next/link";
import { notFound } from "next/navigation";
import NearbyBusinessesPanel from "@/components/admin/NearbyBusinessesPanel";
import ProjectPhotos from "@/components/ProjectPhotos";
import TestBanner from "@/components/TestBanner";
import { formatWorkRequestAddress } from "@/lib/client-address";
import { formatPrice } from "@/lib/data";
import { formatNafList } from "@/lib/naf-trade-groups";
import {
  getApprovedProQuotesForAuction,
  getBidsForAuction,
  getWorkRequestById,
} from "@/lib/store";
import { getAdminAuctionView } from "@/lib/work-request-auctions";

type Props = { params: Promise<{ id: string }> };

export default async function AdminEnchereDetailPage({ params }: Props) {
  const { id } = await params;
  const auction = await getAdminAuctionView(id);
  if (!auction) notFound();

  const [bids, quotes] = await Promise.all([
    getBidsForAuction(id),
    getApprovedProQuotesForAuction(id),
  ]);

  const workRequest = auction.workRequestId
    ? await getWorkRequestById(auction.workRequestId)
    : null;

  const endsLabel = auction.endsAt
    ? new Date(auction.endsAt).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div>
      <Link
        href="/admin/particuliers/encheres"
        className="text-sm font-medium text-brand-700 hover:underline"
      >
        ← Retour aux enchères
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
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
              {auction.source === "workRequest" ? "Site public" : "Catalogue démo"}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{auction.title}</h1>
          <p className="mt-1 text-sm text-slate-500">Fin de l&apos;enchère : {endsLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Prix actuel</p>
          <p className="text-2xl font-bold text-brand-700">
            {auction.currentPrice != null
              ? formatPrice(auction.currentPrice)
              : auction.startPrice != null
                ? formatPrice(auction.startPrice)
                : "—"}
          </p>
          {auction.startPrice != null && (
            <p className="text-xs text-slate-400">
              Départ {formatPrice(auction.startPrice)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Chantier</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {auction.description}
          </p>
          <ProjectPhotos photos={workRequest?.photos ?? []} showPublicNote />
          {workRequest && (
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-400">Adresse</dt>
                <dd className="text-slate-700">{formatWorkRequestAddress(workRequest)}</dd>
              </div>
              {workRequest.requestedWorkStartDate && (
                <div>
                  <dt className="text-xs text-slate-400">Début souhaité</dt>
                  <dd className="text-slate-700">{workRequest.requestedWorkStartDate}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-slate-400">Id demande</dt>
                <dd className="font-mono text-xs text-slate-500">{workRequest.id}</dd>
              </div>
              {workRequest.nafCodes && workRequest.nafCodes.length > 0 && (
                <div>
                  <dt className="text-xs text-slate-400">NAF ciblés</dt>
                  <dd className="text-slate-700">
                    {formatNafList(workRequest.nafCodes, ", ")}
                  </dd>
                </div>
              )}
            </dl>
          )}
          {workRequest && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Artisans autour du chantier
              </h3>
              <NearbyBusinessesPanel
                requestId={workRequest.id}
                category={workRequest.category}
              />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Client</h2>
          {auction.source === "workRequest" ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-400">Nom</dt>
                <dd className="font-medium text-slate-800">{auction.clientName || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Email</dt>
                <dd>
                  {auction.clientEmail ? (
                    <a
                      href={`mailto:${auction.clientEmail}`}
                      className="text-brand-700 hover:underline"
                    >
                      {auction.clientEmail}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Téléphone</dt>
                <dd>
                  {auction.clientPhone ? (
                    <a
                      href={`tel:${auction.clientPhone}`}
                      className="text-brand-700 hover:underline"
                    >
                      {auction.clientPhone}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Enchère du catalogue démo — pas de client réel associé.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href={`/encheres/${auction.id}`}
              target="_blank"
              className="text-brand-700 hover:underline"
            >
              Page publique →
            </Link>
            {auction.shareToken && (
              <Link
                href={`/enchere/partage/${auction.shareToken}`}
                target="_blank"
                className="text-slate-600 hover:underline"
              >
                Lien de partage
              </Link>
            )}
            <Link
              href="/admin/particuliers/demandes"
              className="text-slate-600 hover:underline"
            >
              Demandes travaux
            </Link>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">
          Offres ({bids.length}) · {auction.feesCollected} € de frais
        </h2>
        {bids.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aucune offre pour le moment.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {[...bids]
              .sort((a, b) => a.amount - b.amount)
              .map((bid) => (
                <li
                  key={bid.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">{bid.companyName}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(bid.createdAt).toLocaleString("fr-FR")} · {bid.feeEur} €
                    </p>
                    {bid.ocrAmount != null && (
                      <p className="mt-0.5 text-xs text-emerald-700">
                        OCR devis : {formatPrice(bid.ocrAmount)}
                        {bid.ocrMatchedLabel ? ` (${bid.ocrMatchedLabel})` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {bid.devisProofUrl && (
                      <a
                        href={bid.devisProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-brand-700 underline"
                      >
                        Devis PDF
                      </a>
                    )}
                    <span className="text-lg font-bold text-brand-700">
                      {formatPrice(bid.amount)}
                    </span>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">
          Devis après visite validés ({quotes.length})
        </h2>
        {quotes.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aucun devis formalisé validé.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {quotes.map((quote) => (
              <li
                key={quote.id}
                className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{quote.companyName}</p>
                  <p className="font-bold text-brand-700">{formatPrice(quote.amount)}</p>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Visite : {quote.visitDate}
                </p>
                <p className="mt-2 line-clamp-3 text-slate-600">{quote.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
