import { redirect } from "next/navigation";
import ClientSidebar from "@/components/client/ClientSidebar";
import { getClientSession } from "@/lib/client-auth";
import { getClientById } from "@/lib/store";

export default async function ClientPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getClientSession();
  if (!session) {
    redirect("/particulier/espace/login");
  }

  const client = await getClientById(session.clientId);
  if (!client) {
    redirect("/particulier/espace/login");
  }

  return (
    <div className="flex min-h-screen">
      <ClientSidebar firstName={client.firstName} lastName={client.lastName} />
      <div className="flex-1 overflow-auto bg-slate-100">
        <div className="mx-auto max-w-6xl p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
