interface Props {
  compact?: boolean;
  domains?: string[];
}

/** Badge « RGE » — mention vérifiée sur l’annuaire ADEME. */
export default function RgeBadge({ compact = false, domains }: Props) {
  const title =
    domains && domains.length > 0
      ? `RGE ADEME : ${domains.join(", ")}`
      : "Label RGE vérifié (annuaire ADEME)";

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ring-1 bg-emerald-50 text-emerald-800 ring-emerald-200 ${
        compact ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs"
      }`}
      title={title}
    >
      RGE
    </span>
  );
}
