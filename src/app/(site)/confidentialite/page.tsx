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
            <strong>{LEGAL_PUBLISHER.brand}</strong> / {LEGAL_PUBLISHER.legalName}
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
            <strong>Compte Client</strong> : identité, email, téléphone
            (mobile), statut de vérification SMS, mot de passe (hashé), adresse
            de chantier, description et photos du projet, préférences (ex.
            ancienneté d&apos;entreprise souhaitée, alerte SMS contact),
            éventuel SIRET (société) ;
          </li>
          <li>
            <strong>Compte Professionnel</strong> : raison sociale, SIRET/SIREN,
            email, téléphone, documents (décennale, RC pro…), métiers,
            historique de déblocages et de solde ;
          </li>
          <li>
            <strong>Prospects acquisition</strong> : données d&apos;entreprises
            (SIRET, code NAF, ville, téléphone enrichi le cas échéant, sources
            publiques type annuaire / enrichissement) utilisées pour la
            prospection SMS et le suivi d&apos;opposition (STOP / déjà
            contacté) ;
          </li>
          <li>
            <strong>Campagnes SMS</strong> : historique des lots / envois
            (destinataires, statut, date), lien éventuel avec une offre
            publiée, et indicateurs d&apos;attribution (ex. inscription après
            SMS) ;
          </li>
          <li>
            <strong>Paiements</strong> : données de transaction via le
            prestataire de paiement (Stripe) — le Vendeur ne stocke pas le
            numéro complet de carte ;
          </li>
          <li>
            <strong>Technique</strong> : logs de connexion, cookies nécessaires,
            mesure d&apos;audience si consentement (voir{" "}
            <Link href="/cookies">politique de cookies</Link>) ;
          </li>
          <li>
            <strong>Communications</strong> : emails et SMS transactionnels
            (code de vérification, alertes de contact) et SMS marketing
            (invitation Professionnels / prospects).
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Finalités et bases légales</h2>
        <ul>
          <li>
            Exécution du contrat / mesures précontractuelles : création de
            compte, vérification du mobile Client, mise en relation, gestion des
            annonces, vente de solde, alertes de contact ;
          </li>
          <li>
            Intérêt légitime : sécurité, prévention de la fraude, amélioration
            du service, statistiques agrégées, prospection B2B d&apos;entreprises
            (SMS marketing manuels ou automatiques à la publication d&apos;une
            offre, avec possibilité d&apos;opposition STOP) ;
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
          (API). Expéditeur alphanumérique lorsque disponible (ex. NordArtPro).
        </p>
        <ul>
          <li>
            <strong>Transactionnels (Clients)</strong> : code de vérification
            du mobile ; alerte lorsqu&apos;un Artisan demande le contact. Ces
            messages sont liés au service ; ils peuvent ne pas comporter de
            clause STOP afin d&apos;éviter un désabonnement involontaire après
            un code ou une alerte ;
          </li>
          <li>
            <strong>Marketing (Professionnels / prospects)</strong> :
            information sur des chantiers et/ou invitation à s&apos;inscrire.
            Les campagnes peuvent être lancées manuellement ou{" "}
            <strong>automatiquement</strong> lorsqu&apos;une demande Client est
            validée et publiée comme offre. Elles peuvent être découpées en
            lots quotidiens jusqu&apos;à atteinte de l&apos;objectif de mise en
            relation (ex. 5 contacts) ;
          </li>
          <li>
            les SMS marketing comportent une mention <strong>STOP</strong> ;
            l&apos;opposition est prise en compte pour les prochains envois
            marketing. Envoi en principe limité à la fenêtre indicative des SMS
            commerciaux (lundi–samedi, 8h–20h, heure de Paris) ;
          </li>
          <li>
            un SIRET / numéro déjà contacté par SMS marketing n&apos;est en
            principe plus relancé par ce canal ;
          </li>
          <li>
            dès qu&apos;un envoi marketing est effectivement soumis à OVH, le
            message est pris en charge pour livraison (crédits OVH débités selon
            le contrat du prestataire). Une phase de préparation / validation
            interne peut précéder cet envoi réel.
          </li>
        </ul>
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
            email, SMS (OVH), paiement (Stripe), analytics (Google) si
            consentement ;
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
            Historique de campagnes SMS et statut « déjà contacté » : durée
            nécessaire pour éviter les relances marketing ;
          </li>
          <li>
            Facturation / paiements : durées légales comptables ;
          </li>
          <li>
            Cookies : selon la{" "}
            <Link href="/cookies">politique de cookies</Link>.
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
