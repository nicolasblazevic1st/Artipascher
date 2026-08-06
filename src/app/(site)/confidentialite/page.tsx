import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/LegalDocument";
import { LEGAL_HOST, LEGAL_PUBLISHER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité et protection des données personnelles — Artipascher.",
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
            <strong>Compte Client</strong> : identité, email, téléphone,
            mot de passe (hashé), adresse de chantier, description et photos du
            projet, éventuel SIRET (société) ;
          </li>
          <li>
            <strong>Compte Professionnel</strong> : raison sociale, SIRET/SIREN,
            email, téléphone, documents (KBIS, décennale, RC pro…), métiers,
            historique d&apos;enchères et de crédits ;
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
            <strong>Communications</strong> : emails transactionnels, éventuels
            SMS liés au service.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Finalités et bases légales</h2>
        <ul>
          <li>
            Exécution du contrat / mesures précontractuelles : création de
            compte, mise en relation, gestion des enchères, vente de crédits ;
          </li>
          <li>
            Intérêt légitime : sécurité, prévention de la fraude, amélioration
            du service, statistiques agrégées ;
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
        <h2>4. Destinataires</h2>
        <p className="mt-3">Les données peuvent être communiquées :</p>
        <ul>
          <li>
            aux Artisans / Clients dans la stricte mesure nécessaire à la mise
            en relation (ex. coordonnées après déblocage ou acceptation) ;
          </li>
          <li>
            aux sous-traitants techniques : hébergeur ({LEGAL_HOST.name}),
            email, SMS, paiement (Stripe), analytics (Google) si consentement ;
          </li>
          <li>
            aux autorités compétentes sur réquisition légale.
          </li>
        </ul>
        <p className="mt-3">
          Les données ne sont pas vendues à des tiers à des fins commerciales.
        </p>
      </section>

      <section>
        <h2>5. Transferts hors UE</h2>
        <p className="mt-3">
          L&apos;hébergement applicatif principal est situé en France (OVH).
          Certains sous-traitants (paiement, analytics) peuvent impliquer des
          traitements hors UE encadrés par des garanties appropriées (clauses
          contractuelles types, etc.).
        </p>
      </section>

      <section>
        <h2>6. Durées de conservation</h2>
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
            Facturation / paiements : durées légales comptables ;
          </li>
          <li>
            Cookies : selon la{" "}
            <Link href="/cookies">politique de cookies</Link>.
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Sécurité</h2>
        <p className="mt-3">
          Des mesures techniques et organisationnelles raisonnables sont mises
          en œuvre (contrôle d&apos;accès, mots de passe hashés, hébergement
          sécurisé). Aucun système n&apos;est toutefois infaillible.
        </p>
      </section>

      <section>
        <h2>8. Vos droits</h2>
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
        <h2>9. Mineurs</h2>
        <p className="mt-3">
          Le Site n&apos;est pas destiné aux mineurs de moins de 15 ans. Si vous
          êtes parent et constatez une inscription, contactez-nous pour
          suppression.
        </p>
      </section>

      <section>
        <h2>10. Documents associés</h2>
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
