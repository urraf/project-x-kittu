import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Session } from "@/lib/models";
import { env } from "@/lib/env";
import { assertSameOrigin, unauthorized } from "@/lib/http";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSessionToken, verifySessionToken } from "@/lib/auth/token";

/**
 * Database-backed admin sessions. The cookie holds a signed JWT whose `sid`
 * must also exist in the sessions collection, so logging out (or deleting the
 * session document) revokes access immediately.
 */

export async function createSession(meta: { ip?: string; userAgent?: string }) {
  await connectDB();
  const sid = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await Session.create({ _id: sid, expiresAt, ip: meta.ip, userAgent: meta.userAgent?.slice(0, 400) });
  const token = await signSessionToken(sid);
  return { token, expiresAt };
}

export function setSessionCookie(res: NextResponse, token: string, expiresAt: Date) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: env.isProduction, sameSite: "strict", path: "/", maxAge: 0 });
}

export async function destroySession(sid: string) {
  await connectDB();
  await Session.deleteOne({ _id: sid });
}

/** Returns the active admin session, or null. Never throws for auth failures. */
export async function getAdminSession() {
  const store = await cookies();
  const claims = await verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!claims) return null;

  await connectDB();
  const session = await Session.findById(claims.sid).lean();
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;

  // Touch at most once every 5 minutes to avoid a write per request.
  if (Date.now() - new Date(session.lastSeenAt).getTime() > 5 * 60_000) {
    await Session.updateOne({ _id: claims.sid }, { $set: { lastSeenAt: new Date() } });
  }
  return { sid: claims.sid, expiresAt: session.expiresAt };
}

/** Guard for admin API route handlers (CSRF origin check + valid session). */
export async function requireAdmin(req: Request) {
  assertSameOrigin(req);
  const session = await getAdminSession();
  if (!session) throw unauthorized("Your session has expired. Please sign in again.");
  return session;
}

/** Guard for admin server components / layouts. */
export async function requireAdminPage(next = "/admin") {
  const session = await getAdminSession();
  if (!session) redirect(`/admin/login?next=${encodeURIComponent(next)}`);
  return session;
}
