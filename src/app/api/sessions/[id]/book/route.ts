import { getStudent } from "@/lib/auth/student";
import { hitLimit } from "@/lib/auth/rate-limit";
import { ApiError, assertSameOrigin, clientIp, ok, readJson, route, tooMany } from "@/lib/http";
import { logger } from "@/lib/logger";
import { bookingInputSchema, startBooking } from "@/lib/services/mentorship";
import { getSettings } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Step 1 of booking: holds a seat and starts payment (or confirms if free).
 * Students must be logged in and accept the session terms; the seat is booked
 * for the signed-in account's email.
 */
export const POST = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const settings = await getSettings();
  if (!settings.mentorship.enabled) throw new ApiError(403, "Bookings are closed right now.", "bookings_closed");

  const student = await getStudent();
  if (!student) throw new ApiError(401, "Please log in or create an account to book a session.", "login_required");

  const ip = clientIp(req);
  const limit = await hitLimit(`booking:${ip}`, 8, 15 * 60 * 1000);
  if (!limit.allowed) throw tooMany("Too many booking attempts. Please wait a few minutes.", limit.retryAfterSec);

  const body = (await readJson(req)) as Record<string, unknown>;
  const input = bookingInputSchema.parse({ ...body, email: student.email });
  if (input.website) {
    logger.warn("booking.honeypot", { ip });
    throw new ApiError(400, "Something went wrong. Please try again.", "rejected");
  }
  return ok(await startBooking((await params).id, input, { ip }), { status: 201 });
});
