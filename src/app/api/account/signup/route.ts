import { hitLimit } from "@/lib/auth/rate-limit";
import { assertSameOrigin, clientIp, ok, readJson, route, tooMany } from "@/lib/http";
import { signupSchema, startSignup } from "@/lib/services/student-account";

export const dynamic = "force-dynamic";

/** Step 1: check the details and email a 6-digit code. Nothing is created until the code is entered. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const input = signupSchema.parse(await readJson(req));
  const [byIp, byEmail] = await Promise.all([hitLimit(`student-otp:${clientIp(req)}`, 10, 15 * 60_000), hitLimit(`student-otp:${input.email}`, 4, 15 * 60_000)]);
  if (!byIp.allowed || !byEmail.allowed) throw tooMany("Too many codes requested. Please wait a few minutes.", Math.max(byIp.retryAfterSec, byEmail.retryAfterSec));
  await startSignup(input);
  return ok({ sent: true, email: input.email });
});
