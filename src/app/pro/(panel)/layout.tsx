import { redirect } from "next/navigation";
import ProSidebar from "@/components/pro/ProSidebar";
import { getProSession } from "@/lib/pro-auth";
import { getApprovedProById } from "@/lib/store";

export default async function ProPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getProSession();
  if (!session) {
    redirect("/pro/login");
  }

  const pro = await getApprovedProById(session.proId);
  if (!pro) {
    redirect("/pro/login");
  }

  return (
    <div className="flex min-h-screen">
      <ProSidebar companyName={pro.companyName} />
      <div className="flex-1 overflow-auto bg-slate-100">
        <div className="mx-auto max-w-6xl p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
