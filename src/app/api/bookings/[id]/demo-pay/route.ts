import { randomBytes } from "node:crypto";
import { z } from "zod";
import { ApiError, assertSameOrigin, notFound, ok, readJson, route } from "@/lib/http";
import { confirmBooking, confirmationError, findBookingByOrderId, getBookingConfirmation } from "@/lib/services/mentorship";
import { paymentMode } from "@/lib/services/razorpay";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Demo mode only (PAYMENTS_DEMO=true and no Razorpay keys): the practice
 * checkout "pays" and the booking is confirmed exactly like a real payment.
 * Disappears as soon as real Razorpay keys are configured.
 */
export const POST = route<Ctx>(async (req, { params }) => {
  if (paymentMode() !== "demo") throw notFound("Not found");
  assertSameOrigin(req);
  const { id } = await params;
  const { orderId } = z.object({ orderId: z.string().startsWith("order_demo_").max(100) }).parse(await readJson(req));
  const booking = await findBookingByOrderId(orderId);
  if (!booking || String(booking._id) !== id || booking.payment?.provider !== "demo") throw new ApiError(400, "This payment doesn't match your booking.", "mismatch");
  const outcome = await confirmBooking(id, { provider: "demo", paymentId: `pay_demo_${randomBytes(7).toString("hex")}` });
  const refused = confirmationError(outcome);
  if (refused) throw refused;
  return ok({ ...(await getBookingConfirmation(id)), newAccount: outcome.result === "confirmed" && Boolean(outcome.newAccount) });
});
