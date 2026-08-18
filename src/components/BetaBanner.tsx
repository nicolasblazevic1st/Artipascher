import { getIsBetaMode } from "@/lib/beta-server";

export default async function BetaBanner() {
  if (!(await getIsBetaMode())) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-700/40 bg-amber-500 px-4 py-2.5 text-center text-sm font-medium text-amber-950"
    >
      <span className="font-semibold">Version bêta — préouverture.</span>{" "}
      Le site est consultable, mais les inscriptions, demandes de travaux et
      paiements ne sont pas encore ouverts au public.
    </div>
  );
}
