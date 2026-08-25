import AdminSectionNav from "@/components/admin/AdminSectionNav";

const TABS = [
  { href: "/admin/particuliers/comptes", label: "Comptes" },
  { href: "/admin/particuliers/demandes", label: "Demandes travaux" },
  { href: "/admin/particuliers/parcours", label: "Parcours formulaire" },
  { href: "/admin/particuliers/encheres", label: "Offres publiées" },
];

export default function AdminParticuliersLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div>
      <AdminSectionNav
        title="Particuliers & chantiers"
        description="Comptes clients, demandes de travaux, parcours des formulaires et offres publiées."
        tabs={TABS}
      />
      {children}
    </div>
  );
}
