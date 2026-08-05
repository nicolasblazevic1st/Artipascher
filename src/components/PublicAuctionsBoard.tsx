"use client";

import { useEffect, useMemo, useState } from "react";
import AuctionCard from "@/components/AuctionCard";
import type { Auction } from "@/lib/data";
import { haversineKm } from "@/lib/geo-distance";

type ZoneMode = "all" | "department" | "distance";
type DepartmentFilter = "all" | "59" | "62";

const RADIUS_OPTIONS = [10, 20, 30, 50] as const;

interface CitySuggestion {
  id: string;
  label: string;
  city: string;
  postcode: string;
  lat: number;
  lon: number;
}

interface Props {
  auctions: Auction[];
}

export default function PublicAuctionsBoard({ auctions }: Props) {
  const [mode, setMode] = useState<ZoneMode>("all");
  const [department, setDepartment] = useState<DepartmentFilter>("all");
  const [radiusKm, setRadiusKm] = useState<(typeof RADIUS_OPTIONS)[number]>(20);
  const [cityQuery, setCityQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [selectedCity, setSelectedCity] = useState<CitySuggestion | null>(null);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    if (mode !== "distance" || selectedCity || cityQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingCities(true);
      try {
        const res = await fetch(
          `/api/address/search?type=municipality&q=${encodeURIComponent(cityQuery.trim())}`,
          { signal: controller.signal }
        );
        const data = (await res.json()) as {
          features?: Array<{
            id: string;
            label: string;
            city: string;
            postcode: string;
            lat: number;
            lon: number;
          }>;
        };
        setSuggestions(
          (data.features ?? []).map((f) => ({
            id: f.id,
            label: f.label,
            city: f.city,
            postcode: f.postcode,
            lat: f.lat,
            lon: f.lon,
          }))
        );
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoadingCities(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [cityQuery, mode, selectedCity]);

  const filtered = useMemo(() => {
    if (mode === "all") return auctions;

    if (mode === "department") {
      if (department === "all") return auctions;
      return auctions.filter((a) => a.department === department);
    }

    if (!selectedCity) return [];

    return auctions
      .map((auction) => {
        if (auction.latitude == null || auction.longitude == null) return null;
        const distanceKm = haversineKm(
          { lat: selectedCity.lat, lon: selectedCity.lon },
          { lat: auction.latitude, lon: auction.longitude }
        );
        if (distanceKm > radiusKm) return null;
        return { auction, distanceKm };
      })
      .filter((row): row is { auction: Auction; distanceKm: number } => row != null)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map((row) => row.auction);
  }, [auctions, mode, department, selectedCity, radiusKm]);

  return (
    <div>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Zone géographique</p>
        <p className="mt-1 text-xs text-slate-500">
          Filtrez les enchères par département ou autour d&apos;une ville.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { id: "all", label: "Toute la zone 59/62" },
              { id: "department", label: "Par département" },
              { id: "distance", label: "Autour d'une ville" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === option.id
                  ? "bg-brand-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {mode === "department" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                { id: "all", label: "59 et 62" },
                { id: "59", label: "Nord (59)" },
                { id: "62", label: "Pas-de-Calais (62)" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDepartment(option.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  department === option.id
                    ? "bg-brand-100 text-brand-800 ring-1 ring-brand-300"
                    : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {mode === "distance" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <label
                htmlFor="auction-city-filter"
                className="mb-1 block text-xs font-medium text-slate-600"
              >
                Ville
              </label>
              <input
                id="auction-city-filter"
                type="text"
                value={selectedCity?.label ?? cityQuery}
                onChange={(e) => {
                  setSelectedCity(null);
                  setCityQuery(e.target.value);
                }}
                placeholder="Ex. Lille, Arras, Lens…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                autoComplete="off"
              />
              {loadingCities && (
                <p className="mt-1 text-xs text-slate-400">Recherche…</p>
              )}
              {suggestions.length > 0 && !selectedCity && (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {suggestions.map((suggestion) => (
                    <li key={suggestion.id}>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                        onClick={() => {
                          setSelectedCity(suggestion);
                          setCityQuery(suggestion.city);
                          setSuggestions([]);
                        }}
                      >
                        {suggestion.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label
                htmlFor="auction-radius-filter"
                className="mb-1 block text-xs font-medium text-slate-600"
              >
                Rayon
              </label>
              <select
                id="auction-radius-filter"
                value={radiusKm}
                onChange={(e) =>
                  setRadiusKm(Number(e.target.value) as (typeof RADIUS_OPTIONS)[number])
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm sm:w-36"
              >
                {RADIUS_OPTIONS.map((km) => (
                  <option key={km} value={km}>
                    {km} km
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-sm text-slate-500">
        {filtered.length} enchère{filtered.length !== 1 ? "s" : ""} affichée
        {filtered.length !== 1 ? "s" : ""}
        {mode === "distance" && selectedCity
          ? ` · autour de ${selectedCity.city} (${radiusKm} km)`
          : mode === "department" && department !== "all"
            ? ` · département ${department}`
            : ""}
      </p>

      {mode === "distance" && !selectedCity ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Sélectionnez une ville pour afficher les enchères à proximité.
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Aucune enchère active dans cette zone.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}
    </div>
  );
}
