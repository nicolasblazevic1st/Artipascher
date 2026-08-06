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
        Prix et devis des artisans pour vos chantiers. Vous pouvez saisir un prix
        sans justificatif depuis une demande, puis joindre le devis ici plus tard.
      </p>
      <ClientOffersPanel />
    </div>
  );
}
