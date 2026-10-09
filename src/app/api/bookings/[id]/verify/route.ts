import { z } from "zod";
import { ApiError, assertSameOrigin, ok, readJson, route } from "@/lib/http";
import { logger } from "@/lib/logger";
import { confirmBooking, confirmationError, findBookingByOrderId, getBookingConfirmation } from "@/lib/services/mentorship";
import { verifyPaymentSignature } from "@/lib/services/razorpay";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  orderId: z.string().min(5).max(100),
  paymentId: z.string().min(5).max(100),
  signature: z.string().min(10).max(200),
});

/** Step 2: Razorpay Checkout succeeded in the browser. Verify the signature, then confirm. */
export const POST = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const { id } = await params;
  const body = schema.parse(await readJson(req));
  const booking = await findBookingByOrderId(body.orderId);
  if (!booking || String(booking._id) !== id) throw new ApiError(400, "This payment doesn't match your booking.", "mismatch");
  if (!verifyPaymentSignature(body.orderId, body.paymentId, body.signature)) {
    logger.warn("payment.bad_signature", { booking: id });
    throw new ApiError(400, "We couldn't verify the payment. If money was deducted, it will be confirmed automatically or refunded.", "bad_signature");
  }
  const outcome = await confirmBooking(id, { provider: "razorpay", paymentId: body.paymentId });
  const refused = confirmationError(outcome);
  if (refused) throw refused;
  return ok({ ...(await getBookingConfirmation(id)), newAccount: outcome.result === "confirmed" && Boolean(outcome.newAccount) });
});
