import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/LegalDocument";
import { LEGAL_PUBLISHER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description:
    "Conditions générales d'utilisation de la plateforme Artipascher.",
};

export default function CguPage() {
  return (
    <LegalDocument title="Conditions générales d'utilisation (CGU)">
      <section>
        <h2>1. Objet</h2>
        <p className="mt-3">
          Les présentes Conditions générales d&apos;utilisation (ci-après « CGU »)
          régissent l&apos;accès et l&apos;utilisation du site{" "}
          <strong>{LEGAL_PUBLISHER.siteUrl.replace("https://", "")}</strong>{" "}
          (ci-après « le Site » ou « la Plateforme ») édité par{" "}
          {LEGAL_PUBLISHER.brand} / {LEGAL_PUBLISHER.legalName} (ci-après «
          l&apos;Éditeur »).
        </p>
        <p className="mt-3">
          Toute utilisation du Site implique l&apos;acceptation sans réserve des
          présentes CGU. En cas de désaccord, l&apos;utilisateur doit cesser
          d&apos;utiliser le Site.
        </p>
      </section>

      <section>
        <h2>2. Définitions</h2>
        <ul>
          <li>
            <strong>Client</strong> : particulier ou société utilisant la
            Plateforme pour publier une demande de travaux.
          </li>
          <li>
            <strong>Professionnel / Artisan</strong> : entreprise du bâtiment
            inscrite au registre du commerce, vérifiée (SIRET, documents),
            autorisée à enchérir et à contacter des Clients.
          </li>
          <li>
            <strong>Utilisateur</strong> : toute personne accédant au Site
            (visiteur, Client ou Professionnel).
          </li>
          <li>
            <strong>Enchère inversée</strong> : mécanisme par lequel des
            Professionnels proposent des montants décroissants sur un projet de
            travaux publié.
          </li>
          <li>
            <strong>Crédits</strong> : unités prépayées permettant aux
            Professionnels d&apos;utiliser certains services payants de la
            Plateforme (voir{" "}
            <Link href="/cgv">CGV</Link>).
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Rôle de la Plateforme</h2>
        <p className="mt-3">
          Artipascher est un <strong>intermédiaire de mise en relation</strong>.
          Elle met à disposition des outils numériques permettant :
        </p>
        <ul>
          <li>aux Clients de décrire un projet de travaux ;</li>
          <li>
            aux Professionnels de formuler des propositions (enchères / devis) ;
          </li>
          <li>
            au Client de choisir librement l&apos;artisan avec lequel il
            souhaite poursuivre.
          </li>
        </ul>
        <p className="mt-3">
          <strong>Artipascher n&apos;est pas</strong> entreprise de travaux,
          maître d&apos;œuvre, assureur, ni partie au contrat de chantier. Le
          prix des travaux, le devis formalisé, le planning, la facturation et
          le paiement du chantier sont conclus{" "}
          <strong>directement entre le Client et l&apos;Artisan</strong>, hors
          Plateforme. Artipascher ne perçoit{" "}
          <strong>aucune commission</strong> sur le montant des travaux.
        </p>
      </section>

      <section>
        <h2>4. Accès au service — version bêta / préouverture</h2>
        <p className="mt-3">
          Le Site peut être proposé en version bêta ou préouverture. Dans ce
          cas, certaines fonctionnalités (inscriptions, demandes, paiements)
          peuvent être temporairement indisponibles. L&apos;Éditeur peut
          modifier, suspendre ou interrompre tout ou partie du service, avec ou
          sans préavis, notamment pour maintenance, sécurité ou conformité.
        </p>
      </section>

      <section>
        <h2>5. Inscription et comptes</h2>
        <h3>5.1 Conditions</h3>
        <p className="mt-3">
          L&apos;inscription nécessite des informations exactes et à jour. Le
          Client et le Professionnel s&apos;engagent à maintenir la
          confidentialité de leurs identifiants.
        </p>
        <h3>5.2 Professionnels</h3>
        <p className="mt-3">
          L&apos;accès aux fonctionnalités professionnelles est réservé aux
          entreprises actives dont le SIRET est vérifié, avec siège ou
          établissement dans le périmètre géographique indiqué sur le Site
          (notamment départements 59 et 62), et justifiant des documents
          demandés (attestation décennale, RC pro, etc.). L&apos;Éditeur peut
          refuser, suspendre ou retirer un compte en cas d&apos;informations
          inexactes, de non-conformité documentaire ou d&apos;usage abusif.
        </p>
        <h3>5.3 Clients</h3>
        <p className="mt-3">
          Les Clients s&apos;engagent à décrire leurs projets de bonne foi
          (localisation, photos, description) et à ne publier aucun contenu
          illicite, trompeur ou portant atteinte aux tiers.
        </p>
      </section>

      <section>
        <h2>6. Fonctionnement des enchères et de la mise en relation</h2>
        <ul>
          <li>
            Une demande de travaux peut être validée par l&apos;équipe
            Artipascher avant ouverture d&apos;une enchère.
          </li>
          <li>
            Les montants proposés sur la Plateforme constituent des{" "}
            <strong>indications</strong> ; le devis formalisé après visite du
            Professionnel prime en principe sur les estimations en ligne.
          </li>
          <li>
            Le Client choisit librement l&apos;Artisan ; aucun attribution
            automatique n&apos;est imposée.
          </li>
          <li>
            Le déblocage des coordonnées et certaines actions professionnelles
            peuvent être soumis à consommation de crédits (voir{" "}
            <Link href="/cgv">CGV</Link>).
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Obligations des Utilisateurs</h2>
        <p className="mt-3">Chaque Utilisateur s&apos;engage à :</p>
        <ul>
          <li>respecter les lois et règlements applicables ;</li>
          <li>
            ne pas perturber le fonctionnement du Site (robots abusifs,
            intrusion, contournement de sécurité) ;
          </li>
          <li>
            ne pas usurper l&apos;identité d&apos;autrui ni diffuser de contenus
            diffamatoires, discriminatoires ou illicites ;
          </li>
          <li>
            pour les Professionnels : respecter leurs obligations
            professionnelles (assurances, règles de l&apos;art, devis, factures).
          </li>
        </ul>
      </section>

      <section>
        <h2>8. Contenu publié par les Utilisateurs</h2>
        <p className="mt-3">
          Les Utilisateurs restent responsables des contenus qu&apos;ils
          publient (textes, photos, documents). Ils concèdent à l&apos;Éditeur
          une licence non exclusive, gratuite, pour héberger, afficher et
          traiter ces contenus aux seules fins d&apos;exploitation de la
          Plateforme.
        </p>
        <p className="mt-3">
          L&apos;Éditeur peut retirer tout contenu manifestement illicite ou
          contraire aux présentes CGU, sans préjudice d&apos;autres mesures
          (suspension de compte).
        </p>
      </section>

      <section>
        <h2>9. Données personnelles</h2>
        <p className="mt-3">
          Le traitement des données personnelles est effectué conformément au
          RGPD et à la loi Informatique et Libertés. Pour exercer vos droits
          (accès, rectification, effacement, opposition, etc.), contactez{" "}
          <a href={`mailto:${LEGAL_PUBLISHER.email}`}>{LEGAL_PUBLISHER.email}</a>
          . Des informations complémentaires figurent dans la{" "}
          <Link href="/cookies">politique de cookies</Link>. Une politique de
          confidentialité dédiée pourra compléter ce dispositif.
        </p>
      </section>

      <section>
        <h2>10. Responsabilité</h2>
        <h3>10.1 Intermédiaire</h3>
        <p className="mt-3">
          L&apos;Éditeur ne garantit pas la conclusion d&apos;un contrat de
          travaux, ni la qualité, le délai ou le prix final des prestations
          réalisées par les Artisans. Toute réclamation relative aux travaux
          doit être adressée à l&apos;Artisan concerné.
        </p>
        <h3>10.2 Vérifications</h3>
        <p className="mt-3">
          Les contrôles (SIRET, documents) visent à renforcer la confiance mais
          ne constituent pas une garantie absolue. Le Client reste responsable
          de ses vérifications avant engagement.
        </p>
        <h3>10.3 Disponibilité</h3>
        <p className="mt-3">
          Le Site est fourni « en l&apos;état ». L&apos;Éditeur s&apos;efforce
          d&apos;assurer une disponibilité raisonnable sans obligation de
          résultat quant à une disponibilité ininterrompue.
        </p>
        <h3>10.4 Limitation</h3>
        <p className="mt-3">
          Dans les limites autorisées par la loi, la responsabilité de
          l&apos;Éditeur est limitée aux dommages directs prouvés résultant
          d&apos;une faute de l&apos;Éditeur, à l&apos;exclusion des dommages
          indirects (perte de chance, manque à gagner, etc.).
        </p>
      </section>

      <section>
        <h2>11. Propriété intellectuelle</h2>
        <p className="mt-3">
          Les marques, logos, textes et éléments graphiques du Site sont la
          propriété de l&apos;Éditeur ou de ses partenaires. Toute utilisation
          non autorisée est interdite.
        </p>
      </section>

      <section>
        <h2>12. Suspension et résiliation</h2>
        <p className="mt-3">
          L&apos;Éditeur peut suspendre ou clôturer un compte en cas de manquement
          aux CGU, de fraude, d&apos;atteinte à la sécurité ou sur demande de
          l&apos;Utilisateur. L&apos;Utilisateur peut demander la clôture de son
          compte par email à{" "}
          <a href={`mailto:${LEGAL_PUBLISHER.email}`}>{LEGAL_PUBLISHER.email}</a>.
        </p>
      </section>

      <section>
        <h2>13. Modification des CGU</h2>
        <p className="mt-3">
          L&apos;Éditeur peut modifier les présentes CGU. La version applicable
          est celle publiée sur le Site à la date d&apos;utilisation. En cas de
          modification substantielle, une information pourra être communiquée
          aux Utilisateurs inscrits.
        </p>
      </section>

      <section>
        <h2>14. Droit applicable et litiges</h2>
        <p className="mt-3">
          Les présentes CGU sont soumises au droit français. En cas de litige,
          et à défaut d&apos;accord amiable, les tribunaux compétents seront
          ceux déterminés selon les règles de procédure civile françaises.
        </p>
        <p className="mt-3">
          Conformément aux articles L.611-1 et suivants du Code de la
          consommation, le Client consommateur peut recourir gratuitement à un
          médiateur de la consommation. Coordonnées du médiateur :{" "}
          <strong>[À COMPLÉTER : nom et site du médiateur]</strong>.
        </p>
      </section>

      <section>
        <h2>15. Contact</h2>
        <p className="mt-3">
          <a href={`mailto:${LEGAL_PUBLISHER.email}`}>{LEGAL_PUBLISHER.email}</a>
          {" · "}
          <Link href="/mentions-legales">Mentions légales</Link>
          {" · "}
          <Link href="/cgv">CGV</Link>
        </p>
      </section>
    </LegalDocument>
  );
}
