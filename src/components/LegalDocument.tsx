import type { ReactNode } from "react";
import { LEGAL_DRAFT_NOTICE, LEGAL_PUBLISHER } from "@/lib/legal";

export default function LegalDocument({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">
        Dernière mise à jour : {LEGAL_PUBLISHER.lastUpdated} · Version{" "}
        {LEGAL_PUBLISHER.version}
      </p>
      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        {LEGAL_DRAFT_NOTICE}
      </p>
      <div className="prose-legal mt-10 space-y-8 text-sm leading-relaxed text-slate-700 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_a]:font-medium [&_a]:text-brand-700 [&_a]:underline">
        {children}
      </div>
    </div>
  );
}
