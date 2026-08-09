"use client";

import { useCallback, useEffect, useState } from "react";
import AdminImpersonateProButton from "@/components/admin/AdminImpersonateProButton";
import AdminQualificationLevelControl from "@/components/admin/AdminQualificationLevelControl";
import AdminLevel1Panel from "@/components/AdminLevel1Panel";
import AdminTradeDecennalePanel from "@/components/AdminTradeDecennalePanel";
import QualificationBadge from "@/components/QualificationBadge";
import ProDocumentsList from "@/components/ProDocumentsList";
import { CATEGORY_LABELS } from "@/lib/data";
import { formatProTradeSelections, getProTradeSelections } from "@/lib/pro-trades";
import type { QualificationLevel } from "@/lib/qualification-tiers";
import type { ProRegistration } from "@/lib/store-types";

const STATUS_LABELS = {
  pending: { text: "En attente", className: "bg-amber-100 text-amber-800" },
  approved: { text: "Certifié", className: "bg-emerald-100 text-emerald-800" },
  rejected: { text: "Non certifié / Refusé", className: "bg-red-100 text-red-800" },
};

export default function AdminProfessionnelsPage() {
  const [registrations, setRegistrations] = useState<ProRegistration[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("approved");
  const [loading, setLoading] = useState(true);

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

  const filtered = registrations.filter((r) =>
    filter === "all" ? true : r.status === filter
  );

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Certification niveau 1</h2>
      <p className="mt-1 text-sm text-slate-600">
        Changez simplement le niveau (1 / 2 / 3) puis enregistrez. Le niveau 0
        (blocage) reste une action séparée.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {(["approved", "rejected", "pending", "all"] as const).map((f) => (
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
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
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
                    {(r.status === "approved" || r.status === "rejected") && (
                      <QualificationBadge
                        level={r.status === "rejected" ? 0 : (r.qualificationLevel ?? 1)}
                        compact
                      />
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
                  <AdminLevel1Panel registration={r} />
                  <AdminTradeDecennalePanel selections={getProTradeSelections(r)} />
                  <p className="mt-2 text-xs text-slate-400">
                    Inscrit le {new Date(r.createdAt).toLocaleString("fr-FR")}
                  </p>
                  <div className="mt-3">
                    <AdminImpersonateProButton
                      proId={r.id}
                      companyName={r.companyName}
                    />
                  </div>
                </div>
                {r.status === "pending" && (
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-xs text-amber-700">Dossier legacy en attente</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleReview(r.id, "approved", 1)}
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
                {(r.status === "approved" || r.status === "rejected") && (
                  <AdminQualificationLevelControl
                    proId={r.id}
                    companyName={r.companyName}
                    status={r.status}
                    qualificationLevel={r.qualificationLevel}
                    onSaved={load}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
