import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CaptureAdsLanding } from "@/components/CaptureAdsLanding";
import { getClientSession } from "@/lib/client-auth";
import { getProSession } from "@/lib/pro-auth";
import { getClientById, getProForSession } from "@/lib/store";

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [clientSession, proSession] = await Promise.all([
    getClientSession(),
    getProSession(),
  ]);
  const [client, pro] = await Promise.all([
    clientSession ? getClientById(clientSession.clientId) : null,
    proSession ? getProForSession(proSession) : null,
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <CaptureAdsLanding />
      <Header
        clientAccount={
          client
            ? {
                href: "/particulier/espace",
                label: "Mon espace",
                name: `${client.firstName} ${client.lastName}`.trim(),
                googleLinked: Boolean(client.googleSub),
                googlePictureUrl: client.googlePictureUrl,
              }
            : null
        }
        proAccount={
          pro
            ? {
                href: "/pro",
                label: "Espace Pro",
                name: pro.companyName,
                googleLinked: Boolean(pro.googleSub),
                googlePictureUrl: pro.googlePictureUrl,
              }
            : null
        }
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
