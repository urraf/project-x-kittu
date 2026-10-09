import { z } from "zod";
import { assertSameOrigin, ok, readJson, route } from "@/lib/http";
import { abandonBooking } from "@/lib/services/mentorship";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** The student closed the checkout without paying: release their seat right away. */
export const POST = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const { orderId } = z.object({ orderId: z.string().min(5).max(100) }).parse(await readJson(req));
  await abandonBooking((await params).id, orderId);
  return ok({ released: true });
});
