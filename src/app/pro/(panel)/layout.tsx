import { redirect } from "next/navigation";
import ProImpersonationBanner from "@/components/pro/ProImpersonationBanner";
import ProSidebar from "@/components/pro/ProSidebar";
import { getProSession } from "@/lib/pro-auth";
import { getProForSession } from "@/lib/store";

export default async function ProPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getProSession();
  if (!session) {
    redirect("/pro/login");
  }

  const pro = await getProForSession(session);

  if (!pro) {
    redirect("/pro/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {session.impersonatedByAdmin && (
        <ProImpersonationBanner companyName={pro.companyName} status={pro.status} />
      )}
      <div className="flex min-h-0 flex-1">
        <ProSidebar companyName={pro.companyName} />
        <div className="flex-1 overflow-auto bg-slate-100">
          <div className="mx-auto max-w-6xl p-6 sm:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
