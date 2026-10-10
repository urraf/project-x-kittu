import { z } from "zod";
import { assertSameOrigin, ok, readJson, route } from "@/lib/http";
import { abandonOrder } from "@/lib/services/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const { orderId } = z.object({ orderId: z.string().min(5).max(100) }).parse(await readJson(req));
  await abandonOrder((await params).id, orderId);
  return ok({ released: true });
});
