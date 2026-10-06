import { hitLimit } from "@/lib/auth/rate-limit";
import { assertSameOrigin, clientIp, ok, route, tooMany } from "@/lib/http";
import { persistVisitor, toggleLike, visitorFrom } from "@/lib/services/engagement";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const limit = await hitLimit(`like:${clientIp(req)}`, 60, 10 * 60 * 1000);
  if (!limit.allowed) throw tooMany("Slow down a little. Try again in a few minutes.", limit.retryAfterSec);
  const visitor = visitorFrom(req);
  const res = ok(await toggleLike((await params).id, visitor.id), { headers: { "Cache-Control": "no-store" } });
  persistVisitor(res, visitor);
  return res;
});
