"use client";

import { useEffect, useRef, useState } from "react";

export interface SelectedBanAddress {
  addressLine: string;
  postalCode: string;
  city: string;
  banAddressId: string;
  label: string;
}

interface BanSuggestion {
  id: string;
  label: string;
  name: string;
  postcode: string;
  city: string;
}

interface Props {
  inputClass: string;
  onSelect: (address: SelectedBanAddress | null) => void;
  onManualChange?: () => void;
  required?: boolean;
  initialSelected?: SelectedBanAddress | null;
}

export default function BanAddressAutocomplete({
  inputClass,
  onSelect,
  onManualChange,
  required = true,
  initialSelected = null,
}: Props) {
  const [query, setQuery] = useState(initialSelected?.label ?? "");
  const [suggestions, setSuggestions] = useState<BanSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(
    initialSelected?.label ?? null
  );
  const [verified, setVerified] = useState(Boolean(initialSelected));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialSelected?.banAddressId) return;
    setQuery(initialSelected.label);
    setSelectedLabel(initialSelected.label);
    setVerified(true);
  }, [initialSelected?.banAddressId, initialSelected?.label]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
          `/api/address/search?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = (await res.json()) as { features: BanSuggestion[] };
          setSuggestions(data.features ?? []);
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

  function pickSuggestion(item: BanSuggestion) {
    setQuery(item.label);
    setSelectedLabel(item.label);
    setVerified(true);
    setOpen(false);
    setSuggestions([]);
    onSelect({
      addressLine: item.name,
      postalCode: item.postcode,
      city: item.city,
      banAddressId: item.id,
      label: item.label,
    });
  }

  function handleInputChange(value: string) {
    setQuery(value);
    setSelectedLabel(null);
    setVerified(false);
    onSelect(null);
    onManualChange?.();
  }

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor="banAddressSearch" className="mb-1 block text-sm font-medium text-slate-700">
        Adresse du chantier <span className="text-red-500">*</span>
      </label>
      <input
        id="banAddressSearch"
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="Commencez à taper : 12 rue de la Barre, Lille…"
        className={inputClass}
        required={required}
        autoComplete="off"
      />
      {loading && (
        <p className="mt-1 text-xs text-slate-500">Recherche dans la Base Adresse Nationale…</p>
      )}
      {verified && selectedLabel && (
        <p className="mt-1 text-xs font-medium text-emerald-700">
          ✓ Adresse officielle sélectionnée — double vérification à l&apos;envoi
        </p>
      )}
      {!verified && query.length >= 3 && !loading && (
        <p className="mt-1 text-xs text-amber-700">
          Sélectionnez une adresse dans la liste (registre État data.gouv.fr).
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
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
