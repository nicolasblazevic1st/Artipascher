"use client";

import { DECENNALE_STATUS_LABELS } from "@/lib/decennale-verification";
import type { DecennaleVerificationStatus, ProTradeSelection } from "@/lib/store-types";

interface Props {
  selections: ProTradeSelection[];
  onUpdateStatus: (
    tradeGroupId: string,
    status: Extract<DecennaleVerificationStatus, "validé" | "non_couvert">
  ) => void;
}

export default function AdminTradeDecennalePanel({ selections, onUpdateStatus }: Props) {
  if (selections.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Décennale par corps de métier
      </p>
      <p className="mt-1 text-xs text-slate-600">
        Vérifiez que l&apos;attestation couvre nommément chaque activité avant
        d&apos;autoriser l&apos;enchère sur ce métier.
      </p>
      <ul className="mt-3 space-y-3">
        {selections.map((selection) => {
          const status = selection.decennaleStatus ?? "en_attente_verification";
          const statusMeta = DECENNALE_STATUS_LABELS[status];
          return (
            <li
              key={selection.tradeGroupId}
              className="rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{selection.tradeGroupLabel}</p>
                  <p className="text-xs text-slate-500">{selection.qualibatJobLabel}</p>
                  <span
                    className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta.className}`}
                  >
                    {statusMeta.text}
                  </span>
                </div>
                {selection.decennaleDocument && (
                  <a
                    href={selection.decennaleDocument.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-brand-700 hover:underline"
                  >
                    Voir l&apos;attestation
                  </a>
                )}
              </div>
              {status === "en_attente_verification" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(selection.tradeGroupId, "validé")}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    Valider pour ce métier
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(selection.tradeGroupId, "non_couvert")}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Non couvert
                  </button>
                </div>
              )}
              {status !== "en_attente_verification" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateStatus(
                        selection.tradeGroupId,
                        status === "validé" ? "non_couvert" : "validé"
                      )
                    }
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {status === "validé" ? "Marquer non couvert" : "Marquer validée"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
