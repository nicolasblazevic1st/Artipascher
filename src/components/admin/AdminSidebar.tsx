"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
      { href: "/admin/artisans/devis", label: "Devis" },
    ],
  },
  {
    title: "Particuliers & chantiers",
    items: [
      { href: "/admin/particuliers/comptes", label: "Comptes" },
      { href: "/admin/particuliers/demandes", label: "Demandes travaux" },
      { href: "/admin/particuliers/encheres", label: "Enchères" },
    ],
  },
  {
    title: "Acquisition",
    items: [
      { href: "/admin/base-artisans", label: "Base artisans NPC" },
      { href: "/admin/campagnes-sms", label: "Campagnes SMS" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-300">
      <div className="border-b border-slate-800 px-5 py-5">
        <Link href="/admin" className="block">
          <p className="text-lg font-bold text-white">Artipascher</p>
          <p className="text-xs text-slate-400">Administration</p>
        </Link>
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
          className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-800 hover:text-white"
        >
          ← Site public
        </Link>
        <AdminLogoutButton />
      </div>
    </aside>
  );
}
