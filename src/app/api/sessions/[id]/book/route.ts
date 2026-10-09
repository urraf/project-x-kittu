import { verifyCaptcha } from "@/lib/auth/captcha";
import { hitLimit } from "@/lib/auth/rate-limit";
import { ApiError, assertSameOrigin, clientIp, ok, readJson, route, tooMany } from "@/lib/http";
import { logger } from "@/lib/logger";
import { bookingInputSchema, startBooking } from "@/lib/services/mentorship";
import { getSettings } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Step 1 of booking: validates details, holds a seat, and starts payment (or confirms if free). */
export const POST = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const settings = await getSettings();
  if (!settings.mentorship.enabled) throw new ApiError(403, "Bookings are closed right now.", "bookings_closed");

  const ip = clientIp(req);
  const limit = await hitLimit(`booking:${ip}`, 8, 15 * 60 * 1000);
  if (!limit.allowed) throw tooMany("Too many booking attempts. Please wait a few minutes.", limit.retryAfterSec);

  const input = bookingInputSchema.parse(await readJson(req));
  if (input.website) {
    logger.warn("booking.honeypot", { ip });
    throw new ApiError(400, "Something went wrong. Please try again.", "rejected");
  }
  const captcha = await verifyCaptcha(input.captchaToken, input.captchaAnswer, "comment-captcha");
  if (!captcha.ok) {
    throw new ApiError(400, captcha.reason === "wrong" ? "That answer isn't right. Try the new question." : "The math question expired. Here's a new one.", "captcha_failed");
  }
  return ok(await startBooking((await params).id, input, { ip }), { status: 201 });
});
