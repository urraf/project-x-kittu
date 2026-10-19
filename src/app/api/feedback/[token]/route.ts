import { hitLimit } from "@/lib/auth/rate-limit";
import { assertSameOrigin, clientIp, ok, readJson, route, tooMany } from "@/lib/http";
import { submitFeedback } from "@/lib/services/feedback";
import { revalidateSite } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const limit = await hitLimit(`feedback:${clientIp(req)}`, 10, 15 * 60_000);
  if (!limit.allowed) throw tooMany("Please wait a moment and try again.", limit.retryAfterSec);
  await submitFeedback((await params).token, await readJson(req));
  revalidateSite();
  return ok({ saved: true });
});
