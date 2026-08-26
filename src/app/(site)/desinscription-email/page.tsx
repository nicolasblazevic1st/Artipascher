import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata = {
  title: `Désinscription emails — ${BRAND.name}`,
  robots: { index: false, follow: false },
};

export default async function UnsubscribeEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const success = params.ok === "1";
  const error = params.error;

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">
        Emails d&apos;information professionnelle
      </h1>
      {success ? (
        <p className="mt-4 text-slate-700">
          Votre adresse a été retirée des prochains envois d&apos;information
          professionnelle de {BRAND.name}. Les emails liés à un compte ou à un
          chantier en cours (mot de passe, alertes) peuvent encore partir.
        </p>
      ) : (
        <p className="mt-4 text-slate-700">
          {error === "invalid" || error === "missing"
            ? "Ce lien de désinscription n'est pas valide. Écrivez-nous à "
            : "Pour ne plus recevoir ces emails, utilisez le lien en bas du message, ou écrivez à "}
          <a
            className="font-medium text-brand-700 underline"
            href={`mailto:${BRAND.emailContact}`}
          >
            {BRAND.emailContact}
          </a>
          .
        </p>
      )}
      <p className="mt-8">
        <Link href="/" className="text-sm font-medium text-brand-700 underline">
          Retour à l&apos;accueil
        </Link>
      </p>
    </main>
  );
}
