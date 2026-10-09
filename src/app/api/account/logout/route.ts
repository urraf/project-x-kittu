import { clearStudentCookie } from "@/lib/auth/student";
import { assertSameOrigin, ok, route } from "@/lib/http";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const res = ok({ redirect: "/account/login" });
  clearStudentCookie(res);
  return res;
});
