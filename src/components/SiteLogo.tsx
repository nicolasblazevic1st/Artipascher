import Image from "next/image";
import Link from "next/link";

export default function SiteLogo({ compact = false }: { compact?: boolean }) {
  const size = compact ? 36 : 40;

  return (
    <Link
      href="/"
      className="group flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90 sm:gap-3"
    >
      <Image
        src="/icon.png"
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-xl shadow-sm ${
          compact ? "h-9 w-9" : "h-10 w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12"
        }`}
        priority
      />
      <div className="min-w-0 leading-tight">
        <p
          className={`font-bold tracking-tight text-slate-900 group-hover:text-brand-700 ${
            compact ? "text-base" : "text-lg sm:text-xl lg:text-[1.35rem]"
          }`}
        >
          <span className="font-semibold text-brand-700">Enchères</span>{" "}
          <span className="text-brand-800">ARTIPASCHER</span>
        </p>
        <p className="hidden text-[11px] text-slate-500 sm:block sm:text-xs">
          Enchères inversées · Nord 59/62
        </p>
      </div>
    </Link>
  );
}
