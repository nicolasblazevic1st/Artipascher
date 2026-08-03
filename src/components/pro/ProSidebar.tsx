import Link from "next/link";
import ProLogoutButton from "./ProLogoutButton";

const NAV = [
  { href: "/pro", label: "Tableau de bord", icon: "📊" },
  { href: "/pro/encheres", label: "Enchères actives", icon: "🔨" },
  { href: "/pro/mes-encheres", label: "Mes offres", icon: "📋" },
  { href: "/pro/mes-devis", label: "Mes devis", icon: "📄" },
  { href: "/pro/compte", label: "Mon compte", icon: "🏢" },
];

export default function ProSidebar({ companyName }: { companyName: string }) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-brand-900 bg-brand-800 text-brand-100">
      <div className="border-b border-brand-900 px-5 py-5">
        <Link href="/pro" className="block">
          <p className="text-lg font-bold text-white">Artipascher</p>
          <p className="text-xs text-brand-200">Espace professionnel</p>
        </Link>
        <p className="mt-3 truncate text-xs font-medium text-white">{companyName}</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-brand-700 hover:text-white"
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="space-y-2 border-t border-brand-900 p-3">
        <Link
          href="/encheres"
          className="block rounded-lg px-3 py-2 text-sm hover:bg-brand-700 hover:text-white"
        >
          Voir le site public
        </Link>
        <ProLogoutButton />
      </div>
    </aside>
  );
}
