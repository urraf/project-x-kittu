import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { cancelOrder } from "@/lib/services/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const { refund } = z.object({ refund: z.boolean().default(false) }).parse(await readJson(req));
  return ok(await cancelOrder((await params).id, { refund }));
});
