import type { Metadata } from "next";
import AuctionCard from "@/components/AuctionCard";
import { listPublicAuctions } from "@/lib/work-request-auctions";

export const metadata: Metadata = {
  title: "Enchères actives — Nord 59/62",
  description: "Consultez les enchères inversées travaux actives dans les Hauts-de-France.",
};

export default async function EncheresPage() {
  const auctions = await listPublicAuctions();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold text-slate-900">Enchères actives</h1>
      <p className="mt-2 text-slate-600">
        Projets en cours dans le Nord (59) et Pas-de-Calais (62)
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {auctions.map((auction) => (
          <AuctionCard key={auction.id} auction={auction} />
        ))}
      </div>
    </div>
  );
}
