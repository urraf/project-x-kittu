import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_STATE_COOKIE, googleAuthUrl, isGoogleSignInConfigured, safeNext } from "@/lib/auth/google";
import { env } from "@/lib/env";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Starts "Sign in with Google": remembers a random state + where to go next, then redirects to Google. */
export function GET(req: NextRequest) {
  if (!isGoogleSignInConfigured()) return NextResponse.redirect(absoluteUrl("/account/login?error=google_off"));
  const state = randomBytes(24).toString("base64url");
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const res = NextResponse.redirect(googleAuthUrl(state));
  res.cookies.set(GOOGLE_STATE_COOKIE, `${state}.${encodeURIComponent(next)}`, { httpOnly: true, secure: env.isProduction, sameSite: "lax", path: "/api/account/google", maxAge: 600 });
  return res;
}
