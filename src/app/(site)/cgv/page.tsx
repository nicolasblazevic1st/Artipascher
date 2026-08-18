import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/LegalDocument";
import { LEGAL_PUBLISHER } from "@/lib/legal";
import { CONTACT_UNLOCK_REF_EUR } from "@/lib/store-types";
import { PRICING_TIERS } from "@/lib/pricing-tiers";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description:
    "Conditions générales de vente des mises en contact Nord Artisan Pro destinées aux professionnels.",
};

export default function CgvPage() {
  return (
    <LegalDocument title="Conditions générales de vente (CGV)">
      <section>
        <h2>1. Objet et champ d&apos;application</h2>
        <p className="mt-3">
          Les présentes Conditions générales de vente (ci-après « CGV »)
          s&apos;appliquent à la vente, par {LEGAL_PUBLISHER.brand} /{" "}
          {LEGAL_PUBLISHER.legalName} (ci-après « le Vendeur »), de{" "}
          <strong>mises en contact</strong> (déblocage des coordonnées Client)
          permettant aux Professionnels d&apos;utiliser le service payant de la
          plateforme Nord Artisan Pro (ci-après « la Plateforme »).
        </p>
        <p className="mt-3">
          Les CGV s&apos;adressent exclusivement aux{" "}
          <strong>professionnels</strong> (B2B) agissant dans le cadre de leur
          activité. Elles ne régissent pas le contrat de travaux entre Client et
          Artisan, lequel est hors Plateforme.
        </p>
        <p className="mt-3">
          L&apos;utilisation générale du Site est également soumise aux{" "}
          <Link href="/cgu">CGU</Link>.
        </p>
      </section>

      <section>
        <h2>2. Produits / services vendus</h2>
        <p className="mt-3">
          Le Vendeur commercialise des{" "}
          <strong>mises en contact à l&apos;unité</strong>, payées au moment du
          déblocage. Sauf indication contraire affichée sur la Plateforme :
        </p>
        <ul>
          <li>
            le tarif unitaire de référence pour une mise en contact typique est
            de <strong>{CONTACT_UNLOCK_REF_EUR}&nbsp;€</strong> (TTC ou HT selon
            le régime fiscal affiché lors du paiement) ;
          </li>
          <li>
            le prix exact débité correspond au{" "}
            <strong>ticket du chantier</strong> affiché avant paiement :{" "}
            {PRICING_TIERS.map((t) => `${t.unlockPriceEur}\u00a0€`).join(" / ")}{" "}
            ;
          </li>
          <li>
            <strong>aucun pack</strong> ni forfait de solde prépayé n&apos;est
            proposé à l&apos;achat. Un solde résiduel éventuellement présent sur
            le compte (remboursement, ancien crédit) peut être
            utilisé en priorité pour un déblocage si son montant est suffisant.
          </li>
        </ul>
        <p className="mt-3">
          La mise en contact n&apos;a pas de valeur monétaire hors Plateforme,
          n&apos;est pas remboursable en espèces (sauf obligation légale) et ne
          constitue pas un instrument de paiement au sens du droit bancaire.
        </p>
      </section>

      <section>
        <h2>2 bis. Nature du service payant</h2>
        <p className="mt-3">
          Le montant payé pour un <strong>déblocage</strong> donne accès aux{" "}
          <strong>coordonnées</strong> d&apos;un Client ayant autorisé le
          contact (acceptation manuelle ou option d&apos;alerte SMS avec
          acceptation automatique, dans la limite prévue aux CGU).
        </p>
        <p className="mt-3">
          <strong>Ne sont pas garantis</strong> : une réponse du Client, un
          devis signé, un chantier, ni un volume minimal d&apos;offres à
          proximité du Professionnel. Le paiement donne accès à une
          fonctionnalité de la Plateforme, non la vente d&apos;un résultat
          commercial.
        </p>
      </section>

      <section>
        <h2>3. Commande et paiement</h2>
        <p className="mt-3">
          La commande s&apos;effectue depuis l&apos;espace Professionnel, au
          moment du déblocage d&apos;un contact, via un prestataire de paiement
          (notamment Stripe). Le Professionnel garantit disposer des
          autorisations nécessaires pour utiliser le moyen de paiement choisi.
        </p>
        <p className="mt-3">
          La vente est ferme dès confirmation du paiement réussi et mise à
          disposition des coordonnées. Une confirmation peut être adressée par
          email et/ou affichée dans l&apos;espace compte. L&apos;accès au
          service suppose un compte Professionnel{" "}
          <strong>préalablement vérifié</strong> à l&apos;inscription (registre,
          BODACC, attestations RC pro et garantie adaptée aux activités —
          voir CGU).
        </p>
      </section>

      <section>
        <h2>4. Prix et facturation</h2>
        <p className="mt-3">
          Les prix sont indiqués sur la Plateforme au moment du paiement. Le
          Vendeur se réserve le droit de modifier ses tarifs à tout moment ; les
          commandes en cours restent soumises au prix affiché lors de la
          validation du paiement.
        </p>
        <p className="mt-3">
          Une facture ou un justificatif de paiement est mis à disposition selon
          les modalités techniques du Vendeur et/ou du prestataire de paiement.
          Mentions fiscales du Vendeur : SIRET {LEGAL_PUBLISHER.siret} —{" "}
          {LEGAL_PUBLISHER.address}.
        </p>
      </section>

      <section>
        <h2>5. Exécution du service</h2>
        <p className="mt-3">
          Les coordonnées Client sont mises à disposition après validation du
          paiement (ou après débit d&apos;un solde résiduel suffisant).
          L&apos;exécution est immédiate ou quasi immédiate sous réserve du bon
          fonctionnement des systèmes de paiement et de la Plateforme, et sous
          réserve que des places de contact restent disponibles.
        </p>
      </section>

      <section>
        <h2>6. Absence de droit de rétractation (B2B)</h2>
        <p className="mt-3">
          Les présentes ventes étant conclues entre professionnels, le droit de
          rétractation prévu au profit des consommateurs ne s&apos;applique pas.
        </p>
        <p className="mt-3">
          Si, exceptionnellement, un acheteur agissait à titre de consommateur,
          il est informé que, pour les contenus numériques fournis immédiatement
          et dont l&apos;exécution a commencé avec son accord exprès, le droit
          de rétractation peut être perdu conformément au Code de la
          consommation.
        </p>
      </section>

      <section>
        <h2>7. Remboursements</h2>
        <p className="mt-3">
          Le paiement d&apos;une mise en contact ne donne lieu à aucun
          remboursement, sauf{" "}
          <strong>dysfonctionnement imputable au Vendeur</strong> (par exemple
          impossibilité technique d&apos;accéder aux coordonnées après
          déblocage, ou coordonnées manifestement invalides du fait de la
          Plateforme).
        </p>
        <p className="mt-3">
          L&apos;absence de réponse du Client, l&apos;absence d&apos;offres dans
          une zone géographique, ou le refus ultérieur de travaux{" "}
          <strong>ne constituent pas</strong> un motif de remboursement.
        </p>
        <p className="mt-3">
          Le déblocage des coordonnées constitue le service livré : l&apos;absence
          de suite donnée par le Client n&apos;ouvre pas de droit à remboursement
          automatique. En cas d&apos;erreur de paiement manifeste ou de
          dysfonctionnement technique, le Professionnel contacte{" "}
          <a href={`mailto:${LEGAL_PUBLISHER.email}`}>{LEGAL_PUBLISHER.email}</a>{" "}
          avec les justificatifs.
        </p>
      </section>

      <section>
        <h2>8. Solde résiduel</h2>
        <p className="mt-3">
          Un éventuel solde résiduel sur le compte Professionnel (notamment
          remboursement ou ancien crédit) n&apos;a pas de date d&apos;expiration
          automatique, sauf mention contraire. L&apos;Éditeur se réserve
          toutefois le droit, après information préalable raisonnable, de fixer
          une durée de validité ou de procéder à une clôture de service
          entraînant la perte du solde non utilisé, dans le respect du droit
          applicable. Ce solde n&apos;est pas remboursable en espèces (sauf
          obligation légale).
        </p>
      </section>

      <section>
        <h2>9. Responsabilité</h2>
        <p className="mt-3">
          La responsabilité du Vendeur au titre des présentes CGV est limitée au
          montant de la mise en contact concernée par le litige, hors dommages
          indirects, dans les limites autorisées par la loi. Le Vendeur
          n&apos;est pas responsable des litiges relatifs aux travaux réalisés
          entre Client et Artisan, ni du volume d&apos;opportunités disponibles
          pour un Professionnel.
        </p>
      </section>

      <section>
        <h2>10. Données personnelles</h2>
        <p className="mt-3">
          Les données liées au paiement sont traitées par le Vendeur et ses
          sous-traitants (notamment Stripe) pour l&apos;exécution de la vente,
          la facturation et la lutte contre la fraude. Contact :{" "}
          <a href={`mailto:${LEGAL_PUBLISHER.email}`}>{LEGAL_PUBLISHER.email}</a>.
        </p>
      </section>

      <section>
        <h2>11. Modification des CGV</h2>
        <p className="mt-3">
          Le Vendeur peut modifier les présentes CGV. La version applicable à
          une commande est celle en vigueur au moment du paiement.
        </p>
      </section>

      <section>
        <h2>12. Droit applicable et litiges</h2>
        <p className="mt-3">
          Les présentes CGV sont soumises au droit français. Les litiges entre
          professionnels relèvent des tribunaux compétents du ressort du siège
          du Vendeur, sous réserve de règles d&apos;ordre public contraires.
        </p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p className="mt-3">
          <a href={`mailto:${LEGAL_PUBLISHER.email}`}>{LEGAL_PUBLISHER.email}</a>
          {" · "}
          <Link href="/mentions-legales">Mentions légales</Link>
          {" · "}
          <Link href="/cgu">CGU</Link>
        </p>
      </section>
    </LegalDocument>
  );
}
