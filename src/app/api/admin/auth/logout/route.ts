import { clearSessionCookie, destroySession, getAdminSession } from "@/lib/auth/session";
import { assertSameOrigin, ok, route } from "@/lib/http";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const session = await getAdminSession();
  if (session) await destroySession(session.sid);
  const res = ok({ redirect: "/admin/login" });
  clearSessionCookie(res);
  return res;
});
