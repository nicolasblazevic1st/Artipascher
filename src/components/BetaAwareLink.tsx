"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { useBetaMode } from "@/components/BetaModeProvider";

type Props = {
  href: ComponentProps<typeof Link>["href"];
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  /** Style du bouton désactivé en mode bêta (défaut = même className + opacité) */
  disabledClassName?: string;
  "data-nap-cta"?: string;
  "data-nap-placement"?: string;
};

/**
 * Lien d’action principale : en mode bêta, devient un bouton désactivé
 * avec explication (pas de navigation vers inscription / demande).
 */
export default function BetaAwareLink({
  href,
  className = "",
  children,
  onClick,
  disabledClassName,
  "data-nap-cta": dataNapCta,
  "data-nap-placement": dataNapPlacement,
}: Props) {
  const beta = useBetaMode();

  if (beta) {
    return (
      <span
        role="button"
        aria-disabled="true"
        title="Préouverture : inscriptions et demandes non ouvertes"
        className={
          disabledClassName ??
          `${className} cursor-not-allowed opacity-60`
        }
      >
        {children}
        <span className="sr-only"> (indisponible en version bêta)</span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={className}
      onClick={onClick}
      data-nap-cta={dataNapCta}
      data-nap-placement={dataNapPlacement}
    >
      {children}
    </Link>
  );
}
