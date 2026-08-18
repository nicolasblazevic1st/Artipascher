import type { QualificationLevel } from "@/lib/qualification-tiers";

interface Props {
  level?: QualificationLevel;
  compact?: boolean;
}

/** Badge unique « Certifié » (les anciens niveaux 2/3 ne sont plus affichés). */
export default function QualificationBadge({
  level = 1,
  compact = false,
}: Props) {
  if (level === 0) {
    return (
      <span
        className={`inline-flex items-center rounded-full font-semibold ring-1 bg-red-100 text-red-800 ring-red-200 ${
          compact ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs"
        }`}
        title="Certification retirée"
      >
        Non certifié
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ring-1 bg-slate-100 text-slate-700 ring-slate-200 ${
        compact ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs"
      }`}
      title="Documents vérifiés"
    >
      Certifié
    </span>
  );
}
