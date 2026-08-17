import Link from "next/link";
import { BRAND } from "@/lib/brand";

export default function SiteLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90 sm:gap-3"
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm ${
          compact ? "h-9 w-9" : "h-10 w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12"
        }`}
        aria-hidden
      >
        <svg
          viewBox="0 0 48 48"
          className={compact ? "h-6 w-6" : "h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9"}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 22L24 8l16 14v18a2 2 0 01-2 2H10a2 2 0 01-2-2V22z"
            fill="currentColor"
            opacity="0.95"
          />
          <path
            d="M18 42V28h12v14"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M30 14l8 8M34 10l4 4"
            stroke="#FCD34D"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <rect x="28" y="18" width="12" height="4" rx="1" fill="#FCD34D" />
        </svg>
      </span>
      <div className="min-w-0 leading-tight">
        <p
          className={`font-bold tracking-tight text-slate-900 group-hover:text-brand-700 ${
            compact
              ? "text-sm sm:text-base"
              : "text-base sm:text-lg lg:text-xl"
          }`}
        >
          <span className="text-brand-800">Nord Artisan</span>
          <span className="text-brand-600"> Pro</span>
        </p>
        <p className="hidden text-[11px] text-slate-500 sm:block sm:text-xs">
          {BRAND.tagline}
        </p>
      </div>
    </Link>
  );
}
