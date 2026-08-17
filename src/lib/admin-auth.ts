import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "nap_admin_session";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "artipascher2026";
}

export function createSessionToken(): string {
  const secret = getAdminPassword();
  const payload = `admin:${Date.now()}`;
  return Buffer.from(`${payload}:${secret}`).toString("base64url");
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const secret = decoded.split(":").pop();
    return secret === getAdminPassword();
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return isValidSessionToken(token);
}
