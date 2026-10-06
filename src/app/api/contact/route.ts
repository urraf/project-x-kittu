import { hitLimit } from "@/lib/auth/rate-limit";
import { assertSameOrigin, clientIp, ok, readJson, route, tooMany } from "@/lib/http";
import { logger } from "@/lib/logger";
import { contactSchema, createMessage } from "@/lib/services/messages";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const limit = await hitLimit(`contact:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) throw tooMany("You've sent a few messages already. Please try again later.", limit.retryAfterSec);

  const input = contactSchema.parse(await readJson(req));
  if (input.website) {
    // Honeypot tripped: pretend success so bots learn nothing.
    logger.warn("contact.honeypot", { ip });
    return ok({ received: true });
  }
  await createMessage(input, ip);
  logger.info("contact.received", { topic: input.topic });
  return ok({ received: true }, { status: 201 });
});
