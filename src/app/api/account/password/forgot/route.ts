import { z } from "zod";
import { hitLimit } from "@/lib/auth/rate-limit";
import { assertSameOrigin, clientIp, ok, readJson, route, tooMany } from "@/lib/http";
import { emailField, startPasswordReset } from "@/lib/services/student-account";

export const dynamic = "force-dynamic";

/** Emails a reset code. Answers the same whether or not the account exists. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const { email } = z.object({ email: emailField }).parse(await readJson(req));
  const [byIp, byEmail] = await Promise.all([hitLimit(`student-otp:${clientIp(req)}`, 10, 15 * 60_000), hitLimit(`student-otp:${email}`, 4, 15 * 60_000)]);
  if (!byIp.allowed || !byEmail.allowed) throw tooMany("Too many codes requested. Please wait a few minutes.", Math.max(byIp.retryAfterSec, byEmail.retryAfterSec));
  await startPasswordReset(email);
  return ok({ sent: true });
});
