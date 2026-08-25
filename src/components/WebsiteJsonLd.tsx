import { BRAND } from "@/lib/brand";

/** Google Site Name : à coller sur la page d’accueil (https://developers.google.com/search/docs/appearance/site-names). */
export default function WebsiteJsonLd() {
  const origin = BRAND.siteUrl.replace(/\/$/, "");
  const home = `${origin}/`;
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
        publisher: { "@id": `${home}#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${home}#organization`,
        name: BRAND.name,
        url: home,
        logo: `${origin}/ads-logo-1200.png`,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
