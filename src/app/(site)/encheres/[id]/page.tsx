import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ApprovedQuotesList from "@/components/ApprovedQuotesList";
import BidPanel from "@/components/BidPanel";
import ClientContactPanel from "@/components/ClientContactPanel";
import ProjectPhotos from "@/components/ProjectPhotos";
import TestBanner from "@/components/TestBanner";
import VerifiedBidsList from "@/components/VerifiedBidsList";
import PreviousQuotePanel from "@/components/PreviousQuotePanel";
import { computeCurrentPrice } from "@/lib/auctions";
import { formatPublicLocation } from "@/lib/client-address";
import { formatRequestedWorkStartDate } from "@/lib/demandes-validation";
import {
  CATEGORY_LABELS,
  SAMPLE_AUCTIONS,
  formatLocation,
  formatPrice,
} from "@/lib/data";
import { getApprovedProQuotesForAuction, getBidsForAuction, mapBidsWithQualification, mapQuotesWithQualification } from "@/lib/store";
import { getWorkRequestByAuctionId, resolveAuction } from "@/lib/work-request-auctions";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const resolved = await resolveAuction(id);
  if (!resolved) return { title: "Enchère introuvable" };
  return {
    title: `${resolved.title} — ${resolved.city}`,
  };
}

export default async function EnchereDetailPage({ params }: Props) {
  const { id } = await params;
  const resolved = await resolveAuction(id);

  if (!resolved) notFound();

  const bids = await getBidsForAuction(id);
  const quotes = await getApprovedProQuotesForAuction(id);
  const workRequest = await getWorkRequestByAuctionId(id);
  const sample = SAMPLE_AUCTIONS.find((a) => a.id === id);
  const workCategory =
    workRequest?.category ??
    (sample ? CATEGORY_LABELS[sample.category] : resolved.title);
  const bidsWithLevel = await mapBidsWithQualification(bids, workCategory);
  const quotesWithLevel = await mapQuotesWithQualification(quotes, workCategory);
  const currentPrice = computeCurrentPrice(
    resolved.startPrice,
    bids.map((b) => b.amount)
  );

  const savings =
    resolved.startPrice != null && currentPrice != null
      ? resolved.startPrice - currentPrice
      : 0;
  const endsAt = resolved.endsAt
    ? new Date(resolved.endsAt).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const bidRows = bidsWithLevel.map((b, index) => ({
    id: b.id,
    label: `Artisan ${index + 1}`,
    amount: b.amount,
    createdAt: b.createdAt,
    qualificationLevel: b.qualificationLevel,
  }));

  const categoryLabel = workCategory;

  const isTest = resolved.isTest === true || workRequest?.isTest === true;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Link href="/encheres" className="text-sm font-medium text-brand-700">
        ← Retour aux enchères
      </Link>

      {isTest && <TestBanner className="mt-6" />}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {categoryLabel}
              </span>
              {isTest && <TestBanner compact />}
            </div>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              {resolved.title}
            </h1>
            <p className="mt-1 text-slate-500">
              {workRequest
                ? formatPublicLocation(workRequest)
                : formatLocation(resolved.city, resolved.department)}
            </p>
          </div>
          <span className="rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
            {resolved.status === "active" ? "Enchère active" : "Enchère terminée"}
          </span>
        </div>

        <p className="mt-6 leading-relaxed text-slate-600">{resolved.description}</p>

        <ProjectPhotos
          photos={workRequest?.photos ?? []}
          showPublicNote
        />

        {workRequest?.previousQuoteAmount != null && workRequest.previousQuoteProofUrl && (
          <div className="mt-6">
            <PreviousQuotePanel
              amount={workRequest.previousQuoteAmount}
              proofUrl={workRequest.previousQuoteProofUrl}
              note={workRequest.previousQuoteNote}
            />
          </div>
        )}

        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <dt className="text-xs text-slate-500">Prix de départ</dt>
            <dd className="mt-1 text-xl font-semibold">
              {resolved.startPrice != null
                ? formatPrice(resolved.startPrice)
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
            <dd className="mt-1 text-sm font-semibold">{endsAt}</dd>
          </div>
          {workRequest?.requestedWorkStartDate && (
            <div className="rounded-xl bg-amber-50 p-4 text-center sm:col-span-2 lg:col-span-1">
              <dt className="text-xs text-amber-700">Début travaux souhaité</dt>
              <dd className="mt-1 text-sm font-semibold text-amber-900">
                {formatRequestedWorkStartDate(workRequest.requestedWorkStartDate)}
              </dd>
            </div>
          )}
        </dl>

        {savings > 0 && (
          <p className="mt-4 text-center text-sm font-medium text-brand-600">
            Économie actuelle : {formatPrice(savings)} par rapport au prix de départ
          </p>
        )}

        <ClientContactPanel
          auctionId={id}
          publicLocation={
            workRequest
              ? formatPublicLocation(workRequest)
              : formatLocation(resolved.city, resolved.department)
          }
          requestedWorkStartDate={workRequest?.requestedWorkStartDate}
        />

        <BidPanel
          auctionId={id}
          startPrice={resolved.startPrice}
          initialCurrentPrice={currentPrice}
          initialBids={bidRows}
          requiresQuote={workRequest !== null}
        />

        {quotes.length > 0 && (
          <section className="mt-8">
            <ApprovedQuotesList quotes={quotesWithLevel.map((q) => ({
              id: q.id,
              amount: q.amount,
              description: q.description,
              visitDate: q.visitDate,
              qualificationLevel: q.qualificationLevel,
              decennaleVerifiedLabels: q.decennaleVerifiedLabels,
            }))} />
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">
            Offres indicatives en ligne
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Estimations avant visite — le devis formalisé après passage sur site prime.
          </p>
          <div className="mt-4">
            <VerifiedBidsList
              bids={bidsWithLevel.map((b) => ({
                id: b.id,
                amount: b.amount,
                qualificationLevel: b.qualificationLevel,
                decennaleVerifiedLabels: b.decennaleVerifiedLabels,
              }))}
            />
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-slate-500">
          Devis PDF OCR obligatoire à chaque enchère (montant TTC au centime près) · Artisans RCS
        </p>
      </div>
    </div>
  );
}
