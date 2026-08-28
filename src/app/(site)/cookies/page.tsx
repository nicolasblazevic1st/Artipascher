import type { Metadata } from "next";
import Link from "next/link";
import ManageCookiesButton from "@/components/ManageCookiesButton";

export const metadata: Metadata = {
  title: "Politique de cookies",
  description:
    "Informations sur les cookies utilisés par Nord Artisan Pro et gestion de votre consentement.",
};

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold text-slate-900">Politique de cookies</h1>
      <p className="mt-2 text-slate-600">
        Dernière mise à jour : 28 août 2026
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Qu&apos;est-ce qu&apos;un cookie ?
          </h2>
          <p className="mt-3">
            Un cookie est un petit fichier déposé sur votre terminal (ordinateur,
            mobile ou tablette) lors de la visite d&apos;un site. Il permet de
            mémoriser des informations relatives à votre navigation ou à votre
            compte.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Qui dépose les cookies ?
          </h2>
          <p className="mt-3">
            Les cookies décrits ci-dessous sont déposés par Nord Artisan Pro, ou par
            Google pour la mesure d&apos;audience et le suivi des conversions
            publicitaires lorsque vous y avez consenti.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Cookies nécessaires
          </h2>
          <p className="mt-3">
            Ces cookies sont indispensables au fonctionnement du site (connexion
            à votre espace, sécurité). Ils ne nécessitent pas votre
            consentement.
          </p>
          <p className="mt-3">
            Lors d&apos;une connexion via Google, vous êtes redirigé vers
            accounts.google.com. Google dépose alors ses propres cookies,
            selon sa politique de confidentialité. Les cookies{" "}
            <span className="font-mono text-xs">nap_google_oauth</span> et{" "}
            <span className="font-mono text-xs">nap_google_pro_pending</span>{" "}
            sont strictement nécessaires à ce parcours.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-900">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nom</th>
                  <th className="px-4 py-3 font-semibold">Finalité</th>
                  <th className="px-4 py-3 font-semibold">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">
                    nap_client_session
                  </td>
                  <td className="px-4 py-3">
                    Maintien de la session de l&apos;espace particulier
                  </td>
                  <td className="px-4 py-3">30 jours</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">
                    nap_pro_session
                  </td>
                  <td className="px-4 py-3">
                    Maintien de la session de l&apos;espace professionnel
                  </td>
                  <td className="px-4 py-3">7 jours</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">
                    nap_admin_session
                  </td>
                  <td className="px-4 py-3">
                    Maintien de la session d&apos;administration
                  </td>
                  <td className="px-4 py-3">8 heures</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">
                    nap_google_oauth
                  </td>
                  <td className="px-4 py-3">
                    Sécurité de la connexion Google (état OAuth / PKCE), le
                    temps du retour depuis Google
                  </td>
                  <td className="px-4 py-3">10 minutes</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">
                    nap_google_pro_pending
                  </td>
                  <td className="px-4 py-3">
                    Préremplissage de l&apos;inscription artisan après Google
                    (email, nom, photo de profil), avant dépôt SIRET / documents
                  </td>
                  <td className="px-4 py-3">30 minutes</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">
                    nap_cookie_consent
                  </td>
                  <td className="px-4 py-3">
                    Mémorisation de vos choix cookies (stockage local du
                    navigateur)
                  </td>
                  <td className="px-4 py-3">Jusqu&apos;à suppression</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Cookies de mesure d&apos;audience
          </h2>
          <p className="mt-3">
            Avec votre accord uniquement, nous utilisons Google Analytics et la
            balise Google Ads (AW-18373726951) pour comprendre comment le site
            est utilisé et pour attribuer les demandes de travaux aux campagnes
            (Recherche et Performance Max). Ces cookies ne sont pas déposés si
            vous refusez ou tant que vous n&apos;avez pas choisi.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-900">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nom</th>
                  <th className="px-4 py-3 font-semibold">Finalité</th>
                  <th className="px-4 py-3 font-semibold">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">_ga, _ga_*</td>
                  <td className="px-4 py-3">
                    Statistiques de visite via Google Analytics (IP anonymisée)
                  </td>
                  <td className="px-4 py-3">Jusqu&apos;à 2 ans</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">_gcl_au</td>
                  <td className="px-4 py-3">
                    Attribution des conversions Google Ads (clics Search et
                    Performance Max)
                  </td>
                  <td className="px-4 py-3">90 jours</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            Éditeur : Google Ireland Limited. Pour en savoir plus :{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-700 underline underline-offset-2"
            >
              politique de confidentialité Google
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Gérer votre consentement
          </h2>
          <p className="mt-3">
            Lors de votre première visite, un bandeau vous permet d&apos;accepter,
            de refuser ou de personnaliser les cookies non essentiels. Vous
            pouvez modifier votre choix à tout moment :
          </p>
          <p className="mt-4">
            <ManageCookiesButton className="inline-flex rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800" />
          </p>
          <p className="mt-3 text-slate-600">
            Refuser les cookies de mesure d&apos;audience n&apos;empêche pas
            l&apos;utilisation du site. Un identifiant anonyme de session
            (stockage session du navigateur, pas un cookie) sert uniquement à
            compter jusqu&apos;où un formulaire est rempli, sans nom, e-mail,
            téléphone ni adresse, et sans envoi à Google.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
          <p className="mt-3">
            Pour toute question relative aux cookies :{" "}
            <a
              href="mailto:contact@nord-artisan-pro.com"
              className="font-medium text-brand-700 underline underline-offset-2"
            >
              contact@nord-artisan-pro.com
            </a>
            . Voir aussi les{" "}
            <Link
              href="/mentions-legales"
              className="font-medium text-brand-700 underline underline-offset-2"
            >
              mentions légales
            </Link>
            , les{" "}
            <Link
              href="/cgu"
              className="font-medium text-brand-700 underline underline-offset-2"
            >
              CGU
            </Link>{" "}
            et la{" "}
            <Link
              href="/faq"
              className="font-medium text-brand-700 underline underline-offset-2"
            >
              FAQ
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
