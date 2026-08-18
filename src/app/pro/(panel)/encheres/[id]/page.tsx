import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ClientContactPanel from "@/components/ClientContactPanel";
import ContactSlotsBanner from "@/components/ContactSlotsBanner";
import CoproprieteBanner from "@/components/CoproprieteBanner";
import OfferClientRequirements from "@/components/OfferClientRequirements";
import ProjectPhotos from "@/components/ProjectPhotos";
import TestBanner from "@/components/TestBanner";
import { formatPublicLocation } from "@/lib/client-address";
import { resolveMaxContactArtisans } from "@/lib/contact-slots";
import { formatLocation } from "@/lib/data";
import { shouldShowDemoBannerForProSession } from "@/lib/demo-banners";
import { getProSession } from "@/lib/pro-auth";
import { countContactUnlocksForAuction } from "@/lib/store";
import {
  getWorkRequestByAuctionId,
  resolveAuction,
} from "@/lib/work-request-auctions";
import { resolveUnlockPricing } from "@/lib/pricing-tiers";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const resolved = await resolveAuction(id);
  if (!resolved) return { title: "Chantier introuvable" };
  return { title: `Contact — ${resolved.title}` };
}

export default async function ProChantierDetailPage({ params }: Props) {
  const session = await getProSession();
  if (!session) return null;

  const { id } = await params;
  const resolved = await resolveAuction(id);
  if (!resolved) notFound();

  const workRequest = await getWorkRequestByAuctionId(id);
  const unlockCount = await countContactUnlocksForAuction(id);
  const showDemoBanner = shouldShowDemoBannerForProSession(session);
  const unlockPricing = resolveUnlockPricing({
    pricingTier: workRequest?.pricingTier,
    workOptionId: workRequest?.workOptionId,
  });

  return (
    <div>
      <Link href="/pro/encheres" className="text-sm font-medium text-brand-700">
        ← Retour aux chantiers
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{resolved.title}</h1>
            {resolved.isTest && showDemoBanner && <TestBanner />}
            {(resolved.isCopropriete ||
              workRequest?.clientKind === "copropriete") && (
              <CoproprieteBanner
                workScope={workRequest?.workScope ?? resolved.workScope}
              />
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {workRequest
              ? formatPublicLocation(workRequest)
              : formatLocation(resolved.city, resolved.department)}
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
          Mise en relation
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        {resolved.description}
      </p>

      <ProjectPhotos photos={workRequest?.photos ?? []} showPublicNote />

      <ContactSlotsBanner
        accepted={unlockCount}
        max={resolveMaxContactArtisans(workRequest)}
        className="mt-4"
      />

      {workRequest && (
        <OfferClientRequirements request={workRequest} className="mt-4" />
      )}

      <ClientContactPanel
        auctionId={id}
        publicLocation={
          workRequest
            ? formatPublicLocation(workRequest)
            : formatLocation(resolved.city, resolved.department)
        }
        requestedWorkStartDate={workRequest?.requestedWorkStartDate}
        unlockPriceEur={unlockPricing.unlockPriceEur}
      />

      <p className="mt-4 text-center text-xs text-slate-500">
        <Link href={`/encheres/${id}`} className="text-brand-700 underline">
          Voir la page publique
        </Link>
      </p>
    </div>
  );
}
