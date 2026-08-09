import type { Metadata } from "next";
import BetaBanner from "@/components/BetaBanner";
import { BetaModeProvider } from "@/components/BetaModeProvider";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { getIsBetaMode } from "@/lib/beta-server";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const buildId = process.env.ARTIPASCHER_BUILD_ID ?? "unknown";
  const staging =
    process.env.ARTIPASCHER_STAGING === "1" ||
    process.env.NEXT_PUBLIC_ARTIPASCHER_STAGING === "1";

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
    ),
    title: {
      default: "Artipascher — Travaux & artisans vérifiés Nord 59/62",
      template: "%s | Artipascher",
    },
    description:
      "Publiez votre demande de travaux dans le Nord-Pas-de-Calais. Des artisans vérifiés débloquent vos coordonnées pour vous contacter.",
    icons: {
      icon: [
        { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
        { url: "/icon.png", type: "image/png", sizes: "512x512" },
        { url: "/brand-icon.svg", type: "image/svg+xml" },
      ],
      shortcut: "/favicon-48.png",
      apple: "/apple-icon.png",
    },
    manifest: "/site.webmanifest",
    openGraph: {
      siteName: "Artipascher",
      locale: "fr_FR",
      type: "website",
    },
    other: {
      "x-artipascher-build": buildId,
      "x-artipascher-env": staging ? "staging" : "prod",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const beta = await getIsBetaMode();

  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <BetaModeProvider beta={beta}>
          <BetaBanner />
          {children}
          <CookieConsentBanner />
          <GoogleAnalytics />
        </BetaModeProvider>
      </body>
    </html>
  );
}
