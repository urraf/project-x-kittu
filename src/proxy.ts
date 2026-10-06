import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token";

/**
 * First line of defence for the admin area. Verifies the signed session
 * cookie before any /admin page or /api/admin route runs. Route handlers and
 * the admin layout perform a second, database-backed check (revocation).
 */

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/api/admin/auth/captcha", "/api/admin/auth/login"]);

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token).catch(() => null);

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    // Already signed in? Skip the login screen.
    if (session && pathname === "/admin/login") return NextResponse.redirect(new URL("/admin", req.url));
    return withAdminHeaders(NextResponse.next());
  }

  if (!session) {
    if (isApi) {
      return NextResponse.json(
        { ok: false, error: { code: "unauthorized", message: "Authentication required" } },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    const login = new URL("/admin/login", req.url);
    login.searchParams.set("next", `${pathname}${search}`);
    const res = NextResponse.redirect(login);
    if (token) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  return withAdminHeaders(NextResponse.next());
}

function withAdminHeaders(res: NextResponse) {
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
