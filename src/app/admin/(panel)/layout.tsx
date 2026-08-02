import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 overflow-auto bg-slate-100">
        <div className="mx-auto max-w-6xl p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
