import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/LegalDocument";
import { LEGAL_HOST, LEGAL_PUBLISHER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Mentions légales",
  description:
    "Mentions légales du site Artipascher — éditeur, hébergeur et contacts.",
};

export default function MentionsLegalesPage() {
  return (
    <LegalDocument title="Mentions légales">
      <section>
        <h2>1. Éditeur du site</h2>
        <p className="mt-3">
          Le site <strong>{LEGAL_PUBLISHER.siteUrl.replace("https://", "")}</strong>{" "}
          (ci-après « le Site ») est édité par :
        </p>
        <ul>
          <li>
            <strong>Nom commercial :</strong> {LEGAL_PUBLISHER.brand}
          </li>
          <li>
            <strong>Dénomination sociale :</strong> {LEGAL_PUBLISHER.legalName}
          </li>
          <li>
            <strong>Forme juridique :</strong> {LEGAL_PUBLISHER.legalForm}
          </li>
          <li>
            <strong>Capital social :</strong> {LEGAL_PUBLISHER.shareCapital}
          </li>
          <li>
            <strong>SIRET :</strong> {LEGAL_PUBLISHER.siret}
          </li>
          <li>
            <strong>Immatriculation :</strong> {LEGAL_PUBLISHER.rcs}
          </li>
          <li>
            <strong>Siège / adresse :</strong> {LEGAL_PUBLISHER.address}
          </li>
          <li>
            <strong>Email :</strong>{" "}
            <a href={`mailto:${LEGAL_PUBLISHER.email}`}>{LEGAL_PUBLISHER.email}</a>
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Directeur de la publication</h2>
        <p className="mt-3">
          Le directeur de la publication est :{" "}
          <strong>{LEGAL_PUBLISHER.publicationDirector}</strong>.
        </p>
      </section>

      <section>
        <h2>3. Hébergement</h2>
        <p className="mt-3">Le Site est hébergé par :</p>
        <ul>
          <li>
            <strong>Hébergeur :</strong> {LEGAL_HOST.name}
          </li>
          <li>
            <strong>Adresse :</strong> {LEGAL_HOST.address}
          </li>
          <li>
            <strong>SIRET :</strong> {LEGAL_HOST.siret}
          </li>
          <li>
            <strong>Téléphone :</strong> {LEGAL_HOST.phone}
          </li>
          <li>
            <strong>Site :</strong>{" "}
            <a href={LEGAL_HOST.website} rel="noopener noreferrer" target="_blank">
              {LEGAL_HOST.website}
            </a>
          </li>
        </ul>
        <p className="mt-3">
          Les données applicatives sont hébergées dans un datacenter situé en
          France (Nord).
        </p>
      </section>

      <section>
        <h2>4. Nature du service</h2>
        <p className="mt-3">
          Artipascher est une plateforme numérique de mise en relation entre
          particuliers (ou clients professionnels) et artisans du bâtiment
          inscrits au registre du commerce, opérant principalement dans les
          départements du Nord (59) et du Pas-de-Calais (62), via la
          publication d&apos;annonces et le déblocage de contacts.
        </p>
        <p className="mt-3">
          Artipascher agit en qualité d&apos;<strong>intermédiaire technique</strong>{" "}
          et ne réalise pas les travaux. Le contrat de travaux et le paiement du
          chantier sont conclus directement entre le client et l&apos;artisan
          retenu, hors de la plateforme.
        </p>
      </section>

      <section>
        <h2>5. Propriété intellectuelle</h2>
        <p className="mt-3">
          L&apos;ensemble des éléments du Site (textes, graphismes, logos,
          structure, logiciels) est protégé par le droit de la propriété
          intellectuelle. Toute reproduction non autorisée est interdite.
        </p>
      </section>

      <section>
        <h2>6. Documents contractuels</h2>
        <ul>
          <li>
            <Link href="/cgu">Conditions générales d&apos;utilisation (CGU)</Link>
          </li>
          <li>
            <Link href="/cgv">Conditions générales de vente (CGV)</Link> — vente
            de solde aux professionnels
          </li>
          <li>
            <Link href="/confidentialite">Politique de confidentialité</Link>
          </li>
          <li>
            <Link href="/cookies">Politique de cookies</Link>
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Contact</h2>
        <p className="mt-3">
          Pour toute question relative au Site :{" "}
          <a href={`mailto:${LEGAL_PUBLISHER.email}`}>{LEGAL_PUBLISHER.email}</a>.
        </p>
      </section>
    </LegalDocument>
  );
}
