import { z } from "zod";
import { setStudentCookie } from "@/lib/auth/student";
import { hitLimit, resetLimit } from "@/lib/auth/rate-limit";
import { ApiError, assertSameOrigin, clientIp, ok, readJson, route, tooMany } from "@/lib/http";
import { emailField, loginStudent } from "@/lib/services/student-account";

export const dynamic = "force-dynamic";

const schema = z.object({ email: emailField, password: z.string().min(1, "Enter your password").max(128) });

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const { email, password } = schema.parse(await readJson(req));
  const ip = clientIp(req);
  const [byIp, byEmail] = await Promise.all([hitLimit(`student-login:${ip}`, 20, 15 * 60_000), hitLimit(`student-login:${email}`, 8, 15 * 60_000)]);
  if (!byIp.allowed || !byEmail.allowed) throw tooMany("Too many attempts. Please wait a few minutes, or reset your password.", Math.max(byIp.retryAfterSec, byEmail.retryAfterSec));

  const student = await loginStudent(email, password);
  if (!student) throw new ApiError(401, "Incorrect email or password.", "invalid_credentials");
  await resetLimit(`student-login:${email}`);
  const res = ok({ redirect: "/account" });
  await setStudentCookie(res, student);
  return res;
});
