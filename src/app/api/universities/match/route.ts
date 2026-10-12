import { hitLimit } from "@/lib/auth/rate-limit";
import { assertSameOrigin, clientIp, ok, readJson, route, tooMany } from "@/lib/http";
import { matchUniversities } from "@/lib/services/unimatch";

export const dynamic = "force-dynamic";

/** JapanUniMatch: profile in, ranked university shortlist out. Nothing is stored. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const limit = await hitLimit(`unimatch:${clientIp(req)}`, 40, 10 * 60 * 1000);
  if (!limit.allowed) throw tooMany("Too many searches. Try again in a few minutes.", limit.retryAfterSec);
  return ok(await matchUniversities(await readJson(req)), { headers: { "Cache-Control": "no-store" } });
});
