import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CaptureAdsLanding } from "@/components/CaptureAdsLanding";

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <CaptureAdsLanding />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
