"use client";

import type { ReactNode } from "react";
import BetaAwareLink from "@/components/BetaAwareLink";
import { useWorkRequestHref } from "@/components/CaptureAdsLanding";
import {
  persistAdsLandingFromSearch,
} from "@/lib/ads-landing";
import {
  ANALYTICS_EVENT,
  captureLandingTracking,
  trackEvent,
} from "@/lib/analytics-events";

export type WorkRequestCtaPlacement =
  | "header"
  | "home_hero"
  | "home_footer"
  | "home_category";

export default function WorkRequestCta({
  placement,
  category,
  href,
  className,
  children,
  onClick,
}: {
  placement: WorkRequestCtaPlacement;
  category?: string;
  href?: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const trackedHref = useWorkRequestHref(
    category ? { category } : undefined
  );

  function handleClick() {
    persistAdsLandingFromSearch(window.location.search);
    captureLandingTracking();
    trackEvent(ANALYTICS_EVENT.LEAD_CTA_CLICK, {
      form_name: "work_request",
      cta_placement: placement,
      ...(category ? { work_category: category } : {}),
    });
    onClick?.();
  }

  return (
    <BetaAwareLink
      href={href ?? trackedHref}
      className={className}
      onClick={handleClick}
      data-nap-cta="demande-travaux"
      data-nap-placement={placement}
    >
      {children}
    </BetaAwareLink>
  );
}
