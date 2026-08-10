import { listVisibleClientRequirements } from "@/lib/client-requirements";
import type { ClientRequirementSource } from "@/lib/client-requirements";

interface Props {
  request: ClientRequirementSource;
  className?: string;
}

/** Exigences client visibles avant achat de crédits / déblocage. */
export default function OfferClientRequirements({
  request,
  className = "",
}: Props) {
  const items = listVisibleClientRequirements(request);
  if (items.length === 0) return null;

  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`.trim()}
    >
      <h2 className="text-sm font-semibold text-slate-900">
        Exigences du client
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Vérifiez que votre profil y répond avant d’utiliser un crédit.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
