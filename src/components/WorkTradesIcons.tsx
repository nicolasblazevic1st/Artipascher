/** Icônes métiers : pictogrammes pleins + pastilles colorées (style ton sur ton). */

import type { ReactElement, ReactNode } from "react";
import type { WorkCategory } from "@/lib/work-categories";

type IconProps = { className?: string };
type WorkIcon = (props: IconProps) => ReactElement;

function Glyph({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      {children}
    </svg>
  );
}

function PaintIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M15.05 2.15a2.05 2.05 0 0 1 2.9 0l3.9 3.9a2.05 2.05 0 0 1 0 2.9l-2.05 2.05-6.8-6.8 2.05-2.05Z" />
      <path d="M10.05 8.15 16.7 14.8c.15 1.25-.4 2.4-1.55 3.55L6.2 21.9a1.65 1.65 0 0 1-2.3-.2 1.65 1.65 0 0 1-.15-2.25l4.85-8.15c1.15-1.15 2.3-1.7 3.45-1.55Z" />
    </Glyph>
  );
}

function PlumbingIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M8.2 2.4h6.2c.7 0 1.25.55 1.25 1.25v1.1H6.95V3.65c0-.7.55-1.25 1.25-1.25Z" />
      <path d="M9.35 4.75h3.9v3.15h-3.9Z" />
      <path d="M6.6 7.7h9.4a2 2 0 0 1 2 2v2.55H4.6V9.7a2 2 0 0 1 2-2Z" />
      <path d="M18 10.15h2.15A1.35 1.35 0 0 1 21.5 11.5v3.35a1.4 1.4 0 0 1-1.4 1.4h-1.15v-6.1Z" />
      <path d="M19.15 17.35c0 1.2-.9 2-1.65 2s-1.65-.8-1.65-2c0-1.2 1.65-2.55 1.65-2.55s1.65 1.35 1.65 2.55Z" />
    </Glyph>
  );
}

function ElectricIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M13.2 1.85c.38-.08.74.18.84.56l2.05 7.34h3.16c.5 0 .8.55.55.97L9.55 22.4a.7.7 0 0 1-1.27-.52l1.55-6.88H6.55c-.5 0-.8-.56-.53-.98L12.35 2.3c.14-.24.38-.4.65-.45h.2Z" />
    </Glyph>
  );
}

function RoofIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M16.05 4.7h2.55c.4 0 .7.3.7.7v3.35l-3.25-2.75V5.4c0-.4.3-.7.7-.7Z" />
      <path d="M12 2.85c.3-.26.7-.26 1 0l8.85 7.5a.95.95 0 1 1-1.24 1.44L19 10.4V19.7c0 .85-.7 1.55-1.55 1.55H6.55C5.7 21.25 5 20.55 5 19.7v-9.3l-1.61 1.39a.95.95 0 1 1-1.24-1.44L11 2.85h1Z" />
    </Glyph>
  );
}

function TileIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <rect x="3.2" y="3.3" width="8.2" height="5.1" rx="1" />
      <rect x="12.6" y="3.3" width="8.2" height="5.1" rx="1" />
      <rect x="3.2" y="9.45" width="5.3" height="5.1" rx="1" />
      <rect x="9.5" y="9.45" width="8.2" height="5.1" rx="1" />
      <rect x="18.7" y="9.45" width="2.1" height="5.1" rx="0.8" />
      <rect x="3.2" y="15.6" width="8.2" height="5.1" rx="1" />
      <rect x="12.6" y="15.6" width="8.2" height="5.1" rx="1" />
    </Glyph>
  );
}

function HeatIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M12 1.7c2.15 2.7 3.15 4.7 3.15 6.55a3.15 3.15 0 1 1-6.3 0C8.85 6.4 9.85 4.4 12 1.7Z" />
      <path
        fillRule="evenodd"
        d="M12 11.15a5.7 5.7 0 1 1 0 11.4 5.7 5.7 0 0 1 0-11.4Zm0 2.55a3.15 3.15 0 1 0 0 6.3 3.15 3.15 0 0 0 0-6.3Z"
      />
    </Glyph>
  );
}

function WindowIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <rect x="3.4" y="2.8" width="7.6" height="8.2" rx="1" />
      <rect x="13" y="2.8" width="7.6" height="8.2" rx="1" />
      <rect x="3.4" y="13" width="7.6" height="8.2" rx="1" />
      <rect x="13" y="13" width="7.6" height="8.2" rx="1" />
    </Glyph>
  );
}

function BrickIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M10.7 3.55h2.6c.5 0 .9.4.9.9V7.2h-4.4V4.45c0-.5.4-.9.9-.9Z" />
      <path d="M5 15.3C5 9.15 8.1 5.2 12 5.2s7 3.95 7 10.1H5Z" />
      <path d="M2.3 15.15h19.4c.55 0 1 .45.95 1-.25 1.55-2.2 2.85-4.95 2.85H6.3c-2.75 0-4.7-1.3-4.95-2.85-.05-.55.4-1 .95-1Z" />
    </Glyph>
  );
}

function InsulationIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <rect x="3.1" y="8.1" width="12.4" height="9.8" rx="1.1" />
      <path
        fillRule="evenodd"
        d="M16.7 7.85a5.15 5.15 0 0 1 0 10.3 5.15 5.15 0 0 1 0-10.3Zm0 3.25a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Z"
      />
    </Glyph>
  );
}

function LeafIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path
        fillRule="evenodd"
        d="M20.7 3.25c.25 7.55-4.35 14.35-12.4 17.35C3.35 13.55 5.7 6.05 12.5 3c2.65-1.2 5.85-1.05 8.2.25Zm-12 13.1c3.15-2.45 6.15-5.9 8.15-10.35-4.25 2.2-7.4 5.7-8.15 10.35Z"
      />
    </Glyph>
  );
}

function HomeIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M11.15 2.95a1.4 1.4 0 0 1 1.7 0l8.45 6.7a1 1 0 1 1-1.25 1.56L19 10.5V19.6c0 .85-.7 1.55-1.55 1.55h-4.15v-5.7h-2.6v5.7H6.55C5.7 21.15 5 20.45 5 19.6v-9.1l-.95.76a1 1 0 1 1-1.25-1.56l8.35-6.75Z" />
    </Glyph>
  );
}

function WallIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <rect x="3.3" y="2.6" width="8" height="18.8" rx="1.2" />
      <rect x="12.7" y="2.6" width="8" height="18.8" rx="1.2" />
    </Glyph>
  );
}

function TreeIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M12 1.9 5.85 9.4h3.25L4.7 15.35h4.55V21.4h5.5v-6.05h4.55L14.9 9.4h3.25L12 1.9Z" />
    </Glyph>
  );
}

function DigIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <rect x="10.4" y="1.9" width="3.2" height="10.1" rx="1.3" />
      <path d="M6.15 12.15h11.7c.62 0 1.08.55.97 1.16l-1.45 7.55A2.25 2.25 0 0 1 15.2 22.7H8.8a2.25 2.25 0 0 1-2.17-1.84l-1.45-7.55c-.11-.61.35-1.16.97-1.16Z" />
    </Glyph>
  );
}

function LockIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path
        fillRule="evenodd"
        d="M8 6.15a5.85 5.85 0 1 0 0 11.7 5.85 5.85 0 0 0 0-11.7Zm0 3.35a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"
      />
      <path d="M13.2 10.8h8.3v2.45h-1.55v2.2h-2.1v1.65h-2.2v-3.85H13.2z" />
    </Glyph>
  );
}

function CleanIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M12 1.7 14.15 9.1 21.5 11.25 14.15 13.4 12 20.8 9.85 13.4 2.5 11.25 9.85 9.1 12 1.7Z" />
      <path d="M18.85 3.15 19.75 6.2 22.8 7.1 19.75 8 18.85 11.05 17.95 8 14.9 7.1 17.95 6.2 18.85 3.15Z" />
    </Glyph>
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

/** Pastel + pictogramme saturé, ou rouge plein + blanc (comme la référence). */
export const WORK_CATEGORY_TONES: Record<WorkCategory, { circle: string; icon: string }> = {
  Peinture: { circle: "bg-rose-100", icon: "text-rose-700" },
  Plomberie: { circle: "bg-sky-100", icon: "text-sky-600" },
  Électricité: { circle: "bg-red-600", icon: "text-white" },
  Maçonnerie: { circle: "bg-emerald-100", icon: "text-emerald-800" },
  Isolation: { circle: "bg-slate-100", icon: "text-slate-600" },
  "Chauffage / Pompe à chaleur": { circle: "bg-amber-100", icon: "text-amber-600" },
  "Rénovation énergétique": { circle: "bg-lime-100", icon: "text-lime-700" },
  "Rénovation complète": { circle: "bg-green-100", icon: "text-green-800" },
  "Menuiserie (fenêtres, portes, volets)": { circle: "bg-teal-100", icon: "text-teal-800" },
  "Toiture / Couverture": { circle: "bg-orange-100", icon: "text-orange-700" },
  "Carrelage / Revêtements de sol": { circle: "bg-cyan-100", icon: "text-cyan-700" },
  "Placo / Cloisons": { circle: "bg-stone-100", icon: "text-stone-600" },
  "Extérieur / Aménagement paysager": { circle: "bg-green-100", icon: "text-green-700" },
  Terrassement: { circle: "bg-yellow-100", icon: "text-amber-800" },
  Serrurerie: { circle: "bg-slate-200", icon: "text-slate-900" },
  "Nettoyage / Multi-services": { circle: "bg-sky-100", icon: "text-sky-500" },
};

const BADGE_SIZES = {
  sm: { wrap: "h-8 w-8", icon: "h-4 w-4" },
  md: { wrap: "h-12 w-12", icon: "h-6 w-6" },
  lg: { wrap: "h-16 w-16", icon: "h-8 w-8" },
} as const;

export function WorkCategoryBadge({
  category,
  size = "md",
  className = "",
}: {
  category: WorkCategory;
  size?: keyof typeof BADGE_SIZES;
  className?: string;
}) {
  const tone = WORK_CATEGORY_TONES[category];
  const Icon = WORK_CATEGORY_ICONS[category];
  const dim = BADGE_SIZES[size];

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${dim.wrap} ${tone.circle} ${tone.icon} ${className}`}
    >
      <Icon className={dim.icon} />
    </span>
  );
}

export const PRESENTATION_WORK_ICONS = [
  { label: "Peinture", category: "Peinture" as const, Icon: PaintIcon },
  { label: "Plomberie", category: "Plomberie" as const, Icon: PlumbingIcon },
  { label: "Électricité", category: "Électricité" as const, Icon: ElectricIcon },
  { label: "Toiture", category: "Toiture / Couverture" as const, Icon: RoofIcon },
  { label: "Carrelage", category: "Carrelage / Revêtements de sol" as const, Icon: TileIcon },
  { label: "Chauffage", category: "Chauffage / Pompe à chaleur" as const, Icon: HeatIcon },
  { label: "Menuiserie", category: "Menuiserie (fenêtres, portes, volets)" as const, Icon: WindowIcon },
  { label: "Maçonnerie", category: "Maçonnerie" as const, Icon: BrickIcon },
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
  const labelClass = tone === "onDark" ? "text-white/90" : "text-slate-700";
  const items =
    maxItems != null
      ? PRESENTATION_WORK_ICONS.slice(0, maxItems)
      : PRESENTATION_WORK_ICONS;

  return (
    <ul className={`flex flex-wrap justify-center gap-x-4 gap-y-3 ${className}`}>
      {items.map(({ label, category }) => (
        <li key={label} className="flex flex-col items-center gap-1.5">
          <WorkCategoryBadge category={category} size="md" />
          <span className={`text-[11px] font-medium ${labelClass}`}>{label}</span>
        </li>
      ))}
    </ul>
  );
}
