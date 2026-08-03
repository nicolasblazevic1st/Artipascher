import Link from "next/link";
import { notFound } from "next/navigation";
import SelectArtisanPanel from "@/components/client/SelectArtisanPanel";
import ShareAuctionPanel from "@/components/client/ShareAuctionPanel";
import PreviousQuotePanel from "@/components/PreviousQuotePanel";
import { formatPublicLocation, formatWorkRequestAddress } from "@/lib/client-address";
import { formatAuctionDurationDays } from "@/lib/auction-duration";
import { formatPrice } from "@/lib/data";
import { getClientSession } from "@/lib/client-auth";
import {
  ensureWorkRequestShareToken,
  getApprovedProQuotesForAuction,
  getBidsForAuction,
  getWorkRequestForClient,
  mapBidsWithQualification,
  mapQuotesWithQualification,
} from "@/lib/store";

type Props = { params: Promise<{ id: string }> };

const STATUS_LABELS = {
  pending: "En validation par notre équipe",
  approved: "Enchère active",
  rejected: "Demande refusée",
};

export default async function ClientDemandeDetailPage({ params }: Props) {
  const session = await getClientSession();
  if (!session) return null;

  const { id } = await params;
  const request = await getWorkRequestForClient(id, session.clientId);
  if (!request) notFound();

  const bids = request.auctionId ? await getBidsForAuction(request.auctionId) : [];
  const quotes = request.auctionId
    ? await getApprovedProQuotesForAuction(request.auctionId)
    : [];
  const bidsWithLevel = await mapBidsWithQualification(bids);
  const quotesWithLevel = await mapQuotesWithQualification(quotes);
  const canSelect =
    request.status === "approved" && !request.selectedQuoteId && !request.selectedBidId;
  const shareToken =
    request.status === "approved"
      ? await ensureWorkRequestShareToken(id, session.clientId)
      : null;

  return (
    <div>
      <Link
        href="/particulier/espace/demandes"
        className="text-sm font-medium text-client-600"
      >
        ← Mes demandes
      </Link>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {request.category} · {request.city}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {formatPublicLocation(request)} · {STATUS_LABELS[request.status]}
            </p>
          </div>
          {request.auctionId && request.status === "approved" && (
            <p className="text-xs text-slate-500">Enchère active</p>
          )}
        </div>

        {shareToken && (
          <div className="mt-6">
            <ShareAuctionPanel
              shareToken={shareToken}
              category={request.category}
              city={request.city}
              department={request.department}
              startPrice={request.startPrice}
            />
          </div>
        )}

        <p className="mt-6 leading-relaxed text-slate-600">{request.description}</p>

        <p className="mt-4 text-sm text-slate-600">
          <span className="font-medium text-slate-800">Adresse du chantier :</span>{" "}
          {formatWorkRequestAddress(request)}
        </p>

        {(request.photos?.length ?? 0) > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {request.photos.map((photo) => (
              <img
                key={photo}
                src={photo}
                alt="Photo projet"
                className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
              />
            ))}
          </div>
        )}

        {request.previousQuoteAmount != null && request.previousQuoteProofUrl && (
          <div className="mt-6">
            <PreviousQuotePanel
              amount={request.previousQuoteAmount}
              proofUrl={request.previousQuoteProofUrl}
              note={request.previousQuoteNote}
            />
          </div>
        )}

        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs text-slate-500">Prix de départ</dt>
            <dd className="mt-1 text-xl font-semibold">
              {request.startPrice != null
                ? formatPrice(request.startPrice)
                : "En attente du 1er devis"}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs text-slate-500">Durée enchère</dt>
            <dd className="mt-1 text-sm font-semibold">
              {formatAuctionDurationDays(request.auctionDurationDays ?? 30)}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs text-slate-500">Devis validés</dt>
            <dd className="mt-1 text-xl font-semibold">{quotes.length}</dd>
          </div>
        </dl>

        {request.auctionEndsAt && (
          <p className="mt-4 text-sm text-slate-600">
            Fin de l&apos;enchère :{" "}
            <strong>{new Date(request.auctionEndsAt).toLocaleString("fr-FR")}</strong>
          </p>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">Devis des artisans</h2>
          <p className="mt-1 text-sm text-slate-500">
            Devis formalisés après visite sur site, validés par Artipascher.
          </p>
          <div className="mt-4">
            <SelectArtisanPanel
              requestId={request.id}
              quotes={quotesWithLevel.map((q) => ({
                id: q.id,
                companyName: q.companyName,
                amount: q.amount,
                description: q.description,
                visitDate: q.visitDate,
                qualificationLevel: q.qualificationLevel,
              }))}
              bids={bidsWithLevel.map((b) => ({
                id: b.id,
                companyName: b.companyName,
                amount: b.amount,
                qualificationLevel: b.qualificationLevel,
              }))}
              selectedQuoteId={request.selectedQuoteId}
              selectedBidId={request.selectedBidId}
              canSelect={canSelect}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
