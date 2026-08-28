import { NextResponse } from "next/server";
import { BRAND } from "@/lib/brand";
import { listIndexedPublicOffers } from "@/lib/indexed-public-offers";
import {
  UNLOCK_PRICE_MAX_EUR,
  UNLOCK_PRICE_MIN_EUR,
} from "@/lib/pricing-tiers";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=120, s-maxage=120",
} as const;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/** Flux public des chantiers ouverts — sans nom, téléphone ni adresse. */
export async function GET() {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? BRAND.siteUrl).replace(
    /\/$/,
    ""
  );
  const offers = await listIndexedPublicOffers();

  return NextResponse.json(
    {
      name: BRAND.name,
      url: origin,
      description: BRAND.description,
      areaServed: ["59", "62"],
      unlockPriceRangeEur: {
        min: UNLOCK_PRICE_MIN_EUR,
        max: UNLOCK_PRICE_MAX_EUR,
      },
      offers,
    },
    { headers: CORS }
  );
}
