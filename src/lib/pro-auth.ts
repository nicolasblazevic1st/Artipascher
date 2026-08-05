import { cookies } from "next/headers";

export const PRO_SESSION_COOKIE = "artipascher_pro_session";

export interface ProSession {
  proId: string;
  companyName: string;
  email: string;
  siret: string;
  /** Session ouverte par un admin (impersonation). */
  impersonatedByAdmin?: boolean;
}

export function encodeProSession(session: ProSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64url");
}

export function decodeProSession(token: string | undefined): ProSession | null {
  if (!token) return null;
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString("utf-8")) as ProSession;
  } catch {
    return null;
  }
}

export function isValidProSessionToken(token: string | undefined): boolean {
  const session = decodeProSession(token);
  return session !== null && Boolean(session.proId);
}

export async function getProSession(): Promise<ProSession | null> {
  const cookieStore = await cookies();
  return decodeProSession(cookieStore.get(PRO_SESSION_COOKIE)?.value);
}

export async function requireProSession(): Promise<ProSession> {
  const session = await getProSession();
  if (!session) {
    throw new Error("PRO_UNAUTHORIZED");
  }
  return session;
}
