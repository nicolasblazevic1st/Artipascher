import AdminSectionNav from "@/components/admin/AdminSectionNav";

const TABS = [
  { href: "/admin/artisans/certification", label: "Certification" },
  { href: "/admin/artisans/comptes", label: "Comptes" },
  { href: "/admin/artisans/documents", label: "Documents" },
  { href: "/admin/artisans/test-documents", label: "Test OCR" },
];

export default function AdminArtisansLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div>
      <AdminSectionNav
        title="Artisans"
        description="Certification, comptes et documents transmis."
        tabs={TABS}
      />
      {children}
    </div>
  );
}
