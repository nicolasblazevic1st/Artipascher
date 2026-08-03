import Link from "next/link";
import AdminLogoutButton from "./AdminLogoutButton";

const NAV = [
  { href: "/admin", label: "Tableau de bord", icon: "📊" },
  { href: "/admin/professionnels", label: "Artisans", icon: "👷" },
  { href: "/admin/demandes", label: "Demandes travaux", icon: "📋" },
  { href: "/admin/devis", label: "Devis à modérer", icon: "📄" },
  { href: "/admin/encheres", label: "Enchères", icon: "🔨" },
];

export default function AdminSidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-300">
      <div className="border-b border-slate-800 px-5 py-5">
        <Link href="/admin" className="block">
          <p className="text-lg font-bold text-white">Artipascher</p>
          <p className="text-xs text-slate-400">Administration</p>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-slate-800 hover:text-white"
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
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
