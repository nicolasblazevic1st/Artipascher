"use client";

import Link from "next/link";
import { useState } from "react";
import NotificationBell from "@/components/NotificationBell";
import { formatUnlockPriceEur } from "@/lib/pricing-tiers";
import ProLogoutButton from "./ProLogoutButton";

const NAV = [
  { href: "/pro", label: "Tableau de bord", icon: "📊" },
  { href: "/pro/encheres", label: "Offres", icon: "🔨" },
  { href: "/pro/contacts", label: "Contacts", icon: "📞" },
  { href: "/pro/compte", label: "Mon compte", icon: "🏢" },
];

export default function ProSidebar({
  companyName,
  creditBalance,
}: {
  companyName: string;
  creditBalance: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);
  const low = creditBalance < 15;

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-brand-900 bg-brand-800 px-4 py-3 text-white md:hidden">
        <Link href="/pro" className="min-w-0">
          <p className="truncate text-sm font-bold">Nord Artisan Pro</p>
          <p className="truncate text-xs text-brand-200">{companyName}</p>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/pro/compte#credits"
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums ${
              low ? "bg-amber-500 text-amber-950" : "bg-brand-700 text-white"
            }`}
            title="Voir le solde résiduel"
          >
            {formatUnlockPriceEur(creditBalance)}
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
        </div>
      </header>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/60 md:hidden"
          onClick={close}
          aria-label="Fermer le menu"
        />
      )}

      <aside
        className={`w-72 max-w-[85vw] shrink-0 flex-col border-r border-brand-900 bg-brand-800 text-brand-100 md:static md:flex md:w-56 md:max-w-none ${
          mobileOpen
            ? "fixed inset-y-0 left-0 z-50 flex shadow-2xl md:shadow-none"
            : "hidden"
        }`}
      >
        <div className="border-b border-brand-900 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <Link href="/pro" className="block min-w-0" onClick={close}>
              <p className="text-lg font-bold text-white">Nord Artisan Pro</p>
              <p className="text-xs text-brand-200">Espace professionnel</p>
            </Link>
            <button
              type="button"
              onClick={close}
              className="rounded-lg px-2 py-1 text-xl text-white/80 hover:bg-brand-700 hover:text-white md:hidden"
              aria-label="Fermer le menu"
            >
              ×
            </button>
          </div>
          <p className="mt-3 truncate text-xs font-medium text-white">{companyName}</p>
          <Link
            href="/pro/compte#credits"
            onClick={close}
            className={`mt-3 flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 transition ${
              low
                ? "bg-amber-500 text-amber-950 hover:bg-amber-400"
                : "bg-brand-700 text-white hover:bg-brand-600"
            }`}
            title="Voir le solde résiduel"
          >
            <span className="text-xs font-medium opacity-90">Solde</span>
            <span className="text-lg font-bold tabular-nums leading-none">
              {formatUnlockPriceEur(creditBalance)}
            </span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NotificationBell
            audience="pro"
            listHref="/pro/notifications"
            accent="brand"
          />
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-brand-700 hover:text-white"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t border-brand-900 p-3">
          <Link
            href="/offres"
            onClick={close}
            className="block rounded-lg px-3 py-2 text-sm hover:bg-brand-700 hover:text-white"
          >
            Voir les chantiers publics
          </Link>
          <ProLogoutButton />
        </div>
      </aside>
    </>
  );
}
