import type { Metadata } from "next";
import WorkRequestPublicLanding from "@/components/WorkRequestPublicLanding";
import { WORK_REQUEST_FORM_PATH } from "@/lib/work-request-form-path";

export const metadata: Metadata = {
  title: "Formulaire de demande de travaux — Sans compte obligatoire",
  description:
    "Remplissez le formulaire, même si vous ne savez pas le métier. Des artisans vérifiés du Nord et du Pas-de-Calais vous recontactent. Gratuit, sans commission.",
  alternates: { canonical: WORK_REQUEST_FORM_PATH },
  robots: { index: false, follow: true },
};

/**
 * Alias : anciens liens et pubs déjà envoyées vers /travaux.
 * Pas dans le menu ni le sitemap.
 */
export default async function TravauxAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <WorkRequestPublicLanding searchParams={searchParams} formPath="/travaux" />;
}
