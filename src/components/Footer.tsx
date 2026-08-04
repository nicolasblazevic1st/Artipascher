import Link from "next/link";
import { DATA_HOSTING_NOTICE } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="border-t border-brand-900 bg-brand-950 text-brand-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-white">Artipascher</p>
          <p className="mt-2 text-sm leading-relaxed">
            La plateforme d&apos;enchères inversées pour vos travaux dans les
            Hauts-de-France. Artisans vérifiés du Nord et du Pas-de-Calais.
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">Navigation</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/particulier" className="hover:text-white">
                Particulier
              </Link>
            </li>
            <li>
              <Link href="/professionnel" className="hover:text-white">
                Professionnel
              </Link>
            </li>
            <li>
              <Link href="/encheres" className="hover:text-white">
                Enchères actives
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-white">
                FAQ
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Zone d&apos;intervention</p>
          <p className="mt-3 text-sm leading-relaxed">
            Lille · Roubaix · Tourcoing · Valenciennes · Dunkerque · Douai ·
            Lens · Arras · Cambrai · Maubeuge
          </p>
          <p className="mt-2 text-xs text-brand-300">Départements 59 et 62</p>
          <p className="mt-4 text-xs leading-relaxed text-brand-300">{DATA_HOSTING_NOTICE}</p>
        </div>
      </div>
      <div className="border-t border-brand-900 py-4 text-center text-xs text-brand-300">
        © {new Date().getFullYear()} Artipascher — Enchères inversées travaux Nord-Pas-de-Calais
      </div>
    </footer>
  );
}
