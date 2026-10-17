import "server-only";
import { env } from "@/lib/env";
import { absoluteUrl } from "@/lib/site";

/** "Sign in with Google" (OAuth 2.0 authorization-code flow, scopes: openid email profile). */

export const GOOGLE_STATE_COOKIE = "kk_google_state";
export const isGoogleSignInConfigured = () => Boolean(env.googleSignInClientId && env.googleSignInClientSecret);
export const googleRedirectUri = () => absoluteUrl("/api/account/google/callback");

/** Only same-site relative paths are allowed as the post-login destination. */
export function safeNext(next: string | null | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next.slice(0, 300) : "/account";
}

export function googleAuthUrl(state: string) {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({
    client_id: env.googleSignInClientId!,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  return u.toString();
}

export type GoogleProfile = { email: string; name: string; emailVerified: boolean };

/** Exchanges the code for tokens, then reads the verified profile from Google's userinfo endpoint (URLs overridable for tests). */
export async function googleProfileFromCode(code: string): Promise<GoogleProfile> {
  const tokenRes = await fetch(process.env.GOOGLE_TOKEN_URL ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleSignInClientId!,
      client_secret: env.googleSignInClientSecret!,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const tokens = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; error?: string; error_description?: string };
  if (!tokenRes.ok || !tokens.access_token) throw new Error(`Google token exchange failed: ${tokens.error ?? tokenRes.status} ${tokens.error_description ?? ""}`.trim());
  const infoRes = await fetch(process.env.GOOGLE_USERINFO_URL ?? "https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(15_000) });
  const info = (await infoRes.json().catch(() => ({}))) as { email?: string; email_verified?: boolean; name?: string; given_name?: string };
  if (!infoRes.ok || !info.email) throw new Error("Google didn't return an email address");
  return { email: info.email.trim().toLowerCase(), name: (info.name || info.given_name || info.email.split("@")[0]!).slice(0, 100), emailVerified: info.email_verified === true };
}
