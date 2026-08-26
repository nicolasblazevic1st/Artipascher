import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/LegalDocument";
import { LEGAL_PUBLISHER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description:
    "Conditions générales d'utilisation de la plateforme Nord Artisan Pro.",
};

export default function CguPage() {
  return (
    <LegalDocument title="Conditions Générales d'Utilisation (CGU)">
      <section>
        <h2>1. Objet</h2>
        <p className="mt-3">
          Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU »)
          régissent l&apos;accès et l&apos;utilisation du Site{" "}
          <strong>{LEGAL_PUBLISHER.siteUrl.replace("https://", "")}</strong>{" "}
          (ci-après « le Site » ou « la Plateforme ») édité par{" "}
          {LEGAL_PUBLISHER.brand} / {LEGAL_PUBLISHER.legalName} (ci-après
          « l&apos;Éditeur »).
        </p>
        <p className="mt-3">
          Toute utilisation du Site implique l&apos;acceptation sans réserve des
          présentes CGU. En cas de désaccord, l&apos;Utilisateur doit cesser
          d&apos;utiliser le Site.
        </p>
      </section>

      <section>
        <h2>2. Définitions</h2>
        <ul>
          <li>
            <strong>CGU</strong>{" "} : les présentes Conditions Générales
            d&apos;Utilisation.
          </li>
          <li>
            <strong>Site</strong>{" "} / <strong>Plateforme</strong>{" "} : le site
            internet {LEGAL_PUBLISHER.siteUrl.replace("https://", "")}, édité
            par l&apos;Éditeur.
          </li>
          <li>
            <strong>Éditeur</strong>{" "} : {LEGAL_PUBLISHER.brand} /{" "}
            {LEGAL_PUBLISHER.legalName}.
          </li>
          <li>
            <strong>Client</strong>{" "} : particulier, société ou copropriété
            (syndicat / syndic) utilisant la Plateforme pour publier une demande
            de travaux. Les coordonnées du Client restent masquées jusqu&apos;au
            Déblocage par un Professionnel ; une demande de copropriété est
            signalée par un bandeau, sans identification de l&apos;immeuble.
          </li>
          <li>
            <strong>Professionnel / Artisan</strong>{" "} : entreprise du bâtiment
            inscrite au registre du commerce, vérifiée (SIRET, documents),
            autorisée à consulter les Annonces et à débloquer le contact des
            Clients.
          </li>
          <li>
            <strong>Utilisateur</strong>{" "} : toute personne accédant au Site
            (visiteur, Client ou Professionnel).
          </li>
          <li>
            <strong>Annonce / Offre</strong>{" "} : publication d&apos;une demande de
            travaux validée, consultable par les Professionnels (tous
            départements du périmètre) pendant la durée choisie par le Client ;
            le Déblocage des coordonnées reste soumis aux critères définis par
            le Client.
          </li>
          <li>
            <strong>Mise en Contact / Déblocage</strong>{" "} : accès payant
            (paiement unitaire au ticket du chantier — voir{" "}
            <Link href="/cgv">CGV</Link>) aux coordonnées d&apos;un Client après
            autorisation de contact.
          </li>
          <li>
            <strong>Solde Résiduel</strong>{" "} : éventuel crédit restant sur le
            compte Professionnel (remboursement, ancien crédit), utilisable
            pour un Déblocage s&apos;il est suffisant.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Rôle de la Plateforme</h2>
        <p className="mt-3">
          Nord Artisan Pro est un <strong>intermédiaire de mise en relation</strong>.
          Elle met à disposition des outils numériques permettant :
        </p>
        <ul>
          <li>aux Clients de décrire un projet de travaux ;</li>
          <li>
            aux Professionnels de débloquer les coordonnées d&apos;un Client
            pour le contacter et établir un devis hors Plateforme ;
          </li>
          <li>
            au Client d&apos;être contacté par le genre d&apos;Artisan qu&apos;il
            a choisi, selon les critères définis dans sa demande (métier,
            ancienneté, etc.).
          </li>
        </ul>
        <p className="mt-3">
          <strong>Nord Artisan Pro n&apos;est pas</strong>{" "} entreprise de travaux,
          maître d&apos;œuvre, assureur, ni partie au contrat de chantier. Le
          prix des travaux, le devis formalisé, le planning, la facturation et
          le paiement du chantier sont conclus{" "}
          <strong>directement entre le Client et l&apos;Artisan</strong>, hors
          Plateforme. Nord Artisan Pro ne perçoit{" "}
          <strong>aucune commission</strong>{" "} sur le montant des travaux.
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
          (notamment départements 59 et 62), justifiant des{" "}
          <strong>attestations d&apos;assurance en PDF original</strong>{" "} :
          responsabilité civile professionnelle (RC pro){" "}
          <strong>obligatoire</strong>, et le cas échéant une{" "}
          <strong>garantie adaptée aux activités déclarées</strong>. Selon le
          corps de métier, l&apos;Éditeur exige :
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            une attestation <strong>décennale</strong>{" "} lorsque l&apos;activité
            relève, selon la politique de la Plateforme, du régime de
            responsabilité décennale ;
          </li>
          <li>
            une attestation <strong>biennale / bon fonctionnement</strong>{" "}
            (éléments dissociables) lorsque applicable ;
          </li>
          <li>
            ou, pour certaines activités sans attestation de ce type exigée sur
            la Plateforme (ex. travaux à dominante esthétique / entretien,
            certains VRD), la <strong>RC pro seule</strong>.
          </li>
        </ul>
        <p className="mt-3">
          L&apos;Éditeur applique ces exigences{" "}
          <strong>par corps de métier</strong>{" "} à l&apos;inscription et peut
          refuser un dossier non conforme. Cette classification Plateforme est{" "}
          <strong>indicative</strong>{" "} et ne se substitue pas aux obligations
          légales de l&apos;Artisan envers ses clients. L&apos;entreprise ne
          doit pas faire l&apos;objet d&apos;une procédure collective active
          publiée au BODACC (données ouvertes DILA, licence ouverte 2.0). Ces
          contrôles sont effectués <strong>à l&apos;inscription</strong>, lors
          du dépôt des documents. L&apos;Éditeur peut refuser, suspendre ou
          retirer un compte en cas d&apos;informations inexactes, de
          non-conformité documentaire ou d&apos;usage abusif.
        </p>
        <h3>5.3 Clients</h3>
        <p className="mt-3">
          La publication d&apos;une demande peut se faire sans compte ; la
          création d&apos;un compte Client est recommandée pour suivre les
          demandes. Les Clients s&apos;engagent à décrire leurs projets de bonne
          foi (localisation, photos, description) et à ne publier aucun contenu
          illicite, trompeur ou portant atteinte aux tiers.
        </p>
      </section>

      <section>
        <h2>6. Demandes de travaux (Clients)</h2>
        <ul>
          <li>
            Une demande comporte notamment une description, des photos le cas
            échéant, une adresse de chantier et un{" "}
            <strong>numéro de mobile français</strong>.
          </li>
          <li>
            Le mobile doit être{" "}
            <strong>vérifié par code SMS</strong>{" "} avant la publication
            d&apos;une demande.
          </li>
          <li>
            Le Client peut indiquer une préférence d&apos;<strong>ancienneté
            d&apos;entreprise</strong>
            {" "}
            (indifférent ou 2&nbsp;ans et plus) : ce critère filtre les
            Artisans qui peuvent le contacter / être prospectés.
          </li>
          <li>
            Option (activée par défaut) :{" "}
            <strong>alerte SMS</strong>{" "} lorsqu&apos;un Artisan souhaite le
            contacter. Si cette option est activée, la demande de contact est{" "}
            <strong>acceptée automatiquement</strong>, dans la limite de{" "}
            <strong>5 Artisans</strong>{" "} par Annonce ; le Client est informé
            (SMS, email et/ou notification). Si l&apos;option est désactivée, le
            Client accepte ou refuse manuellement sous 48&nbsp;h.
          </li>
          <li>
            Les coordonnées du Client ne sont communiquées à un Professionnel
            qu&apos;après autorisation de contact et{" "}
            <strong>Déblocage</strong>{" "} (paiement unitaire — voir{" "}
            <Link href="/cgv">CGV</Link>).
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Annonces et mise en relation</h2>
        <ul>
          <li>
            Une demande de travaux peut être validée par l&apos;équipe
            Nord Artisan Pro avant publication de l&apos;Annonce.
          </li>
          <li>
            Les devis sont établis{" "}
            <strong>directement entre le Client et l&apos;Artisan</strong>{" "}
            (visite, échange hors Plateforme). Nord Artisan Pro ne
            centralise pas de devis concurrentiels.
          </li>
          <li>
            Après contact, le Client reste libre de poursuivre ou non avec
            l&apos;Artisan ; aucune attribution automatique n&apos;est imposée.
          </li>
          <li>
            Le Déblocage des coordonnées est soumis à la correspondance du
            profil Professionnel avec les critères choisis par le Client
            (métier, entreprise active, assurances, ancienneté, note Google le
            cas échéant) et au paiement de la Mise en Contact (voir{" "}
            <Link href="/cgv">CGV</Link>).
          </li>
          <li>
            Le Déblocage donne accès aux{" "}
            <strong>coordonnées</strong>{" "} (identité, téléphone, email, adresse) :
            il <strong>ne garantit pas</strong>{" "} une réponse du Client ni la
            conclusion d&apos;un chantier.
          </li>
        </ul>
      </section>

      <section>
        <h2>8. Prospection commerciale (Professionnels non inscrits)</h2>
        <p className="mt-3">
          L&apos;Éditeur peut contacter des{" "}
          <strong>entreprises du bâtiment</strong>{" "} (Professionnels non inscrits
          / prospects), à partir de <strong>sources publiques</strong>{" "} et/ou
          d&apos;un enrichissement (SIRET, NAF, ville, téléphone), pour
          signaler des chantiers ou inviter à s&apos;inscrire sur la Plateforme.
          Cette prospection B2B peut prendre la forme de <strong>SMS</strong>,
          d&apos;<strong>emails</strong>{" "} et/ou d&apos;
          <strong>appels téléphoniques</strong>.
        </p>

        <h3 className="mt-4">8.1 Prospection par SMS</h3>
        <ul>
          <li>
            Ces envois peuvent être déclenchés{" "}
            <strong>manuellement</strong>{" "} ou{" "}
            <strong>automatiquement</strong>{" "} lorsqu&apos;une demande Client est
            validée et publiée comme Offre (enchère) destinée aux Professionnels,
            dans la limite des places de contact prévues (notamment 5 Artisans
            maximum par Offre) ;
          </li>
          <li>
            les SMS marketing sont transmis via le prestataire technique{" "}
            <strong>OVH SMS</strong>{" "} et, en secours, via{" "}
            <strong>Brevo</strong>{" "} ; dès qu&apos;un envoi est effectivement
            soumis à ce prestataire, le message est pris en charge pour
            livraison (sous réserve des règles du réseau) ;
          </li>
          <li>
            les messages marketing comportent une mention{" "}
            <strong>STOP</strong>{" "} permettant de s&apos;opposer aux prochains
            envois marketing ; ils sont en principe adressés uniquement dans la
            fenêtre indicative des SMS commerciaux en France (lundi–samedi,
            8h–20h, heure de Paris) ;
          </li>
          <li>
            un numéro / SIRET déjà contacté par SMS marketing n&apos;est en
            principe <strong>pas relancé</strong>{" "} par ce canal.
          </li>
        </ul>
        <p className="mt-3">
          Les SMS transactionnels adressés aux Clients (vérification du mobile,
          alertes de contact) sont distincts des SMS marketing et peuvent
          ne pas comporter de clause STOP lorsqu&apos;ils sont liés à une action
          de l&apos;Utilisateur ou au service demandé.
        </p>

        <h3 className="mt-4">8.2 Prospection téléphonique</h3>
        <p className="mt-3">
          L&apos;Éditeur peut également procéder à une{" "}
          <strong>prospection téléphonique</strong>{" "} auprès d&apos;entreprises du
          bâtiment (numéros professionnels issus de sources publiques et/ou
          d&apos;enrichissement), pour présenter la Plateforme, signaler des
          chantiers disponibles ou inviter à l&apos;inscription.
        </p>
        <ul>
          <li>
            les appels sont effectués dans un cadre <strong>B2B</strong>{" "}
            (entreprises), en principe aux heures ouvrées raisonnables
            (indicatif : jours ouvrés, 9h–18h, heure de Paris) ;
          </li>
          <li>
            l&apos;appelant s&apos;identifie comme relevant de{" "}
            <strong>Nord Artisan Pro</strong>{" "} et indique l&apos;objet du
            contact ;
          </li>
          <li>
            le destinataire peut <strong>s&apos;opposer</strong>{" "} à tout moment
            aux prochains appels de prospection (lors de l&apos;appel, ou par
            écrit à{" "}
            <a href={`mailto:${LEGAL_PUBLISHER.email}`}>
              {LEGAL_PUBLISHER.email}
            </a>
            ) ; l&apos;opposition est enregistrée et respectée ;
          </li>
          <li>
            un numéro / SIRET ayant fait l&apos;objet d&apos;une opposition
            n&apos;est en principe <strong>plus relancé</strong>{" "} par téléphone
            à des fins de prospection.
          </li>
        </ul>
        <p className="mt-3">
          La prospection téléphonique est distincte des appels ou SMS liés au
          service une fois le Professionnel inscrit (compte, support, alertes
          de chantier).
        </p>

        <h3 className="mt-4">8.3 Prospection par email (B2B)</h3>
        <p className="mt-3">
          L&apos;Éditeur peut adresser des{" "}
          <strong>emails d&apos;information professionnelle</strong>{" "} à des
          entreprises du bâtiment (Professionnels inscrits ou prospects dont
          l&apos;email est connu), pour signaler des chantiers ou présenter la
          Plateforme. Cette prospection relève de l&apos;intérêt légitime B2B,
          avec droit d&apos;opposition.
        </p>
        <ul>
          <li>
            les envois marketing ne transitent{" "}
            <strong>pas</strong> par l&apos;offre MX Plan OVH ; ils sont
            acheminés via un prestataire d&apos;emailing (
            <strong>Brevo</strong>) ;
          </li>
          <li>
            chaque message comporte un{" "}
            <strong>lien de désinscription</strong> ; l&apos;opposition est
            enregistrée et respectée ;
          </li>
          <li>
            les emails transactionnels (confirmation de compte, mot de passe,
            alertes liées à un chantier) restent distincts et peuvent continuer
            d&apos;être envoyés après une désinscription marketing.
          </li>
        </ul>
      </section>

      <section>
        <h2>9. Obligations des Utilisateurs</h2>
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
            professionnelles (assurances, règles de l&apos;art, devis, factures) ;
          </li>
          <li>
            pour les Clients : publier des projets de bonne foi et maintenir un
            numéro de mobile joignable.
          </li>
        </ul>
      </section>

      <section>
        <h2>10. Contenu publié par les Utilisateurs</h2>
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
        <h2>11. Données personnelles</h2>
        <p className="mt-3">
          Le traitement des données personnelles est effectué conformément au
          RGPD et à la loi Informatique et Libertés. Pour exercer vos droits
          (accès, rectification, effacement, opposition, etc.), contactez{" "}
          <a href={`mailto:${LEGAL_PUBLISHER.email}`}>{LEGAL_PUBLISHER.email}</a>
          . Des informations complémentaires figurent dans la{" "}
          <Link href="/confidentialite">politique de confidentialité</Link> et
          la <Link href="/cookies">politique de cookies</Link>.
        </p>
      </section>

      <section>
        <h2>12. Responsabilité</h2>
        <h3>12.1 Intermédiaire</h3>
        <p className="mt-3">
          L&apos;Éditeur ne garantit pas la conclusion d&apos;un contrat de
          travaux, ni la qualité, le délai ou le prix final des prestations
          réalisées par les Artisans, ni le volume d&apos;Offres disponibles
          près d&apos;un Professionnel. Toute réclamation relative aux travaux
          doit être adressée à l&apos;Artisan concerné.
        </p>
        <h3>12.2 Vérifications</h3>
        <p className="mt-3">
          Les contrôles (SIRET, documents, vérification du téléphone) visent à
          renforcer la confiance mais ne constituent pas une garantie absolue.
          Le Client reste responsable de ses vérifications avant engagement.
        </p>
        <h3>12.3 Disponibilité</h3>
        <p className="mt-3">
          Le Site est fourni « en l&apos;état ». L&apos;Éditeur s&apos;efforce
          d&apos;assurer une disponibilité raisonnable sans obligation de
          résultat quant à une disponibilité ininterrompue.
        </p>
        <h3>12.4 Limitation</h3>
        <p className="mt-3">
          Dans les limites autorisées par la loi, la responsabilité de
          l&apos;Éditeur est limitée aux dommages directs prouvés résultant
          d&apos;une faute de l&apos;Éditeur, à l&apos;exclusion des dommages
          indirects (perte de chance, manque à gagner, etc.).
        </p>
      </section>

      <section>
        <h2>13. Propriété intellectuelle</h2>
        <p className="mt-3">
          Les marques, logos, textes et éléments graphiques du Site sont la
          propriété de l&apos;Éditeur ou de ses partenaires. Toute utilisation
          non autorisée est interdite.
        </p>
      </section>

      <section>
        <h2>14. Suspension et résiliation</h2>
        <p className="mt-3">
          L&apos;Éditeur peut suspendre ou clôturer un compte en cas de manquement
          aux CGU, de fraude, d&apos;atteinte à la sécurité ou sur demande de
          l&apos;Utilisateur. L&apos;Utilisateur peut demander la clôture de son
          compte par email à{" "}
          <a href={`mailto:${LEGAL_PUBLISHER.email}`}>{LEGAL_PUBLISHER.email}</a>.
        </p>
      </section>

      <section>
        <h2>15. Modification des CGU</h2>
        <p className="mt-3">
          L&apos;Éditeur peut modifier les présentes CGU. La version applicable
          est celle publiée sur le Site à la date d&apos;utilisation. En cas de
          modification substantielle, une information pourra être communiquée
          aux Utilisateurs inscrits.
        </p>
      </section>

      <section>
        <h2>16. Droit applicable et litiges</h2>
        <p className="mt-3">
          Les présentes CGU sont soumises au droit français. En cas de litige,
          et à défaut d&apos;accord amiable, les tribunaux compétents seront
          ceux déterminés selon les règles de procédure civile françaises.
        </p>
        <p className="mt-3">
          Conformément aux articles L.611-1 et suivants du Code de la
          consommation, le Client consommateur peut recourir gratuitement à un
          médiateur de la consommation.{" "}
          {LEGAL_PUBLISHER.consumerMediator}
        </p>
      </section>

      <section>
        <h2>17. Contact</h2>
        <p className="mt-3">
          <a href={`mailto:${LEGAL_PUBLISHER.email}`}>{LEGAL_PUBLISHER.email}</a>
          {" · "}
          <Link href="/mentions-legales">Mentions légales</Link>
          {" · "}
          <Link href="/cgv">CGV</Link>
          {" · "}
          <Link href="/confidentialite">Confidentialité</Link>
        </p>
      </section>
    </LegalDocument>
  );
}
