import { z } from "zod";
import { ApiError, assertSameOrigin, ok, readJson, route } from "@/lib/http";
import { logger } from "@/lib/logger";
import { verifyPaymentSignature } from "@/lib/services/razorpay";
import { confirmOrder, findOrderByPaymentOrderId, orderConfirmationError } from "@/lib/services/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ orderId: z.string().min(5).max(100), paymentId: z.string().min(5).max(100), signature: z.string().min(10).max(200) });

/** Step 2: Razorpay Checkout succeeded. Verify the signature, then deliver. */
export const POST = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const { id } = await params;
  const body = schema.parse(await readJson(req));
  const order = await findOrderByPaymentOrderId(body.orderId);
  if (!order || String(order._id) !== id) throw new ApiError(400, "This payment doesn't match your order.", "mismatch");
  if (!verifyPaymentSignature(body.orderId, body.paymentId, body.signature)) {
    logger.warn("store.bad_signature", { order: id });
    throw new ApiError(400, "We couldn't verify the payment. If money was deducted, it will be confirmed automatically or refunded.", "bad_signature");
  }
  const outcome = await confirmOrder(id, { provider: "razorpay", paymentId: body.paymentId });
  const refused = orderConfirmationError(outcome);
  if (refused) throw refused;
  return ok({ orderId: id, newAccount: outcome.result === "paid" && Boolean(outcome.newAccount) });
});
