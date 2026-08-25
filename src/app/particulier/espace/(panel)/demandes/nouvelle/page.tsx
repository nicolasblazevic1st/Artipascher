import Link from "next/link";
import BetaClosedNotice from "@/components/BetaClosedNotice";
import WorkRequestForm from "@/components/WorkRequestForm";
import WorkRequestLandingIntro from "@/components/WorkRequestLandingIntro";
import { getIsBetaMode } from "@/lib/beta-server";
import { getClientSession } from "@/lib/client-auth";
import { getClientById } from "@/lib/store";

export default async function NouvelleDemandePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const session = await getClientSession();
  if (!session) return null;

  const [{ category: categoryParam }, client, beta] = await Promise.all([
    searchParams,
    getClientById(session.clientId),
    getIsBetaMode(),
  ]);

  return (
    <div>
      <Link
        href="/particulier/espace/demandes"
        className="text-sm font-medium text-client-700 hover:underline"
      >
        ← Mes demandes
      </Link>
      <div className="mt-4">
        <WorkRequestLandingIntro
          compact
          heading="Remplissez le formulaire de travaux"
        >
          Gratuit, sans commission. Des artisans vérifiés du Nord et du
          Pas-de-Calais vous recontactent — en général sous 24–48&nbsp;h.
        </WorkRequestLandingIntro>
      </div>

      {beta ? (
        <div className="mt-6">
          <BetaClosedNotice title="Création de demandes fermée" />
        </div>
      ) : (
        <WorkRequestForm
          successHref="/particulier/espace/demandes"
          variant="general"
          initialCategory={categoryParam}
          defaults={{
            firstName: client?.firstName ?? session.firstName,
            lastName: client?.lastName ?? session.lastName,
            email: client?.email ?? session.email,
            phone: client?.phone,
            phoneVerifiedE164: client?.phoneVerifiedE164,
            phoneVerifiedAt: client?.phoneVerifiedAt,
          }}
        />
      )}
    </div>
  );
}
