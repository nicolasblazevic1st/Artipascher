"use client";

import { useCallback, useEffect, useState } from "react";
import NearbyBusinessesPanel from "@/components/admin/NearbyBusinessesPanel";
import { formatAuctionDurationDays } from "@/lib/auction-duration";
import { formatPrice } from "@/lib/data";
import type { WorkRequest } from "@/lib/store-types";

const STATUS_LABELS = {
  pending: { text: "En attente", className: "bg-amber-100 text-amber-800" },
  approved: { text: "Enchère créée", className: "bg-emerald-100 text-emerald-800" },
  rejected: { text: "Refusée", className: "bg-red-100 text-red-800" },
};

export default function AdminDemandesPage() {
  const [requests, setRequests] = useState<WorkRequest[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/demandes");
    const data = await res.json();
    setRequests(data.requests ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReview(id: string, status: "approved" | "rejected") {
    await fetch("/api/admin/demandes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  const filtered = requests.filter((r) =>
    filter === "all" ? true : r.status === filter
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Demandes de travaux</h1>
      <p className="mt-1 text-sm text-slate-600">
        Validez les demandes particuliers pour créer une enchère inversée.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {f === "all" ? "Toutes" : STATUS_LABELS[f].text}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-slate-500">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
          Aucune demande dans cette catégorie.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {filtered.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">
                      {r.firstName} {r.lastName}
                    </h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABELS[r.status].className}`}
                    >
                      {STATUS_LABELS[r.status].text}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{r.description}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {r.description.length} caractères
                  </p>
                  {(r.photos?.length ?? 0) > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.photos.map((photo) => (
                        <a
                          key={photo}
                          href={photo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden rounded-lg border border-slate-200"
                        >
                          <img
                            src={photo}
                            alt="Photo projet"
                            className="h-16 w-16 object-cover hover:opacity-90"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
                    <div>{r.city} ({r.department})</div>
                    <div>{r.category}</div>
                    <div>Budget max : {formatPrice(r.budget)}</div>
                    <div>
                      Durée enchère :{" "}
                      {formatAuctionDurationDays(r.auctionDurationDays ?? 30)}
                    </div>
                    <div>{r.email}</div>
                  </dl>
                  {r.auctionEndsAt && (
                    <p className="mt-2 text-xs text-emerald-600">
                      Fin prévue :{" "}
                      {new Date(r.auctionEndsAt).toLocaleString("fr-FR")}
                    </p>
                  )}
                  {r.auctionId && (
                    <p className="mt-2 text-xs text-emerald-600">
                      Enchère : {r.auctionId}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    Reçue le {new Date(r.createdAt).toLocaleString("fr-FR")}
                  </p>
                  <NearbyBusinessesPanel requestId={r.id} />
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleReview(r.id, "approved")}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Créer l&apos;enchère
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview(r.id, "rejected")}
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Refuser
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
