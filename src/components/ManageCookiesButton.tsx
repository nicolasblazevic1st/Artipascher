"use client";

import { openCookiePreferences } from "@/lib/cookie-consent";

export default function ManageCookiesButton({
  className = "hover:text-white",
}: {
  className?: string;
}) {
  return (
    <button type="button" onClick={openCookiePreferences} className={className}>
      Gérer les cookies
    </button>
  );
}
