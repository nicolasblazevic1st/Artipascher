import type { Metadata } from "next";
import ClientOffersPanel from "@/components/client/ClientOffersPanel";

export const metadata: Metadata = {
  title: "Mes offres",
};

export default function ClientOffresPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Mes offres</h1>
      <p className="mt-1 text-sm text-slate-600">
        Historique des propositions éventuellement liées à vos demandes. Les
        devis se concluent désormais directement avec les artisans qui vous
        contactent.
      </p>
      <ClientOffersPanel />
    </div>
  );
}
