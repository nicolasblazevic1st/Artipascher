import Link from "next/link";
import { formatRequestedWorkStartDate } from "@/lib/demandes-validation";
import { UNLOCK_PRICE_EUR } from "@/lib/client-contacts";
import {
  formatAcceptedArtisanSlots,
  MAX_ACCEPTED_ARTISANS_PER_AUCTION,
} from "@/lib/contact-slots";

interface Props {
  auctionId: string;
  publicLocation: string;
  requestedWorkStartDate?: string;
  acceptedArtisansCount?: number;
  maxAcceptedArtisans?: number;
}

/**
 * Sur les pages publiques : renvoie le pro vers son espace pour gérer
 * l'intérêt / le déblocage des coordonnées.
 */
export default function ClientContactPublicCta({
  auctionId,
  publicLocation,
  requestedWorkStartDate,
  acceptedArtisansCount = 0,
  maxAcceptedArtisans = MAX_ACCEPTED_ARTISANS_PER_AUCTION,
}: Props) {
  const href = `/pro/encheres/${encodeURIComponent(auctionId)}`;

  return (
    <section id="contact" className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6">
      <h2 className="text-lg font-semibold text-slate-900">Coordonnées client</h2>
      <p className="mt-2 text-sm text-slate-600">
        Les photos du projet restent visibles librement (sans crédit). Manifestez
        d&apos;abord votre intérêt depuis votre espace pro. Après acceptation du client,
        vous pourrez débloquer les coordonnées pour 1 crédit ({UNLOCK_PRICE_EUR}&nbsp;€).
      </p>

      <dl className="mt-4 rounded-lg bg-white p-4 text-sm">
        <div className="flex justify-between border-b border-slate-100 py-2">
          <dt className="text-slate-500">Artisans acceptés</dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {formatAcceptedArtisanSlots(acceptedArtisansCount, maxAcceptedArtisans)}
          </dd>
        </div>
        <div className="flex justify-between border-b border-slate-100 py-2">
          <dt className="text-slate-500">Localisation</dt>
          <dd className="font-medium">{publicLocation}</dd>
        </div>
        {requestedWorkStartDate && (
          <div className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-slate-500">Début travaux souhaité</dt>
            <dd className="font-medium text-amber-800">
              {formatRequestedWorkStartDate(requestedWorkStartDate)}
            </dd>
          </div>
        )}
        <div className="flex justify-between border-b border-slate-100 py-2">
          <dt className="text-slate-500">Client</dt>
          <dd className="text-slate-400">Masqué</dd>
        </div>
        <div className="flex justify-between border-b border-slate-100 py-2">
          <dt className="text-slate-500">Téléphone</dt>
          <dd className="text-slate-400">06 •• •• •• ••</dd>
        </div>
        <div className="flex justify-between py-2">
          <dt className="text-slate-500">Email</dt>
          <dd className="text-slate-400">•••@•••.fr</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={href}
          className="inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Gérer le contact dans mon espace pro
        </Link>
        <Link
          href="/pro/login"
          className="inline-flex rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Connexion pro
        </Link>
      </div>
    </section>
  );
}
