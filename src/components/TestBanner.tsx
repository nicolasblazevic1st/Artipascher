interface Props {
  className?: string;
  compact?: boolean;
}

/** Bandeau visible sur les demandes / enchères de démonstration. */
export default function TestBanner({ className = "", compact = false }: Props) {
  if (compact) {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-950 ${className}`}
      >
        Test
      </span>
    );
  }

  return (
    <div
      className={`rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm font-medium text-amber-950 ${className}`}
    >
      <span className="font-bold uppercase tracking-wide">Bandeau test</span>
      {" — "}
      Données de démonstration, ne pas traiter comme un vrai chantier.
    </div>
  );
}
