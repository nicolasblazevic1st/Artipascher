"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  COOKIE_CONSENT_CHANGE_EVENT,
  readCookieConsent,
  type CookieConsentChoice,
} from "@/lib/cookie-consent";

const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-S1NP0RF6Y4";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function applyAnalyticsConsent(granted: boolean) {
  if (typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
  });
}

function sendPageView(url: string) {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: url,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/** Envoie un page_view à chaque navigation client (App Router). */
function GaPageViews({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!enabled) return;
    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    sendPageView(url);
  }, [enabled, pathname, searchParams]);

  return null;
}

export default function GoogleAnalytics() {
  const enableAnalytics =
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_GA_DEBUG === "true";

  const [consent, setConsent] = useState<CookieConsentChoice | null>(null);
  const [ready, setReady] = useState(false);
  const [gaReady, setGaReady] = useState(false);

  useEffect(() => {
    setConsent(readCookieConsent());
    setReady(true);

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsentChoice>).detail;
      applyAnalyticsConsent(detail.analytics);
      setConsent(detail);
      if (!detail.analytics) setGaReady(false);
    };

    window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, onChange);
    };
  }, []);

  if (!enableAnalytics || !ready || !consent?.analytics) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        onReady={() => setGaReady(true)}
      >
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('consent', 'default', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
          });
          gtag('config', '${GA_MEASUREMENT_ID}', {
            anonymize_ip: true,
            send_page_view: false
          });
        `}
      </Script>
      <Suspense fallback={null}>
        <GaPageViews enabled={gaReady} />
      </Suspense>
    </>
  );
}
