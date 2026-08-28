"use client";

import { useEffect, useRef, useState } from "react";
import type { SelectedBanAddress } from "@/components/BanAddressAutocomplete";

interface BanCitySuggestion {
  id: string;
  label: string;
  city: string;
  postcode: string;
}

interface Props {
  inputClass: string;
  onSelect: (city: SelectedBanAddress | null) => void;
  required?: boolean;
  initialSelected?: SelectedBanAddress | null;
}

export default function BanCityAutocomplete({
  inputClass,
  onSelect,
  required = true,
  initialSelected = null,
}: Props) {
  const [query, setQuery] = useState(initialSelected?.city ?? "");
  const [suggestions, setSuggestions] = useState<BanCitySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(
    initialSelected
      ? `${initialSelected.city} (${initialSelected.postalCode})`
      : null
  );
  const [verified, setVerified] = useState(Boolean(initialSelected));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialSelected?.banAddressId) return;
    const label = `${initialSelected.city} (${initialSelected.postalCode})`;
    setQuery(initialSelected.city);
    setSelectedLabel(label);
    setVerified(true);
  }, [
    initialSelected?.banAddressId,
    initialSelected?.city,
    initialSelected?.postalCode,
  ]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedLabel || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/address/search?type=municipality&q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = (await res.json()) as {
            features?: Array<{
              id: string;
              label: string;
              city: string;
              postcode?: string;
              name?: string;
            }>;
          };
          setSuggestions(
            (data.features ?? []).map((f) => ({
              id: f.id,
              label: f.label,
              city: f.city || f.name || "",
              postcode: f.postcode || "",
            }))
          );
          setOpen(true);
        }
      } catch {
        /* aborted or network */
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, selectedLabel]);

  function pickSuggestion(item: BanCitySuggestion) {
    const label = `${item.city} (${item.postcode})`;
    setQuery(item.city);
    setSelectedLabel(label);
    setVerified(true);
    setOpen(false);
    setSuggestions([]);
    onSelect({
      addressLine: item.city,
      postalCode: item.postcode,
      city: item.city,
      banAddressId: item.id,
      label,
    });
  }

  function handleInputChange(value: string) {
    setQuery(value);
    setSelectedLabel(null);
    setVerified(false);
    onSelect(null);
  }

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor="banCitySearch"
        className="mb-1 block text-sm font-medium text-slate-700"
      >
        Ville du chantier <span className="text-red-500">*</span>
      </label>
      <input
        id="banCitySearch"
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="Lille, Roubaix, Bailleul…"
        className={inputClass}
        required={required}
        autoComplete="off"
      />
      {loading && (
        <p className="mt-1 text-xs text-slate-500">Recherche des communes…</p>
      )}
      {verified && selectedLabel && (
        <p className="mt-1 text-xs font-medium text-emerald-700">
          ✓ {selectedLabel} — Nord / Pas-de-Calais
        </p>
      )}
      {!verified && query.length >= 3 && !loading && (
        <p className="mt-1 text-xs text-amber-700">
          Sélectionnez une ville dans la liste (communes 59 et 62).
        </p>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => pickSuggestion(item)}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-brand-50"
              >
                {item.city}{" "}
                <span className="text-slate-500">({item.postcode})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
