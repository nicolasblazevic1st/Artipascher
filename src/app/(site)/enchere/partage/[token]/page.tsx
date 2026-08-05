import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ApprovedQuotesList from "@/components/ApprovedQuotesList";
import BidPanelPublicCta from "@/components/BidPanelPublicCta";
import ClientContactPanel from "@/components/ClientContactPanel";
import ProjectPhotos from "@/components/ProjectPhotos";
import VerifiedBidsList from "@/components/VerifiedBidsList";
import PreviousQuotePanel from "@/components/PreviousQuotePanel";
import { annotateAnonymousBids } from "@/lib/anonymize-artisan";
import { computeCurrentPrice } from "@/lib/auctions";
import { formatPublicLocation } from "@/lib/client-address";
import { formatPrice } from "@/lib/data";
import {
  buildShareText,
  absoluteUrl,
  getPublicShareUrl,
  isAuctionStillActive,
} from "@/lib/share";
import {
  getApprovedProQuotesForAuction,
  getBidsForAuction,
  mapBidsWithQualification,
  mapQuotesWithQualification,
} from "@/lib/store";
import { getWorkRequestByShareToken } from "@/lib/work-request-auctions";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const request = await getWorkRequestByShareToken(token);
  if (!request) return { title: "Enchère introuvable" };

  const title = `${request.category} · ${request.city} (${request.department})`;
  const description = buildShareText(request);
  const url = getPublicShareUrl(token);
  const image = request.photos?.[0] ? absoluteUrl(request.photos[0]) : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: "fr_FR",
      siteName: "Artipascher",
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

export default async function SharedAuctionPage({ params }: Props) {
  const { token } = await params;
  const request = await getWorkRequestByShareToken(token);
  if (!request?.auctionId) notFound();

  const bids = await getBidsForAuction(request.auctionId);
  const quotes = await getApprovedProQuotesForAuction(request.auctionId);
  const bidsWithLevel = await mapBidsWithQualification(bids, request.category);
  const quotesWithLevel = await mapQuotesWithQualification(quotes, request.category);
  const anonymousBids = annotateAnonymousBids(bidsWithLevel);
  const currentPrice = computeCurrentPrice(
    request.startPrice,
    bids.map((b) => b.amount)
  );
  const active = isAuctionStillActive(request.auctionEndsAt);
  const savings =
    request.startPrice != null && currentPrice != null
      ? request.startPrice - currentPrice
      : 0;

  const endsAt = request.auctionEndsAt
    ? new Date(request.auctionEndsAt).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Link href="/encheres" className="text-sm font-medium text-brand-700">
        ← Voir toutes les enchères
      </Link>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              {request.category}
            </span>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              Enchère inversée · {request.city}
            </h1>
            <p className="mt-1 text-slate-500">
              {formatPublicLocation(request)}
            </p>
          </div>
          <span
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              active ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {active ? "Enchère active" : "Enchère terminée"}
          </span>
        </div>

        <p className="mt-6 leading-relaxed text-slate-600">{request.description}</p>

        <ProjectPhotos photos={request.photos ?? []} showPublicNote />

        {request.previousQuoteAmount != null && request.previousQuoteProofUrl && (
          <div className="mt-6">
            <PreviousQuotePanel
              amount={request.previousQuoteAmount}
              proofUrl={request.previousQuoteProofUrl}
              note={request.previousQuoteNote}
            />
          </div>
        )}

        <dl className="mt-8 grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <dt className="text-xs text-slate-500">Prix de départ</dt>
            <dd className="mt-1 text-xl font-semibold">
              {request.startPrice != null
                ? formatPrice(request.startPrice)
                : "En attente du 1er devis"}
            </dd>
          </div>
          <div className="rounded-xl bg-brand-50 p-4 text-center">
            <dt className="text-xs text-brand-600">Prix actuel</dt>
            <dd className="mt-1 text-xl font-bold text-brand-700">
              {currentPrice != null ? formatPrice(currentPrice) : "—"}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <dt className="text-xs text-slate-500">Devis validés</dt>
            <dd className="mt-1 text-xl font-semibold">{quotes.length}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <dt className="text-xs text-slate-500">Fin</dt>
            <dd className="mt-1 text-sm font-semibold">{endsAt ?? "—"}</dd>
          </div>
        </dl>

        {savings > 0 && (
          <p className="mt-4 text-center text-sm font-medium text-brand-600">
            Économie actuelle : {formatPrice(savings)} par rapport au prix de départ
          </p>
        )}

        {active && (
          <>
            <ClientContactPanel
              auctionId={request.auctionId}
              publicLocation={formatPublicLocation(request)}
            />
            <BidPanelPublicCta
              auctionId={request.auctionId}
              startPrice={request.startPrice}
              currentPrice={currentPrice}
            />
          </>
        )}

        <section className="mt-8">
          <ApprovedQuotesList
            quotes={quotesWithLevel.map((q) => ({
              id: q.id,
              amount: q.amount,
              description: q.description,
              visitDate: q.visitDate,
              qualificationLevel: q.qualificationLevel,
              decennaleVerifiedLabels: q.decennaleVerifiedLabels,
            }))}
          />
        </section>

        {bids.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">
              Offres indicatives en ligne
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Estimations avant visite — le devis formalisé prime après passage sur site.
            </p>
            <div className="mt-4">
              <VerifiedBidsList
                bids={anonymousBids.map((b) => ({
                  id: b.id,
                  amount: b.amount,
                  qualificationLevel: b.qualificationLevel,
                  decennaleVerifiedLabels: b.decennaleVerifiedLabels,
                  anonymousArtisanIndex: b.anonymousArtisanIndex,
                  offerNumber: b.offerNumber,
                  anonymousLabel: b.anonymousLabel,
                }))}
              />
            </div>
          </section>
        )}

        <p className="mt-8 text-center text-xs text-slate-500">
          Artipascher · Enchères inversées travaux · Nord 59 / Pas-de-Calais 62
        </p>
      </div>
    </div>
  );
}
