"use client";

import { useEffect, useState } from "react";
import { captureLandingTracking } from "@/lib/analytics-events";
import {
  persistAdsLandingFromSearch,
  readPersistedAdsLanding,
  workRequestHrefFromLanding,
} from "@/lib/ads-landing";
import { WORK_REQUEST_FORM_PATH } from "@/lib/work-request-form-path";

export function CaptureAdsLanding() {
  useEffect(() => {
    persistAdsLandingFromSearch(window.location.search);
    captureLandingTracking();
  }, []);
  return null;
}

export function useWorkRequestHref(extra?: { category?: string }) {
  const [href, setHref] = useState(() =>
    extra?.category
      ? `${WORK_REQUEST_FORM_PATH}?category=${encodeURIComponent(extra.category)}`
      : WORK_REQUEST_FORM_PATH
  );

  useEffect(() => {
    persistAdsLandingFromSearch(window.location.search);
    captureLandingTracking();
    setHref(workRequestHrefFromLanding(readPersistedAdsLanding(), extra));
  }, [extra?.category]);

  return href;
}
