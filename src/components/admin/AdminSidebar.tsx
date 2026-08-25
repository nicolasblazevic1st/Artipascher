"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import AdminLogoutButton from "./AdminLogoutButton";

type NavLink = { href: string; label: string };
type NavSection = { title: string; items: NavLink[] };

const SECTIONS: NavSection[] = [
  {
    title: "Général",
    items: [
      { href: "/admin", label: "Tableau de bord" },
      { href: "/admin/securite", label: "Sécurité" },
    ],
  },
  {
    title: "Artisans",
    items: [
      { href: "/admin/artisans/certification", label: "Certification" },
      { href: "/admin/artisans/comptes", label: "Comptes" },
      { href: "/admin/artisans/documents", label: "Documents" },
      { href: "/admin/artisans/test-documents", label: "Test OCR" },
    ],
  },
  {
    title: "Particuliers & chantiers",
    items: [
      { href: "/admin/particuliers/comptes", label: "Comptes" },
      { href: "/admin/particuliers/demandes", label: "Demandes travaux" },
      { href: "/admin/particuliers/parcours", label: "Parcours formulaire" },
      { href: "/admin/particuliers/encheres", label: "Offres publiées" },
    ],
  },
  {
    title: "Acquisition",
    items: [
      { href: "/admin/base-artisans", label: "Base artisans NPC" },
      { href: "/admin/bodacc", label: "BODACC procédures" },
      { href: "/admin/campagnes-sms", label: "Campagnes SMS" },
      { href: "/admin/conversions-sms", label: "Conversions SMS" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function currentLabel(pathname: string) {
  for (const section of SECTIONS) {
    for (const item of section.items) {
      if (isActive(pathname, item.href)) return item.label;
    }
  }
  return "Administration";
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 text-white md:hidden">
        <Link href="/admin" className="min-w-0">
          <p className="truncate text-sm font-bold">Nord Artisan Pro</p>
          <p className="truncate text-xs text-slate-400">{currentLabel(pathname)}</p>
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
          onClick={close}
          aria-label="Fermer le menu"
        />
      )}

      <aside
        className={`w-72 max-w-[85vw] shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-300 md:static md:flex md:w-56 md:max-w-none ${
          mobileOpen
            ? "fixed inset-y-0 left-0 z-50 flex shadow-2xl md:shadow-none"
            : "hidden"
        }`}
      >
        <div className="border-b border-slate-800 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <Link href="/admin" className="block min-w-0" onClick={close}>
              <p className="text-lg font-bold text-white">Nord Artisan Pro</p>
              <p className="text-xs text-slate-400">Administration</p>
            </Link>
            <button
              type="button"
              onClick={close}
              className="rounded-lg px-2 py-1 text-xl text-white/80 hover:bg-slate-800 hover:text-white md:hidden"
              aria-label="Fermer le menu"
            >
              ×
            </button>
          </div>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className={`block rounded-lg px-3 py-2 text-sm transition ${
                        active
                          ? "bg-brand-700 font-medium text-white"
                          : "hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="space-y-2 border-t border-slate-800 p-3">
          <Link
            href="/"
            onClick={close}
            className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-800 hover:text-white"
          >
            ← Site public
          </Link>
          <AdminLogoutButton />
        </div>
      </aside>
    </>
  );
}
