interface Props {
  className?: string;
  /** `bar` = bandeau pleine largeur ; `pill` = pastille (listes / admin). */
  variant?: "pill" | "bar";
  compact?: boolean;
}

/** Marquage « Démo » sur les enchères / demandes fictives. */
export default function TestBanner({
  className = "",
  variant = "pill",
}: Props) {
  if (variant === "bar") {
    return (
      <div
        role="status"
        className={`w-full bg-amber-100 px-3 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-amber-900 ${className}`}
      >
        Annonce de démonstration
      </div>
    );
  }

  return (
    <span
      title="Données fictives pour présentation"
      className={`inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ${className}`}
    >
      Démo
    </span>
  );
}
