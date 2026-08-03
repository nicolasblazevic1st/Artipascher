import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Artipascher — Enchères inversées travaux Nord 59/62",
    template: "%s | Artipascher",
  },
  description:
    "Plateforme d'enchères inversées pour vos travaux dans les Hauts-de-France.",
  openGraph: {
    siteName: "Artipascher",
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
