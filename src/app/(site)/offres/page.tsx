import type { Metadata } from "next";
import { Suspense } from "react";
import PublicAuctionsBoard from "@/components/PublicAuctionsBoard";
import { shouldShowDemoBanner } from "@/lib/demo-banners";
import { listPublicAuctions } from "@/lib/work-request-auctions";

export const metadata: Metadata = {
  title: "Offres — Nord 59/62",
  description:
    "Consultez les offres de travaux ouvertes à la mise en relation dans le Nord-Pas-de-Calais.",
};

export default async function OffresPage() {
  const [auctions, showDemoBanner] = await Promise.all([
    listPublicAuctions(),
    shouldShowDemoBanner(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold text-slate-900">Offres de particuliers</h1>
      <p className="mt-2 text-slate-600">
        Demandes validées dans le Nord (59) et Pas-de-Calais (62) — jusqu’à 3
        artisans par offre
      </p>

      <Suspense
        fallback={
          <p className="mt-8 text-sm text-slate-500">Chargement des offres…</p>
        }
      >
        <PublicAuctionsBoard
          auctions={auctions}
          showDemoBanner={showDemoBanner}
        />
      </Suspense>
    </div>
  );
}
