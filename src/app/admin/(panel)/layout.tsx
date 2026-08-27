import AdminSidebar from "@/components/admin/AdminSidebar";
import { rememberAdminAccessIp } from "@/lib/admin-known-ips";
import {
  getClientIpFromHeaders,
  normalizeStoredClientIp,
} from "@/lib/request-client";
import { headers } from "next/headers";

export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const ip = normalizeStoredClientIp(
    getClientIpFromHeaders(await headers())
  );
  if (ip) await rememberAdminAccessIp(ip);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <AdminSidebar />
        <div className="min-w-0 flex-1 overflow-auto bg-slate-100">
          <div className="mx-auto max-w-6xl p-4 sm:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
