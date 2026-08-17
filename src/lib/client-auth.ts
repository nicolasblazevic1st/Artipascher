import { cookies } from "next/headers";

export const CLIENT_SESSION_COOKIE = "nap_client_session";

export interface ClientSession {
  clientId: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Session ouverte par un admin (impersonation). */
  impersonatedByAdmin?: boolean;
}

export function encodeClientSession(session: ClientSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64url");
}

export function decodeClientSession(token: string | undefined): ClientSession | null {
  if (!token) return null;
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString("utf-8")) as ClientSession;
  } catch {
    return null;
  }
}

export function isValidClientSessionToken(token: string | undefined): boolean {
  const session = decodeClientSession(token);
  return session !== null && Boolean(session.clientId);
}

export async function getClientSession(): Promise<ClientSession | null> {
  const cookieStore = await cookies();
  return decodeClientSession(cookieStore.get(CLIENT_SESSION_COOKIE)?.value);
}

export async function requireClientSession(): Promise<ClientSession> {
  const session = await getClientSession();
  if (!session) {
    throw new Error("CLIENT_UNAUTHORIZED");
  }
  return session;
}
