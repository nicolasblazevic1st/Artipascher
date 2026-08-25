"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { WorkTradesIconRow } from "@/components/WorkTradesIcons";
import { DATA_HOSTING_NOTICE } from "@/lib/data";

const SLIDE_MS = 9000;
const TOTAL_SLIDES = 6;

type SlideId =
  | "intro"
  | "demande"
  | "annonce"
  | "contact"
  | "criteres"
  | "cta";

const SLIDE_LABELS: Record<SlideId, string> = {
  intro: "Bienvenue",
  demande: "Votre demande",
  annonce: "Annonce publiée",
  contact: "Mise en relation",
  criteres: "Vos critères",
  cta: "Lancez votre projet",
};

const SLIDE_ORDER: SlideId[] = [
  "intro",
  "demande",
  "annonce",
  "contact",
  "criteres",
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
          nord-artisan-pro.com
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
          Nord Artisan Pro · 100&nbsp;% Nord-Pas-de-Calais · 59 / 62
        </p>
        <h3 className="mt-4 text-xl font-bold sm:text-2xl">
          Jusqu&apos;à 5 artisans vérifiés pour vos travaux
          (vous choisissez le nombre : 1 à 5)
        </h3>
        <p className="mt-2 text-sm text-brand-100 sm:text-base">
          Gratuit pour vous — l&apos;artisan paie le contact
        </p>
        <WorkTradesIconRow className="mt-4 justify-start" tone="onDark" maxItems={5} />
        <p className="mt-3 text-xs text-brand-200/90">{DATA_HOSTING_NOTICE}</p>
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
          Demande de travaux
        </span>
        <h3 className="text-base font-bold text-slate-900 sm:text-lg">
          Peinture · Lille (59)
        </h3>
        <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
          Rafraîchissement salon et chambre, 45 m², blanc cassé mat satin…
        </p>
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-50 p-2 text-center">
            <dt className="text-[10px] text-slate-500">Photos</dt>
            <dd className="text-sm font-bold text-slate-900">3</dd>
          </div>
          <div className="rounded-lg bg-client-50 p-2 text-center">
            <dt className="text-[10px] text-client-600">Durée d&apos;annonce</dt>
            <dd className="text-sm font-bold text-client-800">30 jours</dd>
          </div>
        </dl>
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Compte non obligatoire · validation par l&apos;équipe Nord Artisan Pro…
        </p>
      </div>
    </MockBrowserChrome>
  );
}

function SlideAnnonce() {
  return (
    <MockBrowserChrome>
      <div className="explainer-enter space-y-3">
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
          Peinture
        </span>
        <h3 className="font-bold text-slate-900">Offre publiée · Lille</h3>
        <dl className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2 text-center">
          <div>
            <dt className="text-[10px] text-slate-500">Contacts</dt>
            <dd className="text-sm font-bold text-brand-700">2 / 5</dd>
          </div>
          <div>
            <dt className="text-[10px] text-slate-500">Temps restant</dt>
            <dd className="text-xs font-semibold">28 j</dd>
          </div>
        </dl>
        <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3">
          <p className="text-xs font-semibold text-slate-900">
            Visible par les artisans correspondants
          </p>
          <p className="mt-1 text-[10px] text-slate-600">
            Consultation libre · déblocage si critères client OK — max. au choix
            du client (1–5)
          </p>
        </div>
      </div>
    </MockBrowserChrome>
  );
}

function SlideContact() {
  return (
    <MockBrowserChrome>
      <div className="explainer-enter space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
            Place 3 / 5 · vérifié
          </span>
          <span className="text-[10px] text-slate-500">Max. 1–5 artisans</span>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold text-emerald-900">
            Coordonnées client débloquées · 20 €
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
        <ul className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-600 sm:grid-cols-3">
          <li className="rounded bg-slate-50 px-2 py-1">Décennale</li>
          <li className="rounded bg-slate-50 px-2 py-1">RC pro</li>
          <li className="rounded bg-slate-50 px-2 py-1">BODACC</li>
        </ul>
        <div className="rounded-lg border border-dashed border-brand-300 bg-brand-50 p-3">
          <p className="text-xs text-brand-800">
            L&apos;artisan vous appelle, visite le chantier et envoie son devis
            directement — hors plateforme.
          </p>
        </div>
      </div>
    </MockBrowserChrome>
  );
}

function SlideCriteres() {
  return (
    <MockBrowserChrome>
      <div className="explainer-enter space-y-3">
        <span className="rounded-full bg-client-100 px-2.5 py-0.5 text-xs font-semibold text-client-700">
          Vos attentes
        </span>
        <h3 className="text-sm font-bold text-slate-900">
          Conditionnez qui peut vous contacter
        </h3>
        <ul className="space-y-2 text-xs text-slate-700">
          <li className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <span className="font-semibold text-emerald-950">
              Obligatoire · assurances &amp; juridique
            </span>
            <span className="mt-0.5 block text-[10px] text-emerald-800">
              Décennale · RC pro · pas de procédure collective active (BODACC)
            </span>
          </li>
          <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="font-semibold text-slate-900">Ancienneté</span>
            <span className="mt-0.5 block text-[10px] text-slate-500">
              Uniquement indifférent, ou 2 ans et plus
            </span>
          </li>
          <li className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="font-semibold text-amber-950">Avis Google</span>
            <span className="mt-0.5 block text-[10px] text-amber-800">
              Optionnel · filtre selon note connue (ex. ≥ 4,0 / 5)
            </span>
          </li>
        </ul>
        <p className="text-center text-[10px] text-slate-500">
          Jusqu&apos;à 5 artisans vérifiés vous appellent — vous choisissez
          combien (1 à 5)
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
        Gratuit pour vous · 1 à 5 artisans vérifiés 59/62
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

  function renderSlide() {
    switch (slideId) {
      case "intro":
        return <SlideIntro />;
      case "demande":
        return <SlideDemande />;
      case "annonce":
        return <SlideAnnonce />;
      case "contact":
        return <SlideContact />;
      case "criteres":
        return <SlideCriteres />;
      case "cta":
        return <SlideCta />;
    }
  }

  return (
    <div
      className={`mx-auto w-full ${compact ? "max-w-2xl" : "max-w-3xl"}`}
      role="region"
      aria-label="Présentation animée Nord Artisan Pro"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-stone-50 shadow-xl">
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

        <div
          className={`relative flex items-center justify-center bg-stone-100 ${
            compact ? "aspect-video p-3 sm:p-4" : "aspect-video p-4 sm:p-6 md:p-8"
          }`}
        >
          <div className="w-full max-w-lg">{renderSlide()}</div>
        </div>

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
          Présentation animée avec l&apos;interface Nord Artisan Pro ·{" "}
          <Link href="/particulier" className="font-medium text-brand-700 hover:underline">
            Essayer maintenant
          </Link>
        </p>
      )}
      <p className="mt-3 text-center text-xs text-slate-500">{DATA_HOSTING_NOTICE}</p>
    </div>
  );
}
