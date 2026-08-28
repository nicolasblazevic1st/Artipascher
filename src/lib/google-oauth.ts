import { createHmac, randomBytes, createHash, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { BRAND } from "@/lib/brand";

export const GOOGLE_OAUTH_STATE_COOKIE = "nap_google_oauth";
export const GOOGLE_PRO_PENDING_COOKIE = "nap_google_pro_pending";

export type GoogleOAuthRole = "client" | "pro";

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
};

type SignedCookiePayload = {
  nonce: string;
  role: GoogleOAuthRole;
  from: string;
  verifier: string;
  exp: number;
  /** Origine publique au moment du départ OAuth (évite localhost:3001 derrière Nginx). */
  origin?: string;
};

export type GoogleProPending = {
  email: string;
  googleSub: string;
  firstName: string;
  lastName: string;
  exp: number;
};

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

function signingSecret(): string {
  return (
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD ||
    "google-oauth-dev"
  );
}

function signPayload(json: string): string {
  const sig = createHmac("sha256", signingSecret()).update(json).digest("base64url");
  return `${Buffer.from(json, "utf-8").toString("base64url")}.${sig}`;
}

function unsignPayload(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", signingSecret())
    .update(Buffer.from(body, "base64url").toString("utf-8"))
    .digest("base64url");
  if (sig.length !== expected.length) return null;
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    return Buffer.from(body, "base64url").toString("utf-8");
  } catch {
    return null;
  }
}

function hostnameOf(hostOrUrl: string): string {
  const trimmed = hostOrUrl.replace(/\/$/, "");
  try {
    if (trimmed.includes("://")) return new URL(trimmed).hostname.toLowerCase();
  } catch {
    /* ignore */
  }
  return trimmed.split(":")[0]?.toLowerCase() ?? "";
}

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

export function isTrustedOAuthOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (isLoopbackHostname(host)) return true;
    if (
      host === BRAND.domain ||
      host === `www.${BRAND.domain}` ||
      host === `dev.${BRAND.domain}`
    ) {
      return parsed.protocol === "https:";
    }
    const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
    if (env && hostnameOf(env) === host) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Origine vue par le navigateur — jamais le port interne Next (3001 en prod).
 * `request.url` derrière Nginx vaut souvent http://localhost:3001/...
 */
export function publicOriginFromRequest(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const host = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  )
    .split(",")[0]
    ?.trim();
  const protoHeader = request.headers.get("x-forwarded-proto");
  const proto =
    protoHeader?.split(",")[0]?.trim() ||
    (host && isLoopbackHostname(hostnameOf(host)) ? "http" : "https");

  const envIsPublic = Boolean(env && !isLoopbackHostname(hostnameOf(env)));
  if (
    process.env.NODE_ENV === "production" &&
    envIsPublic &&
    (!host || isLoopbackHostname(hostnameOf(host)))
  ) {
    return env;
  }

  if (host) return `${proto}://${host}`;
  return env || BRAND.siteUrl;
}

export function oauthAbsoluteUrl(
  request: NextRequest,
  pathWithQuery: string,
  originOverride?: string
): URL {
  const origin = (originOverride || publicOriginFromRequest(request)).replace(
    /\/$/,
    ""
  );
  const trusted = isTrustedOAuthOrigin(origin)
    ? origin
    : publicOriginFromRequest(request).replace(/\/$/, "");
  return new URL(pathWithQuery, `${trusted}/`);
}

export function googleCallbackUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/auth/google/callback`;
}

function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function sanitizeOAuthFrom(
  role: GoogleOAuthRole,
  raw: string | null | undefined
): string {
  const fallback = role === "client" ? "/particulier/espace" : "/pro";
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) {
    return fallback;
  }
  const pathOnly = raw.split("?")[0]?.split("#")[0] ?? "";
  const queryIndex = raw.indexOf("?");
  const query = queryIndex >= 0 ? raw.slice(queryIndex).split("#")[0] : "";

  if (role === "client") {
    if (pathOnly === "/particulier/demande" || pathOnly === "/travaux") {
      return `${pathOnly}${query}`;
    }
    if (
      pathOnly.startsWith("/particulier/espace") &&
      !pathOnly.startsWith("/particulier/espace/login") &&
      !pathOnly.startsWith("/particulier/espace/inscription")
    ) {
      return `${pathOnly}${query}`;
    }
    return fallback;
  }
  if (pathOnly.startsWith("/pro") && !pathOnly.startsWith("/pro/login")) {
    return pathOnly;
  }
  if (pathOnly.startsWith("/professionnel")) return pathOnly;
  return fallback;
}

export function isPublicWorkFormReturn(from: string | undefined): boolean {
  if (!from) return false;
  const pathOnly = from.split("?")[0]?.split("#")[0] ?? "";
  return pathOnly === "/particulier/demande" || pathOnly === "/travaux";
}

export function encodeOAuthStateCookie(payload: SignedCookiePayload): string {
  return signPayload(JSON.stringify(payload));
}

export function decodeOAuthStateCookie(
  token: string | undefined
): SignedCookiePayload | null {
  if (!token) return null;
  const json = unsignPayload(token);
  if (!json) return null;
  try {
    const data = JSON.parse(json) as SignedCookiePayload;
    if (!data.nonce || !data.role || !data.verifier || !data.exp) return null;
    if (Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

export function createOAuthState(
  role: GoogleOAuthRole,
  from: string,
  origin: string
): SignedCookiePayload {
  return {
    nonce: randomBytes(16).toString("base64url"),
    role,
    from: sanitizeOAuthFrom(role, from),
    verifier: randomBytes(32).toString("base64url"),
    origin: origin.replace(/\/$/, ""),
    exp: Date.now() + 10 * 60 * 1000,
  };
}

export function buildGoogleAuthorizationUrl(
  origin: string,
  state: SignedCookiePayload
): string {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleCallbackUrl(origin),
    response_type: "code",
    scope: "openid email profile",
    state: state.nonce,
    code_challenge: pkceChallenge(state.verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(input: {
  code: string;
  origin: string;
  verifier: string;
}): Promise<GoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  const body = new URLSearchParams({
    code: input.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: googleCallbackUrl(input.origin),
    grant_type: "authorization_code",
    code_verifier: input.verifier,
  });

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) {
    throw new Error("GOOGLE_TOKEN_EXCHANGE");
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new Error("GOOGLE_TOKEN_EXCHANGE");
  }

  const infoRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!infoRes.ok) {
    throw new Error("GOOGLE_USERINFO");
  }
  const info = (await infoRes.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    given_name?: string;
    family_name?: string;
    name?: string;
  };

  const email = info.email?.trim().toLowerCase() ?? "";
  const sub = info.sub?.trim() ?? "";
  if (!email || !sub) {
    throw new Error("GOOGLE_PROFILE_INCOMPLETE");
  }

  const firstName =
    info.given_name?.trim() ||
    info.name?.trim().split(/\s+/)[0] ||
    email.split("@")[0] ||
    "Prénom";
  const lastName =
    info.family_name?.trim() ||
    info.name?.trim().split(/\s+/).slice(1).join(" ") ||
    "—";

  return {
    sub,
    email,
    emailVerified: info.email_verified === true,
    firstName,
    lastName,
  };
}

export function encodeGoogleProPending(payload: Omit<GoogleProPending, "exp">): string {
  const full: GoogleProPending = {
    ...payload,
    exp: Date.now() + 30 * 60 * 1000,
  };
  return signPayload(JSON.stringify(full));
}

export function decodeGoogleProPending(
  token: string | undefined
): GoogleProPending | null {
  if (!token) return null;
  const json = unsignPayload(token);
  if (!json) return null;
  try {
    const data = JSON.parse(json) as GoogleProPending;
    if (!data.email || !data.googleSub || !data.exp) return null;
    if (Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

export function oauthCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
    secure: process.env.NODE_ENV === "production",
  };
}
