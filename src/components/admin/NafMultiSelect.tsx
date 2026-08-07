"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatNafWithLabel, getNafLabel } from "@/lib/naf-trade-groups";

export interface NafFilterOption {
  naf: string;
  label?: string;
  count: number;
  mapped?: boolean;
}

interface Props {
  options: NafFilterOption[];
  value: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
}

export default function NafMultiSelect({
  options,
  value,
  onChange,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const { mapped, unmapped } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? options
      : options.filter(
          (o) =>
            o.naf.toLowerCase().includes(q) ||
            getNafLabel(o.naf).toLowerCase().includes(q)
        );
    return {
      mapped: filtered.filter((o) => o.mapped),
      unmapped: filtered.filter((o) => !o.mapped),
    };
  }, [options, query]);

  const totalFiltered = mapped.length + unmapped.length;

  const buttonLabel =
    value.length === 0
      ? "NAF tous"
      : value.length === 1
        ? formatNafWithLabel(value[0])
        : `${value.length} NAF sélectionnés`;

  function toggle(code: string) {
    if (value.includes(code)) {
      onChange(value.filter((c) => c !== code));
    } else {
      onChange([...value, code]);
    }
  }

  function selectVisible() {
    const visible = [...mapped, ...unmapped].map((o) => o.naf);
    onChange([...new Set([...value, ...visible])]);
  }

  function renderOption(opt: NafFilterOption) {
    const checked = value.includes(opt.naf);
    return (
      <li key={opt.naf}>
        <label className="flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-slate-50">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggle(opt.naf)}
            className="mt-0.5 shrink-0"
          />
          <span className="min-w-0 flex-1">
            <span className="block leading-snug text-slate-900">
              <span className="font-medium">{opt.naf}</span>
              <span className="text-slate-600"> ({getNafLabel(opt.naf)})</span>
            </span>
            <span className="text-xs text-slate-500">
              {opt.count.toLocaleString("fr-FR")} établ.
              {opt.mapped === false && " · hors catégorie plateforme"}
            </span>
          </span>
        </label>
      </li>
    );
  }

  return (
    <div ref={rootRef} className="relative min-w-[12rem]">
      <button
        type="button"
        disabled={disabled || options.length === 0}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-w-[12rem] max-w-[18rem] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        title={
          value.length > 0 ? value.map(formatNafWithLabel).join("\n") : undefined
        }
      >
        <span className="truncate">{buttonLabel}</span>
        <span className="ml-auto shrink-0 text-slate-400">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1 w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 bg-slate-50 p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un code ou un métier…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-xs">
            <span className="text-slate-600">
              {value.length > 0
                ? `${value.length} sélectionné${value.length > 1 ? "s" : ""}`
                : "Filtrer par activité (principal ou secondaire)"}
            </span>
            <div className="flex gap-2">
              {totalFiltered > 0 && (
                <button
                  type="button"
                  onClick={selectVisible}
                  className="font-medium text-slate-700 hover:underline"
                >
                  Tout cocher (liste)
                </button>
              )}
              {value.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="font-medium text-brand-700 hover:underline"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>

          <ul className="max-h-72 overflow-auto py-1">
            {mapped.length > 0 && (
              <>
                <li className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Catégories plateforme
                </li>
                {mapped.map(renderOption)}
              </>
            )}
            {unmapped.length > 0 && (
              <>
                <li className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Autres NAF acquisition
                </li>
                {unmapped.map(renderOption)}
              </>
            )}
            {totalFiltered === 0 && (
              <li className="px-3 py-6 text-center text-sm text-slate-500">
                Aucun NAF correspondant
              </li>
            )}
          </ul>

          <div className="border-t border-slate-100 px-3 py-2 text-right">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
