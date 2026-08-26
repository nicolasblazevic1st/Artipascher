"use client";

import Link from "next/link";
import { useState } from "react";
import { useWorkRequestHref } from "@/components/CaptureAdsLanding";
import SiteLogo from "@/components/SiteLogo";
import WorkRequestCta from "@/components/WorkRequestCta";

const NAV_LINKS = [
  { href: "/particulier", label: "Particulier" },
  { href: "/professionnel", label: "Professionnel" },
  { href: "/offres", label: "Offres" },
  { href: "/comment-ca-marche", label: "Présentation" },
  { href: "/faq", label: "FAQ" },
];

const navLinkClass =
  "rounded-lg px-2 py-1.5 text-sm font-medium whitespace-nowrap text-gray-800 transition-colors hover:bg-gray-100 xl:px-3 xl:py-2 xl:text-base";

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </svg>
  );
}

function HammerIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" />
      <path d="m18 15 4-4" />
      <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 5h16" />
      <path d="M4 12h16" />
      <path d="M4 19h16" />
    </svg>
  );
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const formHref = useWorkRequestHref();

  return (
    <nav className="sticky top-0 z-50 bg-white text-gray-800 shadow-md">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex items-center justify-between py-2.5 sm:py-3">
          <SiteLogo />

          <button
            type="button"
            className="shrink-0 rounded-lg p-1.5 text-gray-800 transition-colors hover:bg-gray-100 sm:p-2 lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <MenuIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <div
            id="nav-menu"
            className="hidden min-w-0 shrink-0 items-center justify-end gap-1 xl:gap-2 lg:flex"
          >
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={navLinkClass}>
                {link.label}
              </Link>
            ))}

            <Link
              href="/particulier/espace/login"
              className="inline-flex h-9 items-center justify-center rounded-lg border-2 border-client-700 px-3 text-sm font-medium leading-none whitespace-nowrap text-client-800 transition-colors hover:bg-client-700 hover:text-white xl:h-10 xl:px-4 xl:text-base"
            >
              Mon espace
            </Link>

            <Link
              href="/pro/login"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border-2 border-gray-800 px-3 text-sm font-medium leading-none whitespace-nowrap text-gray-800 transition-colors hover:bg-gray-800 hover:text-white xl:h-10 xl:px-4 xl:text-base"
            >
              <BriefcaseIcon className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
              Espace Pro
            </Link>

            <WorkRequestCta
              placement="header"
              href={formHref}
              className="flex items-center gap-1.5 rounded-lg bg-accent-500 px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-accent-600 xl:px-4 xl:py-2 xl:text-base"
            >
              <HammerIcon className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
              <span>Remplir le formulaire</span>
            </WorkRequestCta>
          </div>
        </div>

        {mobileOpen && (
          <div
            id="mobile-menu"
            className="mt-2 border-t border-gray-200 pt-3 pb-3 lg:hidden"
          >
            <div className="flex flex-col gap-1.5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-gray-100"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <Link
                href="/particulier/espace/login"
                className="inline-flex h-10 items-center justify-center rounded-lg border-2 border-client-700 px-3 text-sm font-medium leading-none text-client-800 transition-colors hover:bg-client-700 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                Mon espace
              </Link>

              <Link
                href="/pro/login"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border-2 border-gray-800 px-3 text-sm font-medium leading-none text-gray-800 transition-colors hover:bg-gray-800 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                <BriefcaseIcon className="h-4 w-4" />
                Espace Pro
              </Link>

              <WorkRequestCta
                placement="header"
                href={formHref}
                className="flex items-center gap-2 rounded-lg bg-accent-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
                onClick={() => setMobileOpen(false)}
              >
                <HammerIcon className="h-4 w-4" />
                <span>Remplir le formulaire</span>
              </WorkRequestCta>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
