import { randomBytes } from "node:crypto";
import { z } from "zod";
import { ApiError, assertSameOrigin, notFound, ok, readJson, route } from "@/lib/http";
import { paymentMode } from "@/lib/services/razorpay";
import { confirmOrder, findOrderByPaymentOrderId, orderConfirmationError } from "@/lib/services/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Demo mode only: the practice checkout "pays". Gone once real Razorpay keys are set. */
export const POST = route<Ctx>(async (req, { params }) => {
  if (paymentMode() !== "demo") throw notFound("Not found");
  assertSameOrigin(req);
  const { id } = await params;
  const { orderId } = z.object({ orderId: z.string().startsWith("order_demo_").max(100) }).parse(await readJson(req));
  const order = await findOrderByPaymentOrderId(orderId);
  if (!order || String(order._id) !== id || order.payment?.provider !== "demo") throw new ApiError(400, "This payment doesn't match your order.", "mismatch");
  const outcome = await confirmOrder(id, { provider: "demo", paymentId: `pay_demo_${randomBytes(7).toString("hex")}` });
  const refused = orderConfirmationError(outcome);
  if (refused) throw refused;
  return ok({ orderId: id, newAccount: outcome.result === "paid" && Boolean(outcome.newAccount) });
});
