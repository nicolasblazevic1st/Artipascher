import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ClientContactPublicCta from "@/components/ClientContactPublicCta";
import ContactSlotsBanner from "@/components/ContactSlotsBanner";
import ProjectPhotos from "@/components/ProjectPhotos";
import TestBanner from "@/components/TestBanner";
import PreviousQuotePanel from "@/components/PreviousQuotePanel";
import { shouldShowDemoBanner } from "@/lib/demo-banners";
import { formatPublicLocation } from "@/lib/client-address";
import { MAX_CONTACT_UNLOCKS_PER_REQUEST } from "@/lib/contact-slots";
import { formatRequestedWorkStartDate } from "@/lib/demandes-validation";
import {
  CATEGORY_LABELS,
  SAMPLE_AUCTIONS,
  formatLocation,
} from "@/lib/data";
import { countContactUnlocksForAuction } from "@/lib/store";
import { getWorkRequestByAuctionId, resolveAuction } from "@/lib/work-request-auctions";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const resolved = await resolveAuction(id);
  if (!resolved) return { title: "Chantier introuvable" };
  return {
    title: `${resolved.title} — ${resolved.city}`,
  };
}

export default async function ChantierDetailPage({ params }: Props) {
  const { id } = await params;
  const resolved = await resolveAuction(id);

  if (!resolved) notFound();

  const workRequest = await getWorkRequestByAuctionId(id);
  const unlockCount = await countContactUnlocksForAuction(id);
  const sample = SAMPLE_AUCTIONS.find((a) => a.id === id);
  const workCategory =
    workRequest?.category ??
    (sample ? CATEGORY_LABELS[sample.category] : resolved.title);

  const isTest = resolved.isTest === true || workRequest?.isTest === true;
  const showDemoBanner = await shouldShowDemoBanner();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Link href="/encheres" className="text-sm font-medium text-brand-700">
        ← Retour aux chantiers
      </Link>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {workCategory}
              </span>
              {isTest && showDemoBanner && <TestBanner />}
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
            {resolved.status === "active" ? "Ouvert aux contacts" : "Clôturé"}
          </span>
        </div>

        <p className="mt-6 leading-relaxed text-slate-600">{resolved.description}</p>

        <ProjectPhotos
          photos={workRequest?.photos ?? []}
          showPublicNote
        />

        <ContactSlotsBanner
          accepted={unlockCount}
          max={MAX_CONTACT_UNLOCKS_PER_REQUEST}
          className="mt-5"
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

        {workRequest?.requestedWorkStartDate && (
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-amber-50 p-4 text-center">
              <dt className="text-xs text-amber-700">Début travaux souhaité</dt>
              <dd className="mt-1 text-sm font-semibold text-amber-900">
                {formatRequestedWorkStartDate(workRequest.requestedWorkStartDate)}
              </dd>
            </div>
          </dl>
        )}

        <ClientContactPublicCta
          auctionId={id}
          publicLocation={
            workRequest
              ? formatPublicLocation(workRequest)
              : formatLocation(resolved.city, resolved.department)
          }
          requestedWorkStartDate={workRequest?.requestedWorkStartDate}
        />

        <p className="mt-8 text-center text-xs text-slate-500">
          Jusqu’à 5 artisans correspondant aux attentes du client · Déblocage des
          coordonnées avec des crédits · Artisans RCS
        </p>
      </div>
    </div>
  );
}
