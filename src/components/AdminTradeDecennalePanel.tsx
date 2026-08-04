"use client";

import { DECENNALE_STATUS_LABELS } from "@/lib/decennale-verification";
import type { ProTradeSelection } from "@/lib/store-types";

interface Props {
  selections: ProTradeSelection[];
}

export default function AdminTradeDecennalePanel({ selections }: Props) {
  if (selections.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Décennale par corps de métier (OCR)
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
              {selection.decennaleOcrHints?.rawSnippet && (
                <p className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">
                  OCR : {selection.decennaleOcrHints.rawSnippet}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
