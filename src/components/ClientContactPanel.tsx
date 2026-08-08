"use client";

import { useCallback, useEffect, useState } from "react";
import ProInlineLoginForm from "@/components/pro/ProInlineLoginForm";
import ProSubmitQuoteForm from "@/components/pro/ProSubmitQuoteForm";
import { formatRequestedWorkStartDate } from "@/lib/demandes-validation";
import { UNLOCK_PRICE_EUR } from "@/lib/client-contacts";

interface ClientContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneVerified?: boolean;
  address: string;
  postalCode: string;
  companyName?: string;
  clientSiret?: string;
  clientKind?: "individual" | "company";
}

type InterestStatus = "none" | "pending" | "accepted" | "refused" | "expired";

type ClaimStatus = "none" | "pending" | "approved" | "rejected";

interface UnlockClaimInfo {
  canClaim: boolean;
  claimBlockedReason: string | null;
  claimStatus: ClaimStatus;
  refundedAt: string | null;
  autoEligible: boolean;
  hasQuote: boolean;
}

interface Props {
  auctionId: string;
  publicLocation: string;
  requestedWorkStartDate?: string;
}

export default function ClientContactPanel({
  auctionId,
  publicLocation,
  requestedWorkStartDate,
}: Props) {
  const [proLoggedIn, setProLoggedIn] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [contact, setContact] = useState<ClientContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [interestLoading, setInterestLoading] = useState(false);
  const [interestStatus, setInterestStatus] = useState<InterestStatus>("none");
  const [error, setError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [claimInfo, setClaimInfo] = useState<UnlockClaimInfo | null>(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const fetchClaimInfo = useCallback(async () => {
    const res = await fetch(
      `/api/pro/unlock-refund-claim?auctionId=${encodeURIComponent(auctionId)}`
    );
    if (!res.ok) return;
    const data = await res.json();
    if (!data.unlocked) {
      setClaimInfo(null);
      return;
    }
    setClaimInfo({
      canClaim: data.canClaim === true,
      claimBlockedReason: data.claimBlockedReason ?? null,
      claimStatus: (data.claimStatus as ClaimStatus) ?? "none",
      refundedAt: data.refundedAt ?? null,
      autoEligible: data.autoEligible === true,
      hasQuote: data.hasQuote === true,
    });
  }, [auctionId]);

  const fetchContact = useCallback(async () => {
    const res = await fetch(`/api/pro/contact/${auctionId}`);
    if (res.ok) {
      const data = await res.json();
      setUnlocked(true);
      setContact(data.contact);
      await fetchClaimInfo();
    }
  }, [auctionId, fetchClaimInfo]);

  const fetchInterest = useCallback(async () => {
    const res = await fetch("/api/pro/contact-requests");
    if (!res.ok) return;
    const data = await res.json();
    const match = (data.requests ?? []).find(
      (r: { auctionId: string; status: string }) => r.auctionId === auctionId
    );
    setInterestStatus(match ? (match.status as InterestStatus) : "none");
  }, [auctionId]);

  useEffect(() => {
    async function init() {
      const sessionRes = await fetch("/api/pro/session");
      const session = await sessionRes.json();
      setProLoggedIn(session.authenticated === true);
      if (session.companyName) setCompanyName(session.companyName);

      if (session.authenticated) {
        await Promise.all([fetchContact(), fetchInterest()]);
      }
      setLoading(false);

      const params = new URLSearchParams(window.location.search);
      if (params.get("unlocked") === "1" && session.authenticated) {
        await fetchContact();
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
    init();
  }, [auctionId, fetchContact, fetchInterest]);

  async function handleInterest() {
    setInterestLoading(true);
    setError(null);
    const res = await fetch("/api/pro/contact-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auctionId }),
    });
    const data = await res.json();
    setInterestLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Impossible d'envoyer la demande.");
      return;
    }
    const status =
      data.request?.status === "accepted" || data.autoAccepted === true
        ? "accepted"
        : "pending";
    setInterestStatus(status);
  }

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

  async function handleClaimRefund() {
    setClaimLoading(true);
    setError(null);
    setClaimMessage(null);
    const res = await fetch("/api/pro/unlock-refund-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auctionId }),
    });
    const data = await res.json();
    setClaimLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Signalement impossible.");
      return;
    }
    setClaimMessage(data.message ?? "Signalement enregistré.");
    await fetchClaimInfo();
  }

  async function handleLogout() {
    await fetch("/api/pro/logout", { method: "POST" });
    setProLoggedIn(false);
    setUnlocked(false);
    setContact(null);
    setCompanyName("");
    setInterestStatus("none");
    setClaimInfo(null);
    setClaimMessage(null);
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
            Accès · 1 crédit
            </span>
          </div>
          <p className="mt-1 text-xs text-emerald-700">
            Connecté en tant que {companyName}
          </p>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {contact.clientKind === "company" && contact.companyName && (
              <div className="sm:col-span-2">
                <dt className="text-emerald-600">Entreprise</dt>
                <dd className="font-medium text-emerald-900">
                  {contact.companyName}
                  {contact.clientSiret ? ` · SIRET ${contact.clientSiret}` : ""}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-emerald-600">Contact</dt>
              <dd className="font-medium text-emerald-900">
                {contact.firstName} {contact.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-emerald-600">Téléphone</dt>
              <dd className="font-medium text-emerald-900">
                <span className="inline-flex flex-wrap items-center gap-2">
                  {contact.phone}
                  {contact.phoneVerified && (
                    <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
                      Vérifié SMS
                    </span>
                  )}
                </span>
              </dd>
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

          {claimInfo && (
            <div className="mt-5 border-t border-emerald-200 pt-4">
              <p className="text-sm font-medium text-emerald-900">
                Client injoignable ?
              </p>
              <p className="mt-1 text-xs text-emerald-800">
                Après 7 jours (et jusqu’à 30 jours), vous pouvez demander le
                recréditage d’1 crédit si le client ne donne plus suite. Ce n’est
                pas un remboursement automatique si vous avez déjà déposé un devis
                ou si un autre artisan a été choisi.
              </p>
              {claimMessage && (
                <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-sm text-emerald-900">
                  {claimMessage}
                </p>
              )}
              {error && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              {claimInfo.claimStatus === "approved" || claimInfo.refundedAt ? (
                <p className="mt-2 text-sm text-emerald-800">
                  1 crédit a été recrédité pour ce contact.
                </p>
              ) : claimInfo.claimStatus === "pending" ? (
                <p className="mt-2 text-sm text-amber-800">
                  Signalement en cours d’examen.
                </p>
              ) : claimInfo.claimStatus === "rejected" ? (
                <p className="mt-2 text-sm text-slate-700">
                  Signalement refusé.
                </p>
              ) : claimInfo.canClaim ? (
                <button
                  type="button"
                  onClick={() => void handleClaimRefund()}
                  disabled={claimLoading}
                  className="mt-3 rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                >
                  {claimLoading
                    ? "Envoi…"
                    : claimInfo.autoEligible
                      ? "Demander le recréditage (1 crédit)"
                      : "Signaler un désengagement (examen)"}
                </button>
              ) : claimInfo.claimBlockedReason ? (
                <p className="mt-2 text-xs text-emerald-700">
                  {claimInfo.claimBlockedReason}
                </p>
              ) : null}
            </div>
          )}
        </section>
        <ProSubmitQuoteForm auctionId={auctionId} />
      </>
    );
  }

  return (
    <section id="contact" className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6">
      <h2 className="text-lg font-semibold text-slate-900">Coordonnées client</h2>
      <p className="mt-2 text-sm text-slate-600">
        Les photos du projet restent visibles librement (sans crédit). Manifestez
        votre intérêt (gratuit). Si le client a activé l&apos;alerte SMS (défaut),
        votre demande est acceptée automatiquement (dans la limite de 5 artisans) et
        vous pouvez débloquer les coordonnées pour 1 crédit ({UNLOCK_PRICE_EUR}
        &nbsp;€). Sinon, le client a 48&nbsp;h pour répondre.
      </p>

      <dl className="mt-4 rounded-lg bg-white p-4 text-sm">
        <div className="flex justify-between border-b border-slate-100 py-2">
          <dt className="text-slate-500">Localisation</dt>
          <dd className="font-medium">{publicLocation}</dd>
        </div>
        {requestedWorkStartDate && (
          <div className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-slate-500">Début travaux souhaité</dt>
            <dd className="font-medium text-amber-800">
              {formatRequestedWorkStartDate(requestedWorkStartDate)}
            </dd>
          </div>
        )}
        <div className="flex justify-between border-b border-slate-100 py-2">
          <dt className="text-slate-500">Client</dt>
          <dd className="text-slate-400">Masqué</dd>
        </div>
        <div className="flex justify-between border-b border-slate-100 py-2">
          <dt className="text-slate-500">Téléphone</dt>
          <dd className="text-slate-400">06 •• •• •• ••</dd>
        </div>
        <div className="flex justify-between py-2">
          <dt className="text-slate-500">Email</dt>
          <dd className="text-slate-400">•••@•••.fr</dd>
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
                  await Promise.all([fetchContact(), fetchInterest()]);
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

          {interestStatus === "none" && (
            <button
              type="button"
              onClick={handleInterest}
              disabled={interestLoading}
              className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 sm:w-auto sm:px-6"
            >
              {interestLoading ? "Envoi…" : "Je suis intéressé (gratuit)"}
            </button>
          )}

          {interestStatus === "pending" && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Demande envoyée — en attente de la réponse du client (48&nbsp;h).
            </p>
          )}

          {interestStatus === "refused" && (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
              Le client a décliné votre demande de contact.
            </p>
          )}

          {interestStatus === "expired" && (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
              Votre demande a expiré sans réponse du client.
            </p>
          )}

          {interestStatus === "accepted" && (
            <>
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Contact autorisé (acceptation client ou alerte SMS). Vous pouvez
                débloquer les coordonnées.
              </p>
              <button
                type="button"
                onClick={() => handleUnlock(false)}
                disabled={paying}
                className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 sm:w-auto sm:px-6"
              >
                {paying
                  ? "Traitement…"
                  : `Débloquer · 1 crédit (${UNLOCK_PRICE_EUR} €)`}
              </button>
              {process.env.NODE_ENV === "development" && (
                <button
                  type="button"
                  onClick={() => handleUnlock(true)}
                  disabled={paying}
                  className="block text-xs text-slate-500 underline"
                >
                  Mode démo (dev) — débloquer sans crédit
                </button>
              )}
              <a
                href="/pro/compte#credits"
                className="block text-xs font-medium text-brand-700 underline"
              >
                Acheter des crédits
              </a>
            </>
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
