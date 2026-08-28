import { BRAND } from "@/lib/brand";
import JsonLd from "@/components/JsonLd";

const NORD = {
  "@type": "AdministrativeArea",
  name: "Nord",
  identifier: "FR-59",
} as const;

const PAS_DE_CALAIS = {
  "@type": "AdministrativeArea",
  name: "Pas-de-Calais",
  identifier: "FR-62",
} as const;

/** Site + organisation : zone 59/62, sans adresse de siège inventée. */
export default function WebsiteJsonLd() {
  const origin = BRAND.siteUrl.replace(/\/$/, "");
  const home = `${origin}/`;
  const orgId = `${home}#organization`;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${home}#website`,
        name: BRAND.name,
        alternateName: [BRAND.smsSender, BRAND.domain],
        url: home,
        inLanguage: "fr-FR",
        description: BRAND.description,
        publisher: { "@id": orgId },
      },
      {
        "@type": "Organization",
        "@id": orgId,
        name: BRAND.name,
        url: home,
        email: BRAND.emailContact,
        logo: `${origin}/ads-logo-1200.png`,
        description: BRAND.description,
        areaServed: [NORD, PAS_DE_CALAIS],
        address: {
          "@type": "PostalAddress",
          addressRegion: "Hauts-de-France",
          addressCountry: "FR",
        },
        knowsAbout: [
          "Travaux du bâtiment",
          "Artisans vérifiés RCS",
          "Nord-Pas-de-Calais",
        ],
      },
      {
        "@type": "Service",
        "@id": `${home}#service`,
        name: "Mise en relation particuliers et artisans vérifiés",
        serviceType: "Mise en relation BTP",
        provider: { "@id": orgId },
        areaServed: [NORD, PAS_DE_CALAIS],
        audience: {
          "@type": "Audience",
          geographicArea: [NORD, PAS_DE_CALAIS],
        },
        offers: {
          "@type": "Offer",
          name: "Publication d’une demande de travaux",
          price: 0,
          priceCurrency: "EUR",
          description:
            "Gratuit pour le particulier. L’artisan paie le déblocage du contact.",
        },
      },
    ],
  };

  return <JsonLd data={data} />;
}
