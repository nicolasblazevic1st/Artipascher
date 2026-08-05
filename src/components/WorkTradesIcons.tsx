/** Petites icônes SVG pour les corps de métier (présentation / UI). */

import type { ReactElement } from "react";
import type { WorkCategory } from "@/lib/work-categories";

type IconProps = { className?: string };
type WorkIcon = (props: IconProps) => ReactElement;

function PaintIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M7 3h8a2 2 0 0 1 2 2v5H5V5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M5 10h12v2.5a2.5 2.5 0 0 1-2.5 2.5H14v4.5a1.5 1.5 0 0 1-3 0V15H7.5A2.5 2.5 0 0 1 5 12.5V10Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9 6.5h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlumbingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* Tube horizontal */}
      <path
        d="M3 14h11"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      {/* Coude vers le haut */}
      <path
        d="M14 14v-4.5A2.5 2.5 0 0 1 16.5 7H19"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Corps du robinet */}
      <path
        d="M17.5 7h3.5v3.5a1.5 1.5 0 0 1-1.5 1.5H17.5V7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      {/* Bec verseur */}
      <path
        d="M21 10.5V13a1 1 0 0 1-1 1h-1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Poignée */}
      <path
        d="M17 4.5h5M19.5 4.5V7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Goutte */}
      <path
        d="M18.5 16.5c0 1 .8 1.8 1.5 1.8s1.5-.8 1.5-1.8-.9-2.2-1.5-2.8c-.6.6-1.5 1.8-1.5 2.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ElectricIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M13 2 6 13h5l-1 9 8-12h-5l0-8Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RoofIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3 12 12 4l9 8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 11v9h14v-9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TileIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="4" y="13" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13" y="13" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function HeatIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3c2 2.5 3 4.5 3 7a3 3 0 1 1-6 0c0-2.5 1-4.5 3-7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M8 17c0 2.2 1.8 4 4 4s4-1.8 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WindowIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function BrickIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="5" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="3" y="12" width="11" height="5" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="16" y="12" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function InsulationIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8 8h8M8 12h8M8 16h8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LeafIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M5 19c3-5 8-9 14-11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 11 12 4l8 7v9a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WallIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="5" y="3" width="14" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M5 9h14M5 15h14M12 9v12" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function TreeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 21v-7M8 21h8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M12 3 7 10h3L6 16h12l-4-6h3L12 3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DigIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 18h16M7 18V9l5-5 5 5v9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M10 18v-4h4v4" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function LockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CleanIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1 7 17M17 7l2.1-2.1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export const WORK_CATEGORY_ICONS: Record<WorkCategory, WorkIcon> = {
  Peinture: PaintIcon,
  Plomberie: PlumbingIcon,
  Électricité: ElectricIcon,
  Maçonnerie: BrickIcon,
  Isolation: InsulationIcon,
  "Chauffage / Pompe à chaleur": HeatIcon,
  "Rénovation énergétique": LeafIcon,
  "Rénovation complète": HomeIcon,
  "Menuiserie (fenêtres, portes, volets)": WindowIcon,
  "Toiture / Couverture": RoofIcon,
  "Carrelage / Revêtements de sol": TileIcon,
  "Placo / Cloisons": WallIcon,
  "Extérieur / Aménagement paysager": TreeIcon,
  Terrassement: DigIcon,
  Serrurerie: LockIcon,
  "Nettoyage / Multi-services": CleanIcon,
};

export const PRESENTATION_WORK_ICONS = [
  { label: "Peinture", Icon: PaintIcon },
  { label: "Plomberie", Icon: PlumbingIcon },
  { label: "Électricité", Icon: ElectricIcon },
  { label: "Toiture", Icon: RoofIcon },
  { label: "Carrelage", Icon: TileIcon },
  { label: "Chauffage", Icon: HeatIcon },
  { label: "Menuiserie", Icon: WindowIcon },
  { label: "Maçonnerie", Icon: BrickIcon },
] as const;

export function WorkCategoryIcon({
  category,
  className = "h-5 w-5",
}: {
  category: WorkCategory;
  className?: string;
}) {
  const Icon = WORK_CATEGORY_ICONS[category];
  return <Icon className={className} />;
}

export function WorkTradesIconRow({
  className = "",
  tone = "light",
  maxItems,
}: {
  className?: string;
  tone?: "light" | "onDark";
  maxItems?: number;
}) {
  const chip =
    tone === "onDark"
      ? "border-white/20 bg-white/10 text-white"
      : "border-slate-200 bg-white text-brand-700 shadow-sm";
  const items =
    maxItems != null
      ? PRESENTATION_WORK_ICONS.slice(0, maxItems)
      : PRESENTATION_WORK_ICONS;

  return (
    <ul className={`flex flex-wrap justify-center gap-2 sm:gap-3 ${className}`}>
      {items.map(({ label, Icon }) => (
        <li
          key={label}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium ${chip}`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}
