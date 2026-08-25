import { NextRequest, NextResponse } from "next/server";
import {
  isBetaModeFromRequest,
  isProductionPublicHost,
  isStagingSite,
  normalizeHost,
} from "@/lib/beta";
import { isSmsConfigured, isDemoSmsAllowed } from "@/lib/sms";
import { version as appVersion } from "../../../../package.json";

/**
 * Diagnostic déploiement (pas de secret).
 * Ouvrir : https://dev.nord-artisan-pro.com/api/runtime-info
 */
export async function GET(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  return NextResponse.json({
    ok: true,
    host: normalizeHost(host),
    rawHost: host,
    xForwardedHost: request.headers.get("x-forwarded-host"),
    beta: isBetaModeFromRequest(request),
    isProductionHost: isProductionPublicHost(host),
    isStagingEnv: isStagingSite(),
    smsConfigured: isSmsConfigured(),
    smsDemoAllowed: isDemoSmsAllowed(),
    port: process.env.PORT ?? null,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    artipascherStaging: process.env.ARTIPASCHER_STAGING ?? null,
    betaModeEnv: process.env.BETA_MODE ?? null,
    nextPublicBeta: process.env.NEXT_PUBLIC_BETA_MODE ?? null,
    version: appVersion,
    buildId: process.env.ARTIPASCHER_BUILD_ID ?? null,
    cwd: process.cwd(),
  });
}
