import { z } from "zod";
import { setStudentCookie } from "@/lib/auth/student";
import { hitLimit } from "@/lib/auth/rate-limit";
import { assertSameOrigin, clientIp, ok, readJson, route, tooMany } from "@/lib/http";
import { codeField, completePasswordReset, emailField, passwordField } from "@/lib/services/student-account";

export const dynamic = "force-dynamic";

/** Sets a new password with the emailed code, signs out other devices, and signs in here. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const limit = await hitLimit(`student-code:${clientIp(req)}`, 30, 15 * 60_000);
  if (!limit.allowed) throw tooMany("Too many attempts. Please wait a few minutes.", limit.retryAfterSec);
  const { email, code, newPassword } = z.object({ email: emailField, code: codeField, newPassword: passwordField }).parse(await readJson(req));
  const student = await completePasswordReset(email, code, newPassword);
  const res = ok({ redirect: "/account" });
  await setStudentCookie(res, student);
  return res;
});
