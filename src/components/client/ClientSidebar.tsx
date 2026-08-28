"use client";

import Link from "next/link";
import { useState } from "react";
import { GoogleAccountAvatar } from "@/components/GoogleAccountAvatar";
import NotificationBell from "@/components/NotificationBell";
import ClientLogoutButton from "./ClientLogoutButton";

const NAV = [
  { href: "/particulier/espace", label: "Tableau de bord", icon: "📊" },
  { href: "/particulier/espace/demandes", label: "Mes demandes", icon: "🏠" },
  { href: "/particulier/espace/offres", label: "Mes offres", icon: "💶" },
];

export default function ClientSidebar({
  firstName,
  lastName,
  googleLinked = false,
  googlePictureUrl = null,
}: {
  firstName: string;
  lastName: string;
  googleLinked?: boolean;
  googlePictureUrl?: string | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-client-900 bg-client-800 px-4 py-3 text-white md:hidden">
        <Link href="/particulier/espace" className="min-w-0">
          <p className="truncate text-sm font-bold">Nord Artisan Pro</p>
          <p className="flex items-center gap-2 truncate text-xs text-client-200">
            {googleLinked ? (
              <GoogleAccountAvatar
                pictureUrl={googlePictureUrl}
                name={fullName}
                size={20}
              />
            ) : null}
            <span className="truncate">{fullName}</span>
          </p>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg border border-white/20 px-3 py-2 text-sm font-medium"
          aria-label="Ouvrir le menu"
          aria-expanded={mobileOpen}
        >
          Menu
        </button>
      </header>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/60 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer le menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] shrink-0 flex-col border-r border-client-900 bg-client-800 text-client-50 shadow-2xl transition-transform md:static md:z-auto md:w-56 md:max-w-none md:translate-x-0 md:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-client-900 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <Link
              href="/particulier/espace"
              className="block min-w-0"
              onClick={() => setMobileOpen(false)}
            >
              <p className="text-lg font-bold text-white">Nord Artisan Pro</p>
              <p className="text-xs text-client-200">Espace particulier</p>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-2 py-1 text-xl text-white/80 hover:bg-client-700 hover:text-white md:hidden"
              aria-label="Fermer le menu"
            >
              ×
            </button>
          </div>
          {googleLinked ? (
            <p className="mt-3 flex items-center gap-2 text-xs font-medium text-white">
              <GoogleAccountAvatar
                pictureUrl={googlePictureUrl}
                name={fullName}
                size={28}
              />
              <span className="min-w-0">
                <span className="block truncate">{fullName}</span>
                <span className="block text-[11px] font-normal text-client-200">
                  Connecté avec Google
                </span>
              </span>
            </p>
          ) : (
            <p className="mt-3 truncate text-xs font-medium text-white">
              {fullName}
            </p>
          )}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NotificationBell
            audience="client"
            listHref="/particulier/espace/notifications"
            accent="client"
          />
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-client-700 hover:text-white"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t border-client-900 p-3">
          <Link
            href="/particulier/espace/demandes/nouvelle"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm hover:bg-client-700 hover:text-white"
          >
            Nouvelle demande
          </Link>
          <Link
            href="/"
            className="block rounded-lg px-3 py-2 text-sm hover:bg-client-700 hover:text-white"
          >
            Voir le site public
          </Link>
          <ClientLogoutButton />
        </div>
      </aside>
    </>
  );
}
