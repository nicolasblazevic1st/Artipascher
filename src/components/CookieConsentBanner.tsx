"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import {
  COOKIE_CONSENT_OPEN_EVENT,
  readCookieConsent,
  writeCookieConsent,
} from "@/lib/cookie-consent";

export default function CookieConsentBanner() {
  const titleId = useId();
  const descriptionId = useId();
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const existing = readCookieConsent();
    if (existing) {
      setAnalytics(existing.analytics);
    } else {
      setVisible(true);
    }

    const onOpen = () => {
      const current = readCookieConsent();
      setAnalytics(current?.analytics ?? false);
      setShowDetails(true);
      setVisible(true);
    };

    window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, onOpen);
    };
  }, []);

  if (!visible) return null;

  function save(nextAnalytics: boolean) {
    writeCookieConsent(nextAnalytics);
    setAnalytics(nextAnalytics);
    setVisible(false);
    setShowDetails(false);
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-brand-800 bg-brand-950 p-4 text-brand-50 shadow-2xl shadow-brand-950/40 sm:p-5">
        <p id={titleId} className="text-base font-semibold text-white">
          Cookies et mesure d&apos;audience
        </p>
        <p
          id={descriptionId}
          className="mt-2 text-sm leading-relaxed text-brand-100"
        >
          Nous utilisons des cookies indispensables au fonctionnement du site
          (connexion à votre espace) et, uniquement avec votre accord, Google
          Analytics et Google Ads pour mesurer l&apos;audience et les
          conversions (demandes de travaux). Vous pouvez accepter ou refuser
          les cookies non essentiels.{" "}
          <Link
            href="/cookies"
            className="font-medium text-brand-200 underline underline-offset-2 hover:text-white"
          >
            En savoir plus
          </Link>
        </p>

        {showDetails && (
          <fieldset className="mt-4 rounded-xl border border-brand-800 bg-brand-900/60 p-3">
            <legend className="px-1 text-sm font-medium text-white">
              Personnaliser
            </legend>
            <label className="mt-1 flex items-start gap-3 text-sm text-brand-100">
              <input
                type="checkbox"
                checked
                disabled
                className="mt-1 h-4 w-4 rounded border-brand-600"
              />
              <span>
                <span className="font-medium text-white">
                  Cookies nécessaires
                </span>
                <span className="mt-0.5 block text-brand-200">
                  Session de connexion et sécurité. Toujours actifs.
                </span>
              </span>
            </label>
            <label className="mt-3 flex items-start gap-3 text-sm text-brand-100">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-brand-600 accent-brand-400"
              />
              <span>
                <span className="font-medium text-white">
                  Mesure d&apos;audience et conversions (Google)
                </span>
                <span className="mt-0.5 block text-brand-200">
                  Analytics et suivi des demandes via Google Ads. Désactivé par
                  défaut.
                </span>
              </span>
            </label>
          </fieldset>
        )}

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {!showDetails ? (
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-brand-100 underline-offset-2 hover:underline sm:mr-auto"
            >
              Personnaliser
            </button>
          ) : (
            <button
              type="button"
              onClick={() => save(analytics)}
              className="rounded-lg border border-brand-600 bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 sm:mr-auto"
            >
              Enregistrer mes choix
            </button>
          )}
          <button
            type="button"
            onClick={() => save(false)}
            className="rounded-lg border border-brand-500 bg-transparent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-900"
          >
            Tout refuser
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            className="rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-semibold text-accent-950 transition-colors hover:bg-accent-400"
          >
            Tout accepter
          </button>
        </div>
      </div>
    </div>
  );
}
