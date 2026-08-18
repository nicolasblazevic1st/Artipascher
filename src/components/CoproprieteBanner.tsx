import { WORK_SCOPE_LABELS } from "@/lib/copropriete";
import type { WorkScope } from "@/lib/store-types";

interface Props {
  className?: string;
  workScope?: WorkScope;
}

/** Pastille publique « Copropriété » — n’identifie pas l’immeuble ni le syndic. */
export default function CoproprieteBanner({
  className = "",
  workScope,
}: Props) {
  const scopeLabel = workScope ? WORK_SCOPE_LABELS[workScope] : undefined;
  return (
    <span
      title={
        scopeLabel
          ? `Copropriété · ${scopeLabel}`
          : "Demande déposée pour une copropriété (identité masquée)"
      }
      className={`inline-flex items-center rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 ${className}`}
    >
      Copropriété
      {scopeLabel ? (
        <span className="ml-1 font-medium normal-case tracking-normal">
          · {scopeLabel}
        </span>
      ) : null}
    </span>
  );
}
