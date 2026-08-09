import Link from "next/link";
import { formatPrice } from "@/lib/data";

interface Props {
  amount: number;
  proofUrl: string;
  note?: string;
  /** Affichage compact pour les grilles de stats */
  compact?: boolean;
}

function isPdf(url: string) {
  return url.toLowerCase().endsWith(".pdf");
}

export default function PreviousQuotePanel({ amount, proofUrl, note, compact = false }: Props) {
  if (compact) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-medium text-amber-800">Devis concurrent</p>
        <p className="mt-1 text-lg font-semibold text-amber-900">{formatPrice(amount)}</p>
        <Link
          href={proofUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs font-medium text-amber-800 underline"
        >
          Voir le justificatif
        </Link>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-amber-900">Devis précédent communiqué</h2>
      <p className="mt-1 text-sm text-amber-800">
        Le client indique avoir déjà reçu une offre à{" "}
        <strong>{formatPrice(amount)}</strong> d&apos;un autre artisan. Ce montant
        est fourni à titre indicatif pour contextualiser le projet.
      </p>
      {note && (
        <p className="mt-2 text-sm text-amber-900/80">
          <span className="font-medium">Précisions :</span> {note}
        </p>
      )}
      <div className="mt-3">
        <Link
          href={proofUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-amber-900 ring-1 ring-amber-200 hover:bg-amber-50"
        >
          {isPdf(proofUrl) ? "Ouvrir le PDF du devis" : "Voir la photo du devis"}
          <span aria-hidden>↗</span>
        </Link>
        {!isPdf(proofUrl) && (
          <img
            src={proofUrl}
            alt="Justificatif du devis précédent"
            className="mt-3 max-h-48 rounded-lg border border-amber-200 object-contain"
          />
        )}
      </div>
    </section>
  );
}
