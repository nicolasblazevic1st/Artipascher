import {
  getQualificationTier,
  type QualificationLevel,
} from "@/lib/qualification-tiers";

const BADGE_STYLES: Record<QualificationLevel, string> = {
  0: "bg-red-100 text-red-800 ring-red-200",
  1: "bg-slate-100 text-slate-700 ring-slate-200",
  2: "bg-brand-100 text-brand-800 ring-brand-200",
  3: "bg-amber-100 text-amber-900 ring-amber-200",
};

interface Props {
  level?: QualificationLevel;
  compact?: boolean;
}

export default function QualificationBadge({ level = 1, compact = false }: Props) {
  const tier = getQualificationTier(level);

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ring-1 ${BADGE_STYLES[level]} ${
        compact ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs"
      }`}
      title={tier.title}
    >
      {tier.badge}
    </span>
  );
}
