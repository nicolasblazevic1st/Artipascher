import Link from "next/link";
import BetaClosedNotice from "@/components/BetaClosedNotice";
import WorkRequestForm from "@/components/WorkRequestForm";
import { isBetaMode } from "@/lib/beta";
import { getClientSession } from "@/lib/client-auth";
import { getClientById } from "@/lib/store";

export default async function NouvelleDemandePage() {
  const session = await getClientSession();
  if (!session) return null;

  const client = await getClientById(session.clientId);

  return (
    <div>
      <Link
        href="/particulier/espace/demandes"
        className="text-sm font-medium text-client-700 hover:underline"
      >
        ← Mes demandes
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Nouvelle demande</h1>
      <p className="mt-1 text-sm text-slate-600">
        Décrivez votre projet : il restera dans votre espace particulier.
      </p>

      {isBetaMode() ? (
        <div className="mt-6">
          <BetaClosedNotice title="Création de demandes fermée" />
        </div>
      ) : (
        <WorkRequestForm
          successHref="/particulier/espace/demandes"
          defaults={{
            firstName: client?.firstName ?? session.firstName,
            lastName: client?.lastName ?? session.lastName,
            email: client?.email ?? session.email,
            phone: client?.phone,
          }}
        />
      )}
    </div>
  );
}
