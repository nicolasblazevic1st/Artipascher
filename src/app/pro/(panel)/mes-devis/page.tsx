import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice } from "@/lib/data";
import { getProSession } from "@/lib/pro-auth";
import { getProQuotesForPro } from "@/lib/store";

export const metadata: Metadata = {
  title: "Mes devis",
};

const STATUS_LABELS = {
  pending_moderation: { text: "En modération", className: "bg-amber-100 text-amber-700" },
  approved: { text: "Publié", className: "bg-emerald-100 text-emerald-700" },
  rejected: { text: "Refusé", className: "bg-red-100 text-red-700" },
};

export default async function ProMesDevisPage() {
  const session = await getProSession();
  if (!session) return null;

  const quotes = await getProQuotesForPro(session.proId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Mes devis</h1>
      <p className="mt-1 text-sm text-slate-600">
        Devis déposés après visite sur chantier — base de la modération Artipascher.
      </p>

      {quotes.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-600">
            Aucun devis déposé. Débloquez le contact d&apos;une enchère, visitez le chantier,
            puis déposez votre devis depuis la fiche enchère.
          </p>
          <Link
            href="/pro/encheres"
            className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Parcourir les enchères
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {quotes.map((q) => (
            <li key={q.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_LABELS[q.status].className}`}
                  >
                    {STATUS_LABELS[q.status].text}
                  </span>
                  <p className="mt-2 text-xs text-slate-500">
                    Visite le {new Date(q.visitDate).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <p className="text-xl font-bold text-brand-700">{formatPrice(q.amount)}</p>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{q.description}</p>
              {q.adminNote && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {q.adminNote}
                </p>
              )}
              <Link
                href={`/encheres/${q.auctionId}#devis`}
                className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Voir le chantier →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
