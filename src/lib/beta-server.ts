import { headers } from "next/headers";
import { isBetaModeForHost } from "./beta";

/** Mode bêta pour le rendu serveur (host réel de la requête). */
export async function getIsBetaMode(): Promise<boolean> {
  const h = await headers();
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? h.get("x-real-host");
  return isBetaModeForHost(host);
}
