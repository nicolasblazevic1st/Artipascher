interface Props {
  labels: string[];
  compact?: boolean;
}

/** Badge affiché côté client — uniquement pour un métier dont la décennale a été validée. */
export default function DecennaleVerifiedBadge({ labels, compact }: Props) {
  if (labels.length === 0) return null;

  return (
    <>
      {labels.map((label) => (
        <span
          key={label}
          className={`inline-flex items-center rounded-full bg-emerald-50 font-medium text-emerald-800 ring-1 ring-emerald-200/80 ${
            compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs"
          }`}
          title={`Assurance décennale vérifiée pour ${label}`}
        >
          Décennale vérifiée ✓ · {label}
        </span>
      ))}
    </>
  );
}
