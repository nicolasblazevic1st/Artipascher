import JsonLd from "@/components/JsonLd";
import { BRAND } from "@/lib/brand";

type Props = {
  name: string;
  url: string;
  category: string;
  city: string;
  department: "59" | "62";
  unlockPriceEur: number;
  slotsTaken: number;
  slotsMax: number;
  status: "active" | "ended";
  publishedAt?: string;
};

/** Offre publique : métier, ville, prix de déblocage. Pas de PII client. */
export default function OfferJsonLd({
  name,
  url,
  category,
  city,
  department,
  unlockPriceEur,
  slotsTaken,
  slotsMax,
  status,
  publishedAt,
}: Props) {
  const origin = BRAND.siteUrl.replace(/\/$/, "");
  const availability =
    status === "ended" || slotsTaken >= slotsMax
      ? "https://schema.org/SoldOut"
      : "https://schema.org/InStock";

  const data = {
    "@context": "https://schema.org",
    "@type": "Offer",
    name,
    url,
    category,
    price: unlockPriceEur,
    priceCurrency: "EUR",
    availability,
    validFrom: publishedAt,
    description: `${category} à ${city} (${department}). Mise en relation avec des artisans vérifiés RCS. Déblocage du contact ${unlockPriceEur} € TTC, ${slotsTaken}/${slotsMax} places prises.`,
    areaServed: {
      "@type": "City",
      name: city,
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: department === "59" ? "Nord" : "Pas-de-Calais",
        identifier: department === "59" ? "FR-59" : "FR-62",
      },
    },
    seller: {
      "@type": "Organization",
      name: BRAND.name,
      url: `${origin}/`,
    },
  };

  return <JsonLd data={data} />;
}
