"use client";

import { createContext, useContext, type ReactNode } from "react";

const BetaModeContext = createContext(true);

/** Valeur calculée côté serveur (host) — évite le NEXT_PUBLIC figé au build. */
export function BetaModeProvider({
  beta,
  children,
}: {
  beta: boolean;
  children: ReactNode;
}) {
  return (
    <BetaModeContext.Provider value={beta}>{children}</BetaModeContext.Provider>
  );
}

export function useBetaMode(): boolean {
  return useContext(BetaModeContext);
}
