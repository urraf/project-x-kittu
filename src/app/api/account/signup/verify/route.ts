import { z } from "zod";
import { setStudentCookie } from "@/lib/auth/student";
import { hitLimit } from "@/lib/auth/rate-limit";
import { assertSameOrigin, clientIp, ok, readJson, route, tooMany } from "@/lib/http";
import { codeField, completeSignup, emailField } from "@/lib/services/student-account";

export const dynamic = "force-dynamic";

/** Step 2: the code from the email creates the account and signs the student in. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const limit = await hitLimit(`student-code:${clientIp(req)}`, 30, 15 * 60_000);
  if (!limit.allowed) throw tooMany("Too many attempts. Please wait a few minutes.", limit.retryAfterSec);
  const { email, code } = z.object({ email: emailField, code: codeField }).parse(await readJson(req));
  const student = await completeSignup(email, code);
  const res = ok({ redirect: "/account" });
  await setStudentCookie(res, student);
  return res;
});
