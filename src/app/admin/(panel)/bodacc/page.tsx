import Link from "next/link";
import {
  readBodaccActiveDb,
  readBodaccScanProgress,
} from "@/lib/bodacc-scan-db";
import { bodaccCollectiveSearchUrl } from "@/lib/bodacc";

export const dynamic = "force-dynamic";

export default async function AdminBodaccPage() {
  const [db, progress] = await Promise.all([
    readBodaccActiveDb(),
    readBodaccScanProgress(),
  ]);

  const checkedCount = Object.keys(progress.checked).length;

  const rows = [...db.active].sort((a, b) => {
    const da = a.dateParution ?? "";
    const db_ = b.dateParution ?? "";
    return db_.localeCompare(da);
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            BODACC — procédures collectives
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Entreprises de la base artisans avec une procédure collective
            active détectée via l&apos;API BODACC (scan CLI). La liste se
            remplit au fur et à mesure du scan.
          </p>
        </div>
        <Link
          href="/admin/base-artisans"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          ← Base artisans
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-red-50 px-3 py-1 font-medium text-red-800">
          {db.activeCount} procédure
          {db.activeCount !== 1 ? "s" : ""} active
          {db.activeCount !== 1 ? "s" : ""}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          Scannés : {checkedCount.toLocaleString("fr-FR")} / ~43 762
        </span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
          Clear : {progress.stats.clear.toLocaleString("fr-FR")}
        </span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">
          Indispo : {progress.stats.unavailable.toLocaleString("fr-FR")}
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Dernière MAJ fichier :{" "}
        {db.updatedAt
          ? new Date(db.updatedAt).toLocaleString("fr-FR")
          : "—"}
        {" · "}
        Relancer le scan :{" "}
        <code className="rounded bg-slate-100 px-1">npm run scan:bodacc</code>
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          Aucune procédure active pour l&apos;instant. Le scan tourne encore,
          ou relancez{" "}
          <code className="rounded bg-white px-1">npm run scan:bodacc</code>.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Entreprise</th>
                <th className="px-3 py-2 font-medium">SIREN</th>
                <th className="px-3 py-2 font-medium">Nature</th>
                <th className="px-3 py-2 font-medium">Parution</th>
                <th className="px-3 py-2 font-medium">Lien</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.siren} className="bg-white hover:bg-slate-50/80">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-900">
                      {row.companyName ?? "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {[row.city, row.department].filter(Boolean).join(" · ") ||
                        "—"}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-700">
                    {row.siren}
                    {row.siretSample ? (
                      <div className="text-slate-400">{row.siretSample}</div>
                    ) : null}
                  </td>
                  <td className="max-w-xs px-3 py-2.5 text-slate-800">
                    {row.nature ?? "Procédure collective"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                    {row.dateParution
                      ? new Date(
                          `${row.dateParution}T12:00:00`
                        ).toLocaleDateString("fr-FR")
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-1">
                      {row.url ? (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-brand-700 hover:underline"
                        >
                          Annonce
                        </a>
                      ) : null}
                      <a
                        href={bodaccCollectiveSearchUrl(row.siren)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-500 hover:underline"
                      >
                        Toutes BODACC
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
