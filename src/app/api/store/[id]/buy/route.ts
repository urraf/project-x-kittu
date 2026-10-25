import { getStudent } from "@/lib/auth/student";
import { hitLimit } from "@/lib/auth/rate-limit";
import { ApiError, assertSameOrigin, clientIp, ok, readJson, route, tooMany } from "@/lib/http";
import { logger } from "@/lib/logger";
import { buyInputSchema, startOrder } from "@/lib/services/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Step 1: start a purchase. Free products are delivered immediately; paid ones
 * open checkout. Buyers must be logged in and accept the study material terms.
 */
export const POST = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const student = await getStudent();
  if (!student) throw new ApiError(401, "Please log in or create an account to buy study material.", "login_required");

  const ip = clientIp(req);
  const limit = await hitLimit(`store-buy:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) throw tooMany("Too many attempts. Please wait a few minutes.", limit.retryAfterSec);

  const body = (await readJson(req)) as Record<string, unknown>;
  const input = buyInputSchema.parse({ ...body, email: student.email });
  if (input.website) {
    logger.warn("store.honeypot", { ip });
    throw new ApiError(400, "Something went wrong. Please try again.", "rejected");
  }
  return ok(await startOrder((await params).id, input, { ip }), { status: 201 });
});
