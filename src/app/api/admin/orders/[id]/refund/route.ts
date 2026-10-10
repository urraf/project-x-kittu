import { requireAdmin } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { refundCancelledOrder } from "@/lib/services/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  return ok(await refundCancelledOrder((await params).id));
});
