"use client";

import { useMemo } from "react";
import HelpTooltip from "@/components/HelpTooltip";
import {
  QUALIFICATION_TIERS,
  getMinimumLevelForCategory,
  type QualificationLevel,
} from "@/lib/qualification-tiers";

const LEVEL_STYLES: Record<
  QualificationLevel,
  { ring: string; badge: string; header: string }
> = {
  1: {
    ring: "border-slate-200",
    badge: "bg-slate-100 text-slate-700",
    header: "bg-slate-50",
  },
  2: {
    ring: "border-blue-200",
    badge: "bg-blue-100 text-blue-800",
    header: "bg-blue-50",
  },
  3: {
    ring: "border-amber-200",
    badge: "bg-amber-100 text-amber-900",
    header: "bg-amber-50",
  },
};

interface Props {
  /** Catégorie travaux sélectionnée dans le formulaire (optionnel) */
  selectedCategory?: string;
}

export default function ClientQualificationGuide({ selectedCategory = "" }: Props) {
  const minLevel = useMemo(
    () => (selectedCategory ? getMinimumLevelForCategory(selectedCategory) : 1),
    [selectedCategory]
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">
        Documents vérifiés chez nos artisans
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Seules les entreprises qualifiées peuvent enchérir sur votre projet.
        Survolez ou cliquez sur le{" "}
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
          ?
        </span>{" "}
        pour comprendre l&apos;importance de chaque document.
      </p>

      {selectedCategory && (
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
          Pour <strong>{selectedCategory}</strong>, niveau minimum requis :{" "}
          <strong>Niveau {minLevel}</strong>
          {minLevel >= 2 && " (qualifications renforcées)"}.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {QUALIFICATION_TIERS.map((tier) => {
          const styles = LEVEL_STYLES[tier.level];
          const isRequired = tier.level >= minLevel && selectedCategory !== "";
          const isHighlighted = tier.level === minLevel && selectedCategory !== "";

          return (
            <details
              key={tier.level}
              open={tier.level === 1 || isHighlighted}
              className={`rounded-xl border ${styles.ring} overflow-hidden`}
            >
              <summary
                className={`cursor-pointer list-none px-4 py-3 ${styles.header} [&::-webkit-details-marker]:hidden`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles.badge}`}
                  >
                    {tier.badge}
                  </span>
                  <span className="text-sm font-medium text-slate-900">{tier.title}</span>
                  {isRequired && (
                    <span className="text-xs font-medium text-brand-700">
                      {isHighlighted ? "· requis pour votre projet" : "· inclus"}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">{tier.summary}</p>
              </summary>
              <ul className="divide-y divide-slate-100 border-t border-slate-100 bg-white px-4 py-2">
                {tier.documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-start gap-1 py-2.5 text-sm text-slate-700"
                  >
                    <span className="mt-0.5 text-emerald-600" aria-hidden>
                      ✓
                    </span>
                    <span>
                      {doc.label}
                      <HelpTooltip label={doc.label} content={doc.help} />
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}
