import type { Metadata } from "next";
import Link from "next/link";
import { FAQ_ITEMS } from "@/lib/data";

export const metadata: Metadata = {
  title: "FAQ — Enchères inversées travaux Nord-Pas-de-Calais",
};

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold text-slate-900">Foire aux questions</h1>
      <p className="mt-2 text-slate-600">
        Tout sur les enchères inversées Artipascher dans le Nord-Pas-de-Calais
      </p>

      <div className="mt-10 space-y-4">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.question}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <summary className="cursor-pointer font-semibold text-slate-900">
              {item.question}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {item.answer}
            </p>
          </details>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-brand-50 p-6 text-center">
        <p className="font-semibold text-slate-900">Besoin d&apos;aide ?</p>
        <p className="mt-2 text-sm text-slate-600">
          Contactez notre équipe pour toute question sur votre projet dans le 59
          ou 62.
        </p>
        <Link
          href="/particulier"
          className="mt-4 inline-block text-sm font-semibold text-brand-700"
        >
          Demander des travaux →
        </Link>
      </div>
    </div>
  );
}
