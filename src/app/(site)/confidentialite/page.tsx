import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/LegalDocument";
import { LEGAL_HOST, LEGAL_PUBLISHER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité et protection des données personnelles — Nord Artisan Pro.",
};

export default function ConfidentialitePage() {
  return (
    <LegalDocument title="Politique de confidentialité">
      <section>
        <h2>1. Responsable du traitement</h2>
        <p className="mt-3">
          Le responsable du traitement des données personnelles collectées via
          le site {LEGAL_PUBLISHER.siteUrl.replace("https://", "")} est :
        </p>
        <ul>
          <li>
            <strong>{LEGAL_PUBLISHER.brand}</strong>{" "} / {LEGAL_PUBLISHER.legalName}
          </li>
          <li>{LEGAL_PUBLISHER.address}</li>
          <li>SIRET : {LEGAL_PUBLISHER.siret}</li>
          <li>
            Email :{" "}
            <a href={`mailto:${LEGAL_PUBLISHER.email}`}>{LEGAL_PUBLISHER.email}</a>
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Données collectées</h2>
        <p className="mt-3">Selon votre usage du Site, nous pouvons traiter :</p>
        <ul>
          <li>
            <strong>Compte Client</strong>{" "} : identité, email, téléphone
            (mobile), statut de vérification SMS, mot de passe (hashé), adresse
            de chantier, description et photos du projet, préférences (ex.
            ancienneté d&apos;entreprise souhaitée, alerte SMS contact),
            éventuel SIRET (société) ;
          </li>
          <li>
            <strong>Compte Professionnel</strong>{" "} : raison sociale, SIRET/SIREN,
            email, téléphone, documents (décennale, RC pro…), métiers,
            historique de déblocages et éventuel solde résiduel ;
          </li>
          <li>
            <strong>Prospects acquisition</strong>{" "} : données d&apos;entreprises
            (SIRET, code NAF, ville, téléphone enrichi le cas échéant, sources
            publiques type annuaire / enrichissement) utilisées pour la
            prospection SMS, email et/ou téléphonique et le suivi d&apos;opposition
            (STOP SMS / désinscription email / opposition téléphone / déjà contacté) ;
          </li>
          <li>
            <strong>Campagnes SMS</strong>{" "} : historique des lots / envois
            (destinataires, statut, date), lien éventuel avec une offre
            publiée, et indicateurs d&apos;attribution (ex. inscription après
            SMS) ;
          </li>
          <li>
            <strong>Campagnes email</strong>{" "} : historique des envois
            marketing (destinataires, statut, date) et liste d&apos;opposition ;
          </li>
          <li>
            <strong>Prospection téléphonique</strong>{" "} : traces de contact /
            opposition (numéro, SIRET, date, résultat indicatif) pour éviter
            les relances non souhaitées ;
          </li>
          <li>
            <strong>Paiements</strong>{" "} : données de transaction via le
            prestataire de paiement (Stripe) — le Vendeur ne stocke pas le
            numéro complet de carte ;
          </li>
          <li>
            <strong>Technique</strong>{" "} : logs de connexion (adresse IP),
            cookies nécessaires, mesure d&apos;audience si consentement (voir{" "}
            <Link href="/cookies">politique de cookies</Link>) ;
          </li>
          <li>
            <strong>Parcours de formulaire</strong>{" "} : clic Google Ads
            (arrivée sur le site, même sans ouvrir le formulaire), étapes
            consultées, métier choisi, identifiant de session anonyme, et
            adresse IP associée (lue côté serveur, jamais saisie par le
            visiteur). Finalité : sécurité, prévention des abus et diagnostic
            des interruptions. Non transmise à Google Analytics. Non utilisée
            pour recontacter une personne qui n&apos;a pas laissé ses
            coordonnées ;
          </li>
          <li>
            <strong>Brouillons de formulaire</strong>{" "} : texte saisi dans le
            formulaire de demande (description des travaux, y compris « Autre »),
            associé à un identifiant de session anonyme, consultable uniquement
            en administration pour le suivi des parcours interrompus — non
            transmis à Google Analytics ;
          </li>
          <li>
            <strong>Communications</strong>{" "} : emails et SMS transactionnels
            (code de vérification, alertes de contact), emails et SMS marketing
            et appels de prospection B2B (invitation Professionnels /
            prospects).
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Finalités et bases légales</h2>
        <ul>
          <li>
            Exécution du contrat / mesures précontractuelles : création de
            compte, vérification du mobile Client, mise en relation, gestion des
            annonces, ventes de mises en contact, alertes de contact ;
          </li>
          <li>
            Intérêt légitime : sécurité, prévention de la fraude, amélioration
            du service, statistiques agrégées, prospection B2B d&apos;entreprises
            (SMS marketing et/ou appels téléphoniques, manuels ou liés à la
            publication d&apos;une offre, avec droit d&apos;opposition) ;
          </li>
          <li>
            Obligation légale : conservation comptable / fiscale le cas échéant ;
          </li>
          <li>
            Consentement : cookies non essentiels / mesure d&apos;audience.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. SMS</h2>
        <p className="mt-3">
          Les SMS sont acheminés via le prestataire <strong>OVH SMS</strong>{" "}
          (API), et le cas échéant via <strong>Brevo</strong> en secours.
          Expéditeur alphanumérique lorsque disponible (ex. NordArtPro).
        </p>

        <h3 className="mt-4">4.1 SMS transactionnels (Clients)</h3>
        <p className="mt-2">
          Code de vérification du mobile ; alerte lorsqu&apos;un Artisan demande
          le contact. Ces messages sont liés au service demandé ; ils peuvent ne
          pas comporter de clause STOP afin d&apos;éviter un désabonnement
          involontaire après un code ou une alerte.
        </p>

        <h3 className="mt-4">4.2 Marketing SMS (prospection B2B)</h3>
        <p className="mt-2">
          L&apos;Éditeur peut envoyer des SMS d&apos;information / invitation à
          des <strong>entreprises du bâtiment</strong>{" "} (Professionnels non
          encore inscrits ou prospects), à partir de{" "}
          <strong>sources publiques</strong>{" "} et/ou d&apos;un enrichissement
          (SIRET, NAF, ville, téléphone), pour signaler des chantiers ou
          inviter à s&apos;inscrire sur la Plateforme. Cette prospection relève
          de l&apos;
          <strong>intérêt légitime</strong>{" "} du responsable du traitement
          (développement B2B), sous réserve du droit d&apos;opposition.
        </p>
        <ul>
          <li>
            déclenchement <strong>manuel</strong>{" "} ou{" "}
            <strong>automatique</strong>{" "} lorsqu&apos;une demande Client est
            validée et publiée comme offre destinée aux Professionnels, dans la
            limite des places de contact (notamment 5 Artisans maximum par
            offre) ;
          </li>
          <li>
            campagnes éventuellement découpées en{" "}
            <strong>lots quotidiens</strong>{" "} jusqu&apos;à atteinte de
            l&apos;objectif de mise en relation ;
          </li>
          <li>
            transmission via <strong>OVH SMS</strong>{" "} ou{" "}
            <strong>Brevo</strong>{" "} ; dès qu&apos;un envoi
            est effectivement soumis au prestataire, le message est pris en
            charge pour livraison (sous réserve des règles du réseau). Une phase
            de préparation / validation interne peut précéder cet envoi réel ;
          </li>
          <li>
            chaque message marketing comporte une mention{" "}
            <strong>STOP</strong>{" "} permettant de s&apos;opposer aux prochains
            envois marketing ; l&apos;opposition est enregistrée et respectée ;
          </li>
          <li>
            envoi en principe limité à la fenêtre indicative des SMS
            commerciaux en France (lundi–samedi, 8h–20h, heure de Paris) ;
          </li>
          <li>
            un numéro / SIRET déjà contacté par SMS marketing n&apos;est en
            principe <strong>pas relancé</strong>{" "} par ce canal ;
          </li>
          <li>
            conservation de l&apos;historique des campagnes et du statut « déjà
            contacté » / opposition pour la durée nécessaire à éviter les
            relances et à démontrer le respect du droit d&apos;opposition.
          </li>
        </ul>
        <p className="mt-3">
          Les SMS transactionnels adressés aux Clients sont distincts des SMS
          marketing. Pour le cadre contractuel de la prospection, voir aussi
          les <Link href="/cgu">CGU</Link> (prospection commerciale).
        </p>
      </section>

      <section>
        <h2>4 bis. Prospection téléphonique (B2B)</h2>
        <p className="mt-3">
          L&apos;Éditeur peut contacter par <strong>téléphone</strong>{" "} des
          entreprises du bâtiment (Professionnels non inscrits / prospects), à
          partir des mêmes catégories de données (SIRET, NAF, ville, numéro
          professionnel public ou enrichi), pour présenter la Plateforme,
          signaler des chantiers ou inviter à l&apos;inscription. Cette
          prospection relève de l&apos;
          <strong>intérêt légitime</strong>{" "} du responsable du traitement
          (développement B2B), sous réserve du droit d&apos;opposition.
        </p>
        <ul>
          <li>
            appels en principe aux heures ouvrées raisonnables (indicatif :
            jours ouvrés, 9h–18h, heure de Paris) ;
          </li>
          <li>
            identification de l&apos;appelant (Nord Artisan Pro) et objet du
            contact ;
          </li>
          <li>
            opposition possible à tout moment lors de l&apos;appel ou par écrit
            à{" "}
            <a href={`mailto:${LEGAL_PUBLISHER.email}`}>
              {LEGAL_PUBLISHER.email}
            </a>{" "}
            ; l&apos;opposition est enregistrée et respectée ;
          </li>
          <li>
            conservation des traces d&apos;opposition / « ne plus appeler »
            pour la durée nécessaire à éviter les relances.
          </li>
        </ul>
        <p className="mt-3">
          Voir aussi les <Link href="/cgu">CGU</Link> (§ 8.2).
        </p>
      </section>

      <section>
        <h2>4 ter. Emails marketing (prospection B2B)</h2>
        <p className="mt-3">
          L&apos;Éditeur peut envoyer des emails d&apos;information
          professionnelle à des entreprises du bâtiment (adresses d&apos;inscrits
          ou listes B2B), distincts des emails de compte. Acheminement via{" "}
          <strong>Brevo</strong> (pas via l&apos;offre mail MX Plan OVH). Chaque
          message comporte un lien de désinscription ; l&apos;opposition est
          enregistrée et respectée.
        </p>
      </section>

      <section>
        <h2>5. Destinataires</h2>
        <p className="mt-3">Les données peuvent être communiquées :</p>
        <ul>
          <li>
            aux Artisans / Clients dans la stricte mesure nécessaire à la mise
            en relation (ex. coordonnées après déblocage ou acceptation) ;
          </li>
          <li>
            aux sous-traitants techniques : hébergeur ({LEGAL_HOST.name}),
            emails de compte (OVH), emails et SMS marketing (Brevo), SMS (OVH),
            paiement (Stripe), analytics (Google) si consentement ;
          </li>
          <li>aux autorités compétentes sur réquisition légale.</li>
        </ul>
        <p className="mt-3">
          Les données ne sont pas vendues à des tiers à des fins commerciales.
        </p>
      </section>

      <section>
        <h2>6. Transferts hors UE</h2>
        <p className="mt-3">
          L&apos;hébergement applicatif principal est situé en France (OVH).
          Certains sous-traitants (paiement, analytics) peuvent impliquer des
          traitements hors UE encadrés par des garanties appropriées (clauses
          contractuelles types, etc.).
        </p>
      </section>

      <section>
        <h2>7. Durées de conservation</h2>
        <ul>
          <li>
            Comptes actifs : pendant la durée d&apos;utilisation, puis archivage
            limité ;
          </li>
          <li>
            Comptes inactifs / clôture : suppression ou anonymisation dans un
            délai raisonnable, sous réserve d&apos;obligations légales ;
          </li>
          <li>
            Codes OTP : conservation à courte durée, le temps de la
            vérification ;
          </li>
          <li>
            Historique de campagnes SMS, traces de prospection téléphonique et
            statut « déjà contacté » / opposition : durée nécessaire pour
            éviter les relances marketing ;
          </li>
          <li>
            Facturation / paiements : durées légales comptables ;
          </li>
          <li>
            Cookies : selon la{" "}
            <Link href="/cookies">politique de cookies</Link>.
          </li>
          <li>
            Parcours des formulaires (étapes, adresse IP et brouillons de
            description) : 90 jours ;
          </li>
        </ul>
      </section>

      <section>
        <h2>8. Sécurité</h2>
        <p className="mt-3">
          Des mesures techniques et organisationnelles raisonnables sont mises
          en œuvre (contrôle d&apos;accès, mots de passe hashés, hash des codes
          OTP, hébergement sécurisé). Aucun système n&apos;est toutefois
          infaillible.
        </p>
      </section>

      <section>
        <h2>9. Vos droits</h2>
        <p className="mt-3">
          Conformément au RGPD, vous disposez des droits d&apos;accès,
          rectification, effacement, limitation, opposition, portabilité, et du
          droit de définir des directives relatives au sort de vos données après
          décès. Vous pouvez aussi retirer votre consentement aux cookies non
          essentiels à tout moment.
        </p>
        <p className="mt-3">
          Concernant la <strong>prospection SMS marketing</strong>, vous pouvez
          vous opposer à tout moment en répondant <strong>STOP</strong>{" "} au
          message reçu, ou en écrivant à{" "}
          <a href={`mailto:${LEGAL_PUBLISHER.email}`}>{LEGAL_PUBLISHER.email}</a>
          .
        </p>
        <p className="mt-3">
          Concernant la <strong>prospection par email</strong>, vous pouvez
          vous opposer via le lien de désinscription du message, ou en écrivant
          à{" "}
          <a href={`mailto:${LEGAL_PUBLISHER.email}`}>{LEGAL_PUBLISHER.email}</a>
          .
        </p>
        <p className="mt-3">
          Concernant la <strong>prospection téléphonique</strong>, vous pouvez
          vous opposer lors de l&apos;appel ou en écrivant à{" "}
          <a href={`mailto:${LEGAL_PUBLISHER.email}`}>{LEGAL_PUBLISHER.email}</a>
          . L&apos;exercice du droit d&apos;opposition n&apos;affecte pas la
          licéité du traitement effectué avant l&apos;opposition.
        </p>
        <p className="mt-3">
          Pour exercer vos droits :{" "}
          <a href={`mailto:${LEGAL_PUBLISHER.email}`}>{LEGAL_PUBLISHER.email}</a>
          . Vous pouvez introduire une réclamation auprès de la{" "}
          <a
            href="https://www.cnil.fr"
            rel="noopener noreferrer"
            target="_blank"
          >
            CNIL
          </a>
          .
        </p>
      </section>

      <section>
        <h2>10. Mineurs</h2>
        <p className="mt-3">
          Le Site n&apos;est pas destiné aux mineurs de moins de 15 ans. Si vous
          êtes parent et constatez une inscription, contactez-nous pour
          suppression.
        </p>
      </section>

      <section>
        <h2>11. Documents associés</h2>
        <ul>
          <li>
            <Link href="/mentions-legales">Mentions légales</Link>
          </li>
          <li>
            <Link href="/cgu">CGU</Link>
          </li>
          <li>
            <Link href="/cgv">CGV</Link>
          </li>
          <li>
            <Link href="/cookies">Politique de cookies</Link>
          </li>
        </ul>
      </section>
    </LegalDocument>
  );
}
