import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { ok, readJson, route } from "@/lib/http";
import { confirmOrder } from "@/lib/services/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  paymentId: z.string().optional(),
  provider: z.enum(["razorpay", "demo", "free"]).default("razorpay"),
});

export const POST = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const body = schema.parse(await readJson(req).catch(() => ({})));
  const { id } = await params;
  return ok(await confirmOrder(id, { provider: body.provider, paymentId: body.paymentId }));
});

