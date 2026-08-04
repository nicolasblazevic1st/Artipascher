"use client";

import { useCallback, useEffect, useState } from "react";
import AdminLevel1Panel from "@/components/AdminLevel1Panel";
import AdminTradeDecennalePanel from "@/components/AdminTradeDecennalePanel";
import QualificationBadge from "@/components/QualificationBadge";
import ProDocumentsList from "@/components/ProDocumentsList";
import { CATEGORY_LABELS } from "@/lib/data";
import { formatProTradeSelections, getProTradeSelections } from "@/lib/pro-trades";
import type { QualificationLevel } from "@/lib/qualification-tiers";
import type {
  DecennaleVerificationStatus,
  DocumentVerificationStatus,
  ProRegistration,
} from "@/lib/store-types";

const STATUS_LABELS = {
  pending: { text: "En attente", className: "bg-amber-100 text-amber-800" },
  approved: { text: "Approuvé", className: "bg-emerald-100 text-emerald-800" },
  rejected: { text: "Refusé", className: "bg-red-100 text-red-800" },
};

export default function AdminProfessionnelsPage() {
  const [registrations, setRegistrations] = useState<ProRegistration[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);
  const [pendingLevels, setPendingLevels] = useState<Record<string, QualificationLevel>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/professionnels");
    const data = await res.json();
    setRegistrations(data.registrations ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReview(
    id: string,
    status: "approved" | "rejected",
    qualificationLevel?: QualificationLevel
  ) {
    await fetch("/api/admin/professionnels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, qualificationLevel }),
    });
    load();
  }

  async function handleLevelChange(id: string, qualificationLevel: QualificationLevel) {
    await fetch("/api/admin/professionnels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, qualificationLevel }),
    });
    load();
  }

  async function handleDecennaleStatus(
    id: string,
    tradeGroupId: string,
    decennaleStatus: Extract<DecennaleVerificationStatus, "validé" | "non_couvert">
  ) {
    await fetch("/api/admin/professionnels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, tradeGroupId, decennaleStatus }),
    });
    load();
  }

  async function handleDocumentStatus(
    id: string,
    documentId: string,
    documentStatus: Extract<DocumentVerificationStatus, "validé" | "rejeté">
  ) {
    await fetch("/api/admin/professionnels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, documentId, documentStatus }),
    });
    load();
  }

  async function handleCertifyLevel1(id: string) {
    await fetch("/api/admin/professionnels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, certifyLevel1: true }),
    });
    load();
  }

  const filtered = registrations.filter((r) =>
    filter === "all" ? true : r.status === filter
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Artisans — inscriptions RCS</h1>
      <p className="mt-1 text-sm text-slate-600">
        Certification niveau 1 : RCS et zone automatiques, OCR sur RC et décennale,
        validation rapide puis déblocage des contacts client.
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
            {f === "all" ? "Tous" : STATUS_LABELS[f].text}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-slate-500">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
          Aucune inscription dans cette catégorie.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {filtered.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{r.companyName}</h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABELS[r.status].className}`}
                    >
                      {STATUS_LABELS[r.status].text}
                    </span>
                    {r.rcsVerified && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        RCS vérifié
                      </span>
                    )}
                    {r.status === "approved" && (
                      <QualificationBadge level={r.qualificationLevel ?? 1} compact />
                    )}
                  </div>
                  <dl className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                    <div>SIRET : {r.siret}</div>
                    <div>SIREN : {r.siren}</div>
                    <div>Email : {r.email}</div>
                    <div>Tél : {r.phone}</div>
                    <div>
                      Siège : {r.city} ({r.department})
                    </div>
                    <div>
                      Corps de métier :{" "}
                      {getProTradeSelections(r)
                        .map((s) => s.tradeGroupLabel)
                        .join(" · ") || CATEGORY_LABELS[r.category]}
                    </div>
                    <div>Métiers Qualibat : {formatProTradeSelections(r)}</div>
                  </dl>
                  {(r.documents?.length ?? 0) > 0 && (
                    <div className="mt-4 max-w-lg">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Documents transmis
                      </p>
                      <ProDocumentsList documents={r.documents!} />
                    </div>
                  )}
                  <AdminLevel1Panel
                    registration={r}
                    onValidateDocument={(documentId, documentStatus) =>
                      handleDocumentStatus(r.id, documentId, documentStatus)
                    }
                    onCertifyLevel1={() => handleCertifyLevel1(r.id)}
                  />
                  <AdminTradeDecennalePanel
                    selections={getProTradeSelections(r)}
                    onUpdateStatus={(tradeGroupId, decennaleStatus) =>
                      handleDecennaleStatus(r.id, tradeGroupId, decennaleStatus)
                    }
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    Inscrit le {new Date(r.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                {r.status === "pending" && (
                  <div className="flex flex-col items-end gap-2">
                    <label className="text-xs text-slate-500">
                      Niveau affiché sur les enchères
                      <select
                        value={pendingLevels[r.id] ?? 1}
                        onChange={(e) =>
                          setPendingLevels((prev) => ({
                            ...prev,
                            [r.id]: Number(e.target.value) as QualificationLevel,
                          }))
                        }
                        className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        <option value={1}>1 — Certifié</option>
                        <option value={2}>2 — Qualifié</option>
                        <option value={3}>3 — Premium</option>
                      </select>
                    </label>
                    <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleReview(r.id, "approved", pendingLevels[r.id] ?? 1)
                      }
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Approuver
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview(r.id, "rejected")}
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Refuser
                    </button>
                    </div>
                  </div>
                )}
                {r.status === "approved" && (
                  <label className="text-xs text-slate-500">
                    Niveau enchères
                    <select
                      value={r.qualificationLevel ?? 1}
                      onChange={(e) =>
                        handleLevelChange(r.id, Number(e.target.value) as QualificationLevel)
                      }
                      className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    >
                      <option value={1}>1 — Certifié</option>
                      <option value={2}>2 — Qualifié</option>
                      <option value={3}>3 — Premium</option>
                    </select>
                  </label>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
