import { assertSameOrigin, ok, route } from "@/lib/http";
import { isBot, persistVisitor, recordView, visitorFrom } from "@/lib/services/engagement";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Records a (de-duplicated) view and returns the post's live counts. */
export const POST = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const visitor = visitorFrom(req);
  const data = await recordView((await params).id, visitor.id, !isBot(req.headers.get("user-agent")));
  const res = ok(data, { headers: { "Cache-Control": "no-store" } });
  persistVisitor(res, visitor);
  return res;
});
