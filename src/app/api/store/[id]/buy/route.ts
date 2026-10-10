import { verifyCaptcha } from "@/lib/auth/captcha";
import { getStudent } from "@/lib/auth/student";
import { hitLimit } from "@/lib/auth/rate-limit";
import { ApiError, assertSameOrigin, clientIp, ok, readJson, route, tooMany } from "@/lib/http";
import { logger } from "@/lib/logger";
import { buyInputSchema, startOrder } from "@/lib/services/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Step 1: start a purchase. Free products are delivered immediately; paid ones open checkout. */
export const POST = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const limit = await hitLimit(`store-buy:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) throw tooMany("Too many attempts. Please wait a few minutes.", limit.retryAfterSec);

  const input = buyInputSchema.parse(await readJson(req));
  if (input.website) {
    logger.warn("store.honeypot", { ip });
    throw new ApiError(400, "Something went wrong. Please try again.", "rejected");
  }
  // Signed-in students buy for their own account and skip the math question.
  const student = await getStudent();
  if (student) {
    input.email = student.email;
  } else {
    const captcha = await verifyCaptcha(input.captchaToken ?? "", input.captchaAnswer ?? "", "comment-captcha");
    if (!captcha.ok) throw new ApiError(400, captcha.reason === "wrong" ? "That answer isn't right. Try the new question." : "The math question expired. Here's a new one.", "captcha_failed");
  }
  return ok(await startOrder((await params).id, input, { ip }), { status: 201 });
});
