import Link from "next/link";
import { BETA_CLOSED_MESSAGE, isBetaMode } from "@/lib/beta";

export default function BetaClosedNotice({
  title = "Préouverture",
}: {
  title?: string;
}) {
  if (!isBetaMode()) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 leading-relaxed">{BETA_CLOSED_MESSAGE}</p>
      <p className="mt-3">
        <Link href="/" className="font-medium text-amber-900 underline hover:no-underline">
          Retour à l&apos;accueil
        </Link>
      </p>
    </div>
  );
}
