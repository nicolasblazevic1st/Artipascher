"use client";

import { useCallback, useEffect, useState } from "react";
import ProInlineLoginForm from "@/components/pro/ProInlineLoginForm";
import ProSubmitQuoteForm from "@/components/pro/ProSubmitQuoteForm";
import { UNLOCK_PRICE_EUR } from "@/lib/client-contacts";

interface ClientContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
}

interface Props {
  auctionId: string;
  publicLocation: string;
}

export default function ClientContactPanel({ auctionId, publicLocation }: Props) {
  const [proLoggedIn, setProLoggedIn] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [contact, setContact] = useState<ClientContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showLogin, setShowLogin] = useState(false);

  const fetchContact = useCallback(async () => {
    const res = await fetch(`/api/pro/contact/${auctionId}`);
    if (res.ok) {
      const data = await res.json();
      setUnlocked(true);
      setContact(data.contact);
    }
  }, [auctionId]);

  useEffect(() => {
    async function init() {
      const sessionRes = await fetch("/api/pro/session");
      const session = await sessionRes.json();
      setProLoggedIn(session.authenticated === true);
      if (session.companyName) setCompanyName(session.companyName);

      if (session.authenticated) {
        await fetchContact();
      }
      setLoading(false);

      const params = new URLSearchParams(window.location.search);
      if (params.get("unlocked") === "1" && session.authenticated) {
        await fetchContact();
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
    init();
  }, [auctionId, fetchContact]);

  async function handleUnlock(demo = false) {
    setPaying(true);
    setError(null);
    const res = await fetch("/api/pro/unlock-contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auctionId, demo }),
    });
    const data = await res.json();
    setPaying(false);

    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    if (data.unlocked || data.alreadyUnlocked) {
      await fetchContact();
      return;
    }
    setError(data.error ?? "Paiement impossible.");
  }

  async function handleLogout() {
    await fetch("/api/pro/logout", { method: "POST" });
    setProLoggedIn(false);
    setUnlocked(false);
    setContact(null);
    setCompanyName("");
  }

  if (loading) {
    return (
      <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
        Chargement des informations client…
      </section>
    );
  }

  if (unlocked && contact) {
    return (
      <>
        <section id="contact" className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-emerald-900">
              Coordonnées client débloquées
            </h2>
            <span className="rounded-full bg-emerald-200 px-3 py-1 text-xs font-medium text-emerald-800">
              Accès payé · {UNLOCK_PRICE_EUR} €
            </span>
          </div>
          <p className="mt-1 text-xs text-emerald-700">
            Connecté en tant que {companyName}
          </p>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-emerald-600">Client</dt>
              <dd className="font-medium text-emerald-900">
                {contact.firstName} {contact.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-emerald-600">Téléphone</dt>
              <dd className="font-medium text-emerald-900">{contact.phone}</dd>
            </div>
            <div>
              <dt className="text-emerald-600">Email</dt>
              <dd className="font-medium text-emerald-900">{contact.email}</dd>
            </div>
            <div>
              <dt className="text-emerald-600">Adresse</dt>
              <dd className="font-medium text-emerald-900">
                {contact.address}, {contact.postalCode}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 text-xs text-emerald-700 underline"
          >
            Se déconnecter
          </button>
        </section>
        <ProSubmitQuoteForm auctionId={auctionId} />
      </>
    );
  }

  return (
    <section id="contact" className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6">
      <h2 className="text-lg font-semibold text-slate-900">Coordonnées client</h2>
      <p className="mt-2 text-sm text-slate-600">
        Les informations du particulier sont <strong>confidentielles</strong>.
        Seuls les professionnels inscrits au RCS, validés par l&apos;admin, peuvent
        les consulter après paiement de <strong>{UNLOCK_PRICE_EUR} €</strong>.
      </p>

      <dl className="mt-4 rounded-lg bg-white p-4 text-sm">
        <div className="flex justify-between border-b border-slate-100 py-2">
          <dt className="text-slate-500">Localisation</dt>
          <dd className="font-medium">{publicLocation}</dd>
        </div>
        <div className="flex justify-between border-b border-slate-100 py-2">
          <dt className="text-slate-500">Client</dt>
          <dd className="text-slate-400">M. D*** · masqué</dd>
        </div>
        <div className="flex justify-between border-b border-slate-100 py-2">
          <dt className="text-slate-500">Téléphone</dt>
          <dd className="text-slate-400">06 •• •• •• ••</dd>
        </div>
        <div className="flex justify-between py-2">
          <dt className="text-slate-500">Email</dt>
          <dd className="text-slate-400">m•••@•••.fr</dd>
        </div>
      </dl>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {!proLoggedIn ? (
        <div className="mt-4">
          {!showLogin ? (
            <button
              type="button"
              onClick={() => setShowLogin(true)}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Se connecter (compte pro approuvé)
            </button>
          ) : (
            <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-white p-4">
              <ProInlineLoginForm
                compact
                onSuccess={async (name) => {
                  setProLoggedIn(true);
                  setCompanyName(name);
                  setShowLogin(false);
                  await fetchContact();
                }}
              />
              <button
                type="button"
                onClick={() => setShowLogin(false)}
                className="text-xs text-slate-500 underline"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600">
            Connecté : <strong>{companyName}</strong>
          </p>
          <button
            type="button"
            onClick={() => handleUnlock(false)}
            disabled={paying}
            className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 sm:w-auto sm:px-6"
          >
            {paying ? "Redirection…" : `Débloquer les coordonnées · ${UNLOCK_PRICE_EUR} €`}
          </button>
          {process.env.NODE_ENV === "development" && (
            <button
              type="button"
              onClick={() => handleUnlock(true)}
              disabled={paying}
              className="block text-xs text-slate-500 underline"
            >
              Mode démo (dev) — simuler le paiement 1 €
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="block text-xs text-slate-500 underline"
          >
            Se déconnecter
          </button>
        </div>
      )}
    </section>
  );
}
