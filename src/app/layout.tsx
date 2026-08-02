import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Artipascher — Enchères inversées travaux Nord 59/62",
    template: "%s | Artipascher",
  },
  description:
    "Plateforme d'enchères inversées pour vos travaux dans les Hauts-de-France.",
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
