"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/data";

const SLIDE_MS = 9000;
const TOTAL_SLIDES = 7;

type SlideId =
  | "intro"
  | "demande"
  | "enchere"
  | "visite"
  | "devis"
  | "choix"
  | "cta";

const SLIDE_LABELS: Record<SlideId, string> = {
  intro: "Bienvenue",
  demande: "Votre demande",
  enchere: "Enchère inversée",
  visite: "Visite sur site",
  devis: "Devis validé",
  choix: "Vous choisissez",
  cta: "Lancez votre projet",
};

const SLIDE_ORDER: SlideId[] = [
  "intro",
  "demande",
  "enchere",
  "visite",
  "devis",
  "choix",
  "cta",
];

function MockBrowserChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 truncate text-[10px] text-slate-400 sm:text-xs">
          artipascher.fr
        </span>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

function SlideIntro() {
  return (
    <div className="explainer-enter relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 p-6 text-white sm:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_50%)]" />
      <div className="relative">
        <p className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
          Nord 59 · Pas-de-Calais 62
        </p>
        <h3 className="mt-4 text-xl font-bold sm:text-2xl">
          Enchères inversées pour vos travaux
        </h3>
        <p className="mt-2 text-sm text-brand-100 sm:text-base">
          Artisans RCS vérifiés · Devis après visite · Vous choisissez
        </p>
        <span className="mt-5 inline-block rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold">
          Demander des travaux
        </span>
      </div>
    </div>
  );
}

function SlideDemande() {
  return (
    <MockBrowserChrome>
      <div className="explainer-enter space-y-3">
        <span className="rounded-full bg-client-100 px-2.5 py-0.5 text-xs font-semibold text-client-700">
          Espace particulier
        </span>
        <h3 className="text-base font-bold text-slate-900 sm:text-lg">
          Peinture · Lille (59)
        </h3>
        <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
          Rafraîchissement salon et chambre, 45 m², blanc cassé mat satin…
        </p>
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-50 p-2 text-center">
            <dt className="text-[10px] text-slate-500">Budget max</dt>
            <dd className="text-sm font-bold text-slate-900">4 500 €</dd>
          </div>
          <div className="rounded-lg bg-client-50 p-2 text-center">
            <dt className="text-[10px] text-client-600">Durée enchère</dt>
            <dd className="text-sm font-bold text-client-800">30 jours</dd>
          </div>
        </dl>
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          En validation par l&apos;équipe Artipascher…
        </p>
      </div>
    </MockBrowserChrome>
  );
}

function SlideEnchere({ price }: { price: number }) {
  return (
    <MockBrowserChrome>
      <div className="explainer-enter space-y-3">
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
          Peinture
        </span>
        <h3 className="font-bold text-slate-900">Enchère inversée · Lille</h3>
        <dl className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2 text-center">
          <div>
            <dt className="text-[10px] text-slate-500">Départ</dt>
            <dd className="text-xs font-semibold">4 500 €</dd>
          </div>
          <div className="rounded-lg bg-brand-50">
            <dt className="text-[10px] text-brand-600">Actuel</dt>
            <dd className="text-sm font-bold text-brand-700 transition-all duration-500">
              {formatPrice(price)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-slate-500">Devis</dt>
            <dd className="text-xs font-semibold">3</dd>
          </div>
        </dl>
        <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3">
          <p className="text-xs font-semibold text-slate-900">Enchère inversée</p>
          <p className="mt-1 text-[10px] text-slate-600">
            Les artisans proposent des prix de plus en plus bas · paliers 100 €
          </p>
        </div>
      </div>
    </MockBrowserChrome>
  );
}

function SlideVisite() {
  return (
    <MockBrowserChrome>
      <div className="explainer-enter space-y-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold text-emerald-900">
            Coordonnées client débloquées
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-1 text-[10px] sm:text-xs">
            <div>
              <dt className="text-emerald-600">Client</dt>
              <dd className="font-medium text-emerald-900">Marie D.</dd>
            </div>
            <div>
              <dt className="text-emerald-600">Ville</dt>
              <dd className="font-medium text-emerald-900">Lille (59)</dd>
            </div>
          </dl>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-brand-300 bg-brand-50 p-3">
          <span className="text-lg">🏠</span>
          <p className="text-xs text-brand-800">
            Visite sur le chantier pour établir un devis précis
          </p>
        </div>
      </div>
    </MockBrowserChrome>
  );
}

function SlideDevis() {
  return (
    <MockBrowserChrome>
      <div className="explainer-enter space-y-3">
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-brand-900">Devis après visite</p>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
              En modération
            </span>
          </div>
          <p className="mt-2 text-[10px] text-slate-600">
            Rénovation Lilloise SARL · Visite 28/07 ·{" "}
            <strong className="text-brand-700">3 950 €</strong>
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-white">
          <p className="text-[10px] font-semibold text-slate-300">Administration</p>
          <p className="mt-1 text-xs">Validation du devis avant publication</p>
          <span className="mt-2 inline-block rounded-lg bg-emerald-600 px-3 py-1 text-[10px] font-medium">
            Publier au particulier
          </span>
        </div>
        <p className="rounded-lg bg-emerald-50 px-2 py-1.5 text-center text-[10px] font-medium text-emerald-700">
          Devis publié — visible par le client
        </p>
      </div>
    </MockBrowserChrome>
  );
}

function SlideChoix() {
  return (
    <MockBrowserChrome>
      <div className="explainer-enter space-y-2">
        <span className="rounded-full bg-client-100 px-2.5 py-0.5 text-xs font-semibold text-client-700">
          Espace particulier
        </span>
        <p className="text-xs font-semibold text-slate-900">Devis des artisans</p>
        {[
          { name: "Rénovation Lilloise SARL", amount: 3950 },
          { name: "Peinture Nord Express", amount: 3780 },
        ].map((q) => (
          <div
            key={q.name}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <div>
              <p className="text-[10px] font-medium text-slate-900">{q.name}</p>
              <p className="text-xs font-bold text-brand-700">{formatPrice(q.amount)}</p>
            </div>
            <span className="rounded-lg bg-client-600 px-2 py-1 text-[10px] font-medium text-white">
              Choisir
            </span>
          </div>
        ))}
        <p className="text-center text-[10px] text-slate-500">
          Vous choisissez librement — pas d&apos;attribution automatique
        </p>
      </div>
    </MockBrowserChrome>
  );
}

function SlideCta() {
  return (
    <div className="explainer-enter rounded-xl bg-brand-800 p-6 text-center text-white sm:p-8">
      <h3 className="text-lg font-bold sm:text-xl">Prêt à lancer votre projet ?</h3>
      <p className="mt-2 text-sm text-brand-100">
        Gratuit pour les particuliers · Artisans vérifiés 59/62
      </p>
      <span className="mt-4 inline-block rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold">
        Demander des travaux
      </span>
    </div>
  );
}

interface Props {
  compact?: boolean;
  autoPlay?: boolean;
}

export default function SiteExplainer({ compact = false, autoPlay = true }: Props) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [encherePrice, setEncherePrice] = useState(4500);
  const tickRef = useRef(0);

  const slideId = SLIDE_ORDER[index];

  const goTo = useCallback((i: number) => {
    setIndex(i % TOTAL_SLIDES);
    setProgress(0);
    tickRef.current = 0;
  }, []);

  useEffect(() => {
    if (!playing) return;

    const interval = setInterval(() => {
      tickRef.current += 100;
      setProgress((tickRef.current / SLIDE_MS) * 100);

      if (tickRef.current >= SLIDE_MS) {
        setIndex((i) => (i + 1) % TOTAL_SLIDES);
        tickRef.current = 0;
        setProgress(0);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [playing, index]);

  useEffect(() => {
    if (slideId !== "enchere") {
      setEncherePrice(4500);
      return;
    }
    setEncherePrice(4500);
    const steps = [4300, 4100, 3900];
    let i = 0;
    const t = setInterval(() => {
      if (i < steps.length) {
        setEncherePrice(steps[i]);
        i += 1;
      }
    }, 2200);
    return () => clearInterval(t);
  }, [slideId]);

  function renderSlide() {
    switch (slideId) {
      case "intro":
        return <SlideIntro />;
      case "demande":
        return <SlideDemande />;
      case "enchere":
        return <SlideEnchere price={encherePrice} />;
      case "visite":
        return <SlideVisite />;
      case "devis":
        return <SlideDevis />;
      case "choix":
        return <SlideChoix />;
      case "cta":
        return <SlideCta />;
    }
  }

  return (
    <div
      className={`mx-auto w-full ${compact ? "max-w-2xl" : "max-w-3xl"}`}
      role="region"
      aria-label="Présentation animée Artipascher"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-stone-50 shadow-xl">
        {/* Barre type lecteur vidéo */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2 sm:px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700"
              aria-label={playing ? "Pause" : "Lecture"}
            >
              {playing ? (
                <span className="text-xs">❚❚</span>
              ) : (
                <span className="ml-0.5 text-xs">▶</span>
              )}
            </button>
            <span className="text-xs font-medium text-slate-600 sm:text-sm">
              {SLIDE_LABELS[slideId]}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            {index + 1} / {TOTAL_SLIDES}
          </span>
        </div>

        {/* Zone 16:9 */}
        <div
          className={`relative flex items-center justify-center bg-stone-100 ${
            compact ? "aspect-video p-3 sm:p-4" : "aspect-video p-4 sm:p-6 md:p-8"
          }`}
        >
          <div className="w-full max-w-lg">{renderSlide()}</div>
        </div>

        {/* Progression */}
        <div className="border-t border-slate-200 bg-white px-3 py-2 sm:px-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {SLIDE_ORDER.map((id, i) => (
              <button
                key={id}
                type="button"
                onClick={() => goTo(i)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition sm:text-xs ${
                  i === index
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {SLIDE_LABELS[id]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!compact && (
        <p className="mt-4 text-center text-sm text-slate-500">
          Présentation animée avec l&apos;interface Artipascher ·{" "}
          <Link href="/particulier" className="font-medium text-brand-700 hover:underline">
            Essayer maintenant
          </Link>
        </p>
      )}
    </div>
  );
}
