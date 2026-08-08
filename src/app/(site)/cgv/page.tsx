import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/LegalDocument";
import { BID_FEE_EUR } from "@/lib/auctions";
import { UNLOCK_PRICE_EUR } from "@/lib/client-contacts";
import { LEGAL_PUBLISHER } from "@/lib/legal";
import { CREDIT_PACKS, CREDIT_PRICE_EUR } from "@/lib/store-types";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description:
    "Conditions générales de vente des crédits Artipascher destinés aux professionnels.",
};

export default function CgvPage() {
  const packs = CREDIT_PACKS.join(", ");

  return (
    <LegalDocument title="Conditions générales de vente (CGV)">
      <section>
        <h2>1. Objet et champ d&apos;application</h2>
        <p className="mt-3">
          Les présentes Conditions générales de vente (ci-après « CGV »)
          s&apos;appliquent à la vente, par {LEGAL_PUBLISHER.brand} /{" "}
          {LEGAL_PUBLISHER.legalName} (ci-après « le Vendeur »), de{" "}
          <strong>crédits numériques</strong> permettant aux Professionnels
          d&apos;utiliser certains services payants de la plateforme Artipascher
          (ci-après « la Plateforme »).
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
          Le Vendeur commercialise des crédits utilisables sur la Plateforme.
          Sauf indication contraire affichée au moment de l&apos;achat :
        </p>
        <ul>
          <li>
            <strong>1 crédit = {CREDIT_PRICE_EUR}&nbsp;€</strong> TTC ou HT
            selon le régime fiscal applicable affiché lors du paiement ;
          </li>
          <li>
            packs proposés : <strong>{packs}</strong> crédits (sous réserve de
            disponibilité) ;
          </li>
          <li>
            usages typiques (tarifs unitaires de référence) :
            <ul>
              <li>
                déblocage des coordonnées d&apos;un Client :{" "}
                {UNLOCK_PRICE_EUR}&nbsp;€ / {UNLOCK_PRICE_EUR} crédit ;
              </li>
              <li>
                dépôt d&apos;une enchère : {BID_FEE_EUR}&nbsp;€ / {BID_FEE_EUR}{" "}
                crédit.
              </li>
            </ul>
          </li>
        </ul>
        <p className="mt-3">
          Les crédits n&apos;ont pas de valeur monétaire hors Plateforme, ne
          sont pas remboursables en espèces (sauf obligation légale) et ne
          constituent pas un instrument de paiement au sens du droit bancaire.
        </p>
      </section>

      <section>
        <h2>2 bis. Nature du service payant</h2>
        <p className="mt-3">
          Le crédit consommé pour un <strong>déblocage</strong> donne accès aux{" "}
          <strong>coordonnées</strong> d&apos;un Client ayant autorisé le
          contact (acceptation manuelle ou option d&apos;alerte SMS avec
          acceptation automatique, dans la limite prévue aux CGU).
        </p>
        <p className="mt-3">
          <strong>Ne sont pas garantis</strong> : une réponse du Client, un
          devis signé, un chantier, ni un volume minimal d&apos;offres à
          proximité du Professionnel. Les crédits permettent l&apos;accès à des
          fonctionnalités de la Plateforme, non la vente d&apos;un résultat
          commercial.
        </p>
      </section>

      <section>
        <h2>3. Commande et paiement</h2>
        <p className="mt-3">
          La commande de crédits s&apos;effectue depuis l&apos;espace
          Professionnel, via un prestataire de paiement (notamment Stripe). Le
          Professionnel garantit disposer des autorisations nécessaires pour
          utiliser le moyen de paiement choisi.
        </p>
        <p className="mt-3">
          La vente est ferme dès confirmation du paiement réussi et crédit du
          solde sur le compte Professionnel. Une confirmation peut être adressée
          par email et/ou affichée dans l&apos;espace compte.
        </p>
      </section>

      <section>
        <h2>4. Prix et facturation</h2>
        <p className="mt-3">
          Les prix sont indiqués sur la Plateforme au moment de l&apos;achat.
          Le Vendeur se réserve le droit de modifier ses tarifs à tout moment ;
          les commandes en cours restent soumises au prix affiché lors de la
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
          Les crédits sont crédités sur le compte Professionnel après validation
          du paiement. L&apos;exécution est immédiate ou quasi immédiate sous
          réserve du bon fonctionnement des systèmes de paiement et de la
          Plateforme.
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
          Les crédits ne donnent lieu à aucun remboursement, sauf{" "}
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
          Le Vendeur peut, à titre commercial et sans obligation générale,
          recréditer un crédit dans certains cas (ex. désengagement du Client
          après déblocage). En cas d&apos;erreur de paiement manifeste, le
          Professionnel contacte{" "}
          <a href={`mailto:${LEGAL_PUBLISHER.email}`}>{LEGAL_PUBLISHER.email}</a>{" "}
          avec les justificatifs.
        </p>
      </section>

      <section>
        <h2>8. Durée de validité des crédits</h2>
        <p className="mt-3">
          Sauf mention contraire sur la Plateforme, les crédits n&apos;ont pas
          de date d&apos;expiration automatique. L&apos;Éditeur se réserve
          toutefois le droit, après information préalable raisonnable, de fixer
          une durée de validité ou de procéder à une clôture de service
          entraînant la perte des crédits non utilisés, dans le respect du droit
          applicable.
        </p>
      </section>

      <section>
        <h2>9. Responsabilité</h2>
        <p className="mt-3">
          La responsabilité du Vendeur au titre des présentes CGV est limitée au
          montant des crédits concernés par le litige, hors dommages indirects,
          dans les limites autorisées par la loi. Le Vendeur n&apos;est pas
          responsable des litiges relatifs aux travaux réalisés entre Client et
          Artisan, ni du volume d&apos;opportunités disponibles pour un
          Professionnel.
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
