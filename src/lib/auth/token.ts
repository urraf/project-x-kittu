/**
 * Stateless session-token helpers. Kept free of database and `server-only`
 * imports so it can run inside `proxy.ts` as well as route handlers.
 * The database-backed session check lives in ./session.ts.
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const ISSUER = "lifeofkittukun";

export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-kk_admin" : "kk_admin";

function key(purpose: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be set (min 32 chars)");
  // Domain-separate keys so a captcha token can never be replayed as a session.
  return new TextEncoder().encode(`${purpose}:${secret}`);
}

export type SessionClaims = { sid: string; role: "admin" };

export async function signSessionToken(sid: string) {
  return new SignJWT({ sid, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience("admin")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key("session"));
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key("session"), {
      issuer: ISSUER,
      audience: "admin",
      algorithms: ["HS256"],
    });
    if (payload.role !== "admin" || typeof payload.sid !== "string") return null;
    return { sid: payload.sid, role: "admin" };
  } catch {
    return null;
  }
}

export async function signPurposeToken(purpose: string, claims: Record<string, unknown>, ttlSeconds: number) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(purpose)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key(purpose));
}

export async function verifyPurposeToken<T = Record<string, unknown>>(purpose: string, token: string) {
  const { payload } = await jwtVerify(token, key(purpose), {
    issuer: ISSUER,
    audience: purpose,
    algorithms: ["HS256"],
  });
  return payload as T;
}
