import { hitLimit } from "@/lib/auth/rate-limit";
import { ApiError, assertSameOrigin, clientIp, ok, readJson, route, tooMany } from "@/lib/http";
import { ConfigError, env } from "@/lib/env";
import { GroqError } from "@/lib/ai/groq";
import { askKittu } from "@/lib/services/assistant";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** "Ask Kittu" chat assistant. Nothing is stored; the browser keeps the conversation. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  if (!env.groqChatApiKey) throw new ConfigError("The chat assistant isn't set up yet.");
  const ip = clientIp(req);
  const [burst, daily] = await Promise.all([hitLimit(`chat:${ip}`, 20, 10 * 60_000), hitLimit(`chat-day:${ip}`, 150, 24 * 3600_000)]);
  if (!burst.allowed || !daily.allowed) throw tooMany("Kittu needs a short break. Please try again in a few minutes.", Math.max(burst.retryAfterSec, daily.retryAfterSec));
  try {
    return ok(await askKittu(await readJson(req)), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof GroqError) {
      // 401/403 = bad or revoked key (a setup problem, not load): log it loudly so it's easy to spot.
      const keyProblem = err.status === 401 || err.status === 403;
      logger.error(keyProblem ? "chat.groq_key_invalid" : "chat.groq_failed", { status: err.status, message: err.message });
      throw new ApiError(503, keyProblem ? "Kittu is offline right now. Please try again later." : "Kittu is busy right now. Please try again in a minute.", "assistant_unavailable");
    }
    throw err;
  }
});
