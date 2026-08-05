import type { Metadata } from "next";
import PublicAuctionsBoard from "@/components/PublicAuctionsBoard";
import { listPublicAuctions } from "@/lib/work-request-auctions";

export const metadata: Metadata = {
  title: "Enchères actives — Nord 59/62",
  description: "Consultez les enchères inversées travaux actives dans le Nord-Pas-de-Calais.",
};

export default async function EncheresPage() {
  const auctions = await listPublicAuctions();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold text-slate-900">Enchères actives</h1>
      <p className="mt-2 text-slate-600">
        Projets en cours dans le Nord (59) et Pas-de-Calais (62)
      </p>

      <PublicAuctionsBoard auctions={auctions} />
    </div>
  );
}
