import Link from "next/link";
import type { ProDocument } from "@/lib/store-types";

interface Props {
  documents: ProDocument[];
  compact?: boolean;
}

function isPdf(url: string) {
  return url.toLowerCase().endsWith(".pdf");
}

export default function ProDocumentsList({ documents, compact = false }: Props) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-slate-500">Aucun document transmis.</p>
    );
  }

  if (compact) {
    return (
      <ul className="space-y-1 text-sm">
        {documents.map((doc) => (
          <li key={doc.id}>
            <Link
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-700 hover:underline"
            >
              {doc.label}
            </Link>
            <span className="text-slate-400"> · {doc.fileName}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {documents.map((doc) => (
        <li key={`${doc.id}-${doc.fileUrl}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">{doc.label}</p>
            <p className="text-xs text-slate-500">{doc.fileName}</p>
          </div>
          <Link
            href={doc.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50"
          >
            {isPdf(doc.fileUrl) ? "Ouvrir le PDF" : "Voir le document"}
          </Link>
        </li>
      ))}
    </ul>
  );
}
