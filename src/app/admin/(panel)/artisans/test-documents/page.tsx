"use client";

import { useState } from "react";

type OcrResult = {
  fileName: string;
  fileSize: number;
  textLength: number;
  readable: boolean;
  hints: {
    siren?: string;
    siret?: string;
    insurer?: string;
    companyName?: string;
    validUntil?: string;
    rawSnippet?: string;
  };
  consistencyIssues: Array<{
    field: string;
    message: string;
    severity: string;
  }>;
  suggestion: { status: string; reason?: string } | null;
  note: string;
};

export default function AdminDocumentOcrTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [docKind, setDocKind] = useState<"rc" | "decennale">("rc");
  const [expectedSiren, setExpectedSiren] = useState("");
  const [expectedSiret, setExpectedSiret] = useState("");
  const [expectedCompany, setExpectedCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);

  async function runTest(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choisissez un PDF.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append("file", file);
    form.append("docKind", docKind);
    if (expectedSiren.trim()) form.append("expectedSiren", expectedSiren.trim());
    if (expectedSiret.trim()) form.append("expectedSiret", expectedSiret.trim());
    if (expectedCompany.trim())
      form.append("expectedCompany", expectedCompany.trim());

    try {
      const res = await fetch("/api/admin/document-ocr-test", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analyse impossible.");
        setBusy(false);
        return;
      }
      setResult(data as OcrResult);
    } catch {
      setError("Erreur réseau.");
    }
    setBusy(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Test documents (OCR)</h1>
      <p className="mt-1 text-sm text-slate-600">
        Uploadez un PDF d&apos;attestation pour voir ce que le moteur détecte
        (SIREN, assureur, lisibilité) et la suggestion automatique.{" "}
        <strong>Aucun dossier artisan n&apos;est modifié.</strong> La validation
        réelle se fait dans l&apos;onglet Documents.
      </p>

      <form
        onSubmit={runTest}
        className="mt-6 max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-5"
      >
        <div>
          <label className="text-sm font-medium text-slate-700">Type</label>
          <select
            value={docKind}
            onChange={(e) => setDocKind(e.target.value as "rc" | "decennale")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="rc">RC professionnelle</option>
            <option value="decennale">Garantie / décennale</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Fichier PDF
          </label>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">
              SIREN attendu (optionnel)
            </label>
            <input
              value={expectedSiren}
              onChange={(e) => setExpectedSiren(e.target.value)}
              placeholder="123456789"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              SIRET attendu (optionnel)
            </label>
            <input
              value={expectedSiret}
              onChange={(e) => setExpectedSiret(e.target.value)}
              placeholder="12345678900014"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Raison sociale attendue (optionnel)
          </label>
          <input
            value={expectedCompany}
            onChange={(e) => setExpectedCompany(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !file}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "Analyse…" : "Analyser le PDF"}
        </button>
      </form>

      {result && (
        <section className="mt-6 max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Résultat</h2>
          <p className="text-xs text-slate-500">{result.note}</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Fichier</dt>
              <dd className="font-medium">
                {result.fileName} ({Math.round(result.fileSize / 1024)} Ko)
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Texte extrait</dt>
              <dd className="font-medium">
                {result.readable ? (
                  <span className="text-emerald-700">
                    Lisible ({result.textLength} car.)
                  </span>
                ) : (
                  <span className="text-red-700">Illisible / scan image</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">SIREN détecté</dt>
              <dd className="font-medium">{result.hints.siren ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">SIRET détecté</dt>
              <dd className="font-medium">{result.hints.siret ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Assureur</dt>
              <dd className="font-medium">{result.hints.insurer ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Date / validité</dt>
              <dd className="font-medium">{result.hints.validUntil ?? "—"}</dd>
            </div>
          </dl>

          {result.hints.rawSnippet && (
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Extrait</p>
              <p className="mt-1">{result.hints.rawSnippet}</p>
            </div>
          )}

          {result.consistencyIssues.length > 0 && (
            <ul className="space-y-1 text-sm">
              {result.consistencyIssues.map((issue, i) => (
                <li
                  key={`${issue.field}-${i}`}
                  className={
                    issue.severity === "error"
                      ? "text-red-700"
                      : "text-amber-800"
                  }
                >
                  [{issue.severity}] {issue.field} — {issue.message}
                </li>
              ))}
            </ul>
          )}

          {result.suggestion && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                result.suggestion.status === "validé"
                  ? "bg-emerald-50 text-emerald-900"
                  : "bg-amber-50 text-amber-900"
              }`}
            >
              <p className="font-semibold">
                Suggestion auto : {result.suggestion.status}
              </p>
              {result.suggestion.reason && (
                <p className="mt-1 text-xs">{result.suggestion.reason}</p>
              )}
              <p className="mt-1 text-xs opacity-80">
                Indicatif uniquement — vous validez ou bloquez dans Documents.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
