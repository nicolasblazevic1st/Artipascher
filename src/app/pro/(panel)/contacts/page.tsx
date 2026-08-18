import type { Metadata } from "next";
import Link from "next/link";
import CoproprieteBanner from "@/components/CoproprieteBanner";
import { getProSession } from "@/lib/pro-auth";
import { getUnlockedContactsForPro } from "@/lib/store";

export const metadata: Metadata = {
  title: "Contacts",
};

export default async function ProContactsPage() {
  const session = await getProSession();
  if (!session) return null;

  const contacts = await getUnlockedContactsForPro(session.proId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
      <p className="mt-1 text-sm text-slate-600">
        Coordonnées des particuliers dont vous avez débloqué le contact
        (15 à 25&nbsp;€ selon le ticket, débit solde).
      </p>

      {contacts.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-600">
            Aucun contact débloqué pour le moment. Parcourez les offres
            correspondantes et débloquez les coordonnées pour joindre le client.
          </p>
          <Link
            href="/pro/encheres"
            className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Parcourir les offres
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {contacts.map((c) => (
            <li
              key={c.unlockId}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    {c.clientKind === "company" && c.companyName
                      ? c.companyName
                      : c.clientKind === "copropriete"
                        ? "Copropriété"
                        : `${c.firstName} ${c.lastName}`}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {c.category} · {c.city}
                    {c.department ? ` (${c.department})` : ""}
                  </p>
                  {c.clientKind === "copropriete" && (
                    <div className="mt-1">
                      <CoproprieteBanner workScope={c.workScope} />
                    </div>
                  )}
                  {(c.clientKind === "company" ||
                    c.clientKind === "copropriete") && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Contact : {c.firstName} {c.lastName}
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Débloqué le {new Date(c.paidAt).toLocaleDateString("fr-FR")}
                </p>
              </div>

              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Téléphone</dt>
                  <dd className="font-medium text-slate-900">
                    <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="hover:underline">
                      {c.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Email</dt>
                  <dd className="font-medium text-slate-900">
                    <a href={`mailto:${c.email}`} className="hover:underline">
                      {c.email}
                    </a>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Adresse du chantier</dt>
                  <dd className="font-medium text-slate-900">{c.address}</dd>
                </div>
              </dl>

              <Link
                href={`/pro/encheres/${c.auctionId}`}
                className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Voir le chantier →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
