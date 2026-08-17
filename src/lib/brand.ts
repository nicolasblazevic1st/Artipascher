/**
 * Identité commerciale du site (marque).
 * Les chemins VPS / variables d’env techniques peuvent encore porter l’ancien nom de projet.
 */
export const BRAND = {
  /** Nom affiché (UI, emails, mentions) */
  name: "Nord Artisan Pro",
  /** Variante compacte (SMS alphanumérique max ~11 car.) */
  smsSender: "NordArtPro",
  /** Domaine public cible */
  domain: "nord-artisan-pro.com",
  siteUrl: "https://nord-artisan-pro.com",
  emailContact: "contact@nord-artisan-pro.com",
  emailFromName: "Nord Artisan Pro",
  tagline: "Travaux · Artisans vérifiés · Nord 59/62",
  titleDefault: "Nord Artisan Pro — Travaux & artisans vérifiés Nord 59/62",
  description:
    "Publiez votre demande de travaux dans le Nord-Pas-de-Calais. Des artisans vérifiés débloquent vos coordonnées pour vous contacter.",
} as const;
