"use client";

import { useBetaMode } from "@/components/BetaModeProvider";
import { BETA_CLOSED_MESSAGE } from "@/lib/beta";

export default function BetaClosedNotice({
  title = "Préouverture",
  className = "",
}: {
  title?: string;
  className?: string;
}) {
  const beta = useBetaMode();
  if (!beta) return null;

  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 ${className}`}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 leading-relaxed">{BETA_CLOSED_MESSAGE}</p>
    </div>
  );
}
