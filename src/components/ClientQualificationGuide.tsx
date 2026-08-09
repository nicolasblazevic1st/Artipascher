"use client";

import HelpTooltip from "@/components/HelpTooltip";
import { QUALIFICATION_TIERS } from "@/lib/qualification-tiers";

const LEVEL1 = QUALIFICATION_TIERS.find((t) => t.level === 1)!;

interface Props {
  /** Conservé pour compatibilité avec le formulaire (non utilisé pour des niveaux). */
  selectedCategory?: string;
}

export default function ClientQualificationGuide(_props: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">
        Documents vérifiés chez nos artisans
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Chaque artisan mis en relation a ses documents de base vérifiés. Survolez
        le{" "}
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
          ?
        </span>{" "}
        pour comprendre chaque contrôle.
      </p>

      <div className="mt-4 rounded-xl border border-slate-200">
        <div className="rounded-t-xl bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {LEVEL1.badge}
            </span>
            <span className="text-sm font-medium text-slate-900">
              Documents obligatoires
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{LEVEL1.summary}</p>
        </div>
        <ul className="divide-y divide-slate-100 rounded-b-xl bg-white px-4 py-2">
          {LEVEL1.documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-start gap-1 py-2.5 text-sm text-slate-700"
            >
              <span className="mt-0.5 text-brand-600" aria-hidden>
                ✓
              </span>
              <span>
                {doc.label}
                <HelpTooltip label={doc.label} content={doc.help} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
