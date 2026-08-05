import Link from "next/link";
import ClientLogoutButton from "./ClientLogoutButton";

const NAV = [
  { href: "/particulier/espace", label: "Tableau de bord", icon: "📊" },
  { href: "/particulier/espace/demandes", label: "Mes demandes", icon: "🏠" },
];

export default function ClientSidebar({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-client-900 bg-client-800 text-client-50">
      <div className="border-b border-client-900 px-5 py-5">
        <Link href="/particulier/espace" className="block">
          <p className="text-lg font-bold text-white">Artipascher</p>
          <p className="text-xs text-client-200">Espace particulier</p>
        </Link>
        <p className="mt-3 truncate text-xs font-medium text-white">
          {firstName} {lastName}
        </p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
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
  );
}
