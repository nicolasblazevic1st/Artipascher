"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatAuctionDurationDays } from "@/lib/auction-duration";
import type { WorkRequest } from "@/lib/store-types";

type EnrichedRequest = WorkRequest & {
  bidCount: number;
  lowestBid: number | null;
};

const STATUS_LABELS = {
  pending: { text: "En validation", className: "bg-amber-100 text-amber-800" },
  approved: { text: "Annonce active", className: "bg-client-100 text-client-800" },
  rejected: { text: "Refusée", className: "bg-red-100 text-red-800" },
};

export default function ClientDemandesPage() {
  const [requests, setRequests] = useState<EnrichedRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/client/demandes");
    const data = await res.json();
    setRequests(data.requests ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes demandes</h1>
          <p className="mt-1 text-sm text-slate-600">
            Suivez vos projets, les offres reçues et choisissez votre artisan.
          </p>
        </div>
        <Link
          href="/particulier/espace/demandes/nouvelle"
          className="rounded-lg bg-client-600 px-4 py-2 text-sm font-semibold text-white hover:bg-client-700"
        >
          Nouvelle demande
        </Link>
      </div>

      {loading ? (
        <p className="mt-8 text-slate-500">Chargement…</p>
      ) : requests.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
          Aucune demande.{" "}
          <Link
            href="/particulier/espace/demandes/nouvelle"
            className="font-medium text-client-600"
          >
            Créer votre première demande
          </Link>
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {requests.map((request) => {
            const status = request.selectedBidId
              ? { text: "Artisan choisi", className: "bg-client-100 text-client-800" }
              : STATUS_LABELS[request.status];

            return (
              <li
                key={request.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-slate-900">
                        {request.category} · {request.city} ({request.department})
                      </h2>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.text}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                      {request.description}
                    </p>
                    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
                      <div>
                        Durée de l&apos;annonce :{" "}
                        {formatAuctionDurationDays(request.auctionDurationDays ?? 30)}
                      </div>
                    </dl>
                    {request.auctionEndsAt && (
                      <p className="mt-2 text-xs text-slate-400">
                        Fin d&apos;annonce :{" "}
                        {new Date(request.auctionEndsAt).toLocaleString("fr-FR")}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/particulier/espace/demandes/${request.id}`}
                    className="rounded-lg border border-client-200 px-4 py-2 text-sm font-medium text-client-700 hover:bg-client-50"
                  >
                    Gérer
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
