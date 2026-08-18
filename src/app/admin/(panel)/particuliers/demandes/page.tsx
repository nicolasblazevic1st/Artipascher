"use client";

import { useCallback, useEffect, useState } from "react";
import NearbyBusinessesPanel from "@/components/admin/NearbyBusinessesPanel";
import PreviousQuotePanel from "@/components/PreviousQuotePanel";
import TestBanner from "@/components/TestBanner";
import { formatWorkRequestAddress } from "@/lib/client-address";
import { formatWorkRequestAuctionDuration } from "@/lib/auction-duration";
import { formatRequestedWorkStartDate } from "@/lib/demandes-validation";
import { formatNafList } from "@/lib/naf-trade-groups";
import type { WorkRequest } from "@/lib/store-types";

const STATUS_LABELS = {
  pending: { text: "En attente", className: "bg-amber-100 text-amber-800" },
  approved: { text: "Annonce publiée", className: "bg-emerald-100 text-emerald-800" },
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
      <h2 className="text-lg font-semibold text-slate-900">Demandes de travaux</h2>
      <p className="mt-1 text-sm text-slate-600">
        Validez les demandes pour publier une annonce de mise en contact — puis
        suivez-les dans l&apos;onglet Offres publiées.
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
                    {r.isTest && <TestBanner />}
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
                  {r.previousQuoteAmount != null && r.previousQuoteProofUrl && (
                    <div className="mt-4">
                      <PreviousQuotePanel
                        amount={r.previousQuoteAmount}
                        proofUrl={r.previousQuoteProofUrl}
                        note={r.previousQuoteNote}
                      />
                    </div>
                  )}
                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
                    <div>Adresse : {formatWorkRequestAddress(r)}</div>
                    {r.addressVerifiedAt && (
                      <div className="text-emerald-700">
                        Adresse vérifiée BAN · {new Date(r.addressVerifiedAt).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                    <div>
                      Début travaux souhaité :{" "}
                      {formatRequestedWorkStartDate(r.requestedWorkStartDate)}
                    </div>
                    <div>
                      {r.category}
                      {r.nafCodes && r.nafCodes.length > 0 && (
                        <span className="text-slate-400">
                          {" "}
                          · {formatNafList(r.nafCodes, ", ")}
                        </span>
                      )}
                    </div>
                    <div>
                      Durée annonce :{" "}
                      {formatWorkRequestAuctionDuration(r)}
                    </div>
                    <div>
                      Artisans max :{" "}
                      {typeof r.maxContactArtisans === "number"
                        ? r.maxContactArtisans
                        : 5}
                    </div>
                    <div>
                      Ancienneté :{" "}
                      {r.preferEstablishedCompany === true
                        ? "uniquement 5+"
                        : r.preferEstablishedCompany === false
                          ? "uniquement 0–5 ans"
                          : "âge non précisé"}
                    </div>
                    <div>
                      Note Google :{" "}
                      {r.minGoogleRating
                        ? `≥ ${String(r.minGoogleRating).replace(".", ",")}/5`
                        : "peu importe"}
                    </div>
                    <div>
                      Obligatoire : statut normal · décennale &amp; RC pro
                    </div>
                    <div>
                      Mise en contact : autorisée (CGU / CGV · max.{" "}
                      {typeof r.maxContactArtisans === "number"
                        ? r.maxContactArtisans
                        : 5}
                      )
                    </div>
                    <div>{r.email}</div>
                    <div>
                      Tél : {r.phone?.trim() || "Non renseigné"}
                      {r.phoneVerifiedAt ? " · vérifié SMS" : ""}
                    </div>
                  </dl>
                  {r.auctionEndsAt && (
                    <p className="mt-2 text-xs text-emerald-600">
                      Fin d&apos;annonce :{" "}
                      {new Date(r.auctionEndsAt).toLocaleString("fr-FR")}
                    </p>
                  )}
                  {r.auctionId && (
                    <p className="mt-2 text-xs text-emerald-600">
                      Annonce :{" "}
                      <a
                        href={`/admin/particuliers/encheres/${r.auctionId}`}
                        className="font-medium underline"
                      >
                        Consulter {r.auctionId}
                      </a>
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    Reçue le {new Date(r.createdAt).toLocaleString("fr-FR")}
                  </p>
                  <NearbyBusinessesPanel
                    requestId={r.id}
                    category={r.category}
                  />
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleReview(r.id, "approved")}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Publier l&apos;annonce
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
