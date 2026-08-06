interface Props {
  className?: string;
  /** Ignoré : le bandeau est toujours une pastille légère. */
  compact?: boolean;
}

/** Pastille légère « Démo » sur les enchères / demandes fictives. */
export default function TestBanner({ className = "" }: Props) {
  return (
    <span
      title="Données fictives pour présentation"
      className={`inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ${className}`}
    >
      Démo
    </span>
  );
}
