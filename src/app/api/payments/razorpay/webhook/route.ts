import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { confirmBooking, findBookingByOrderId } from "@/lib/services/mentorship";
import { verifyWebhookSignature } from "@/lib/services/razorpay";
import { confirmOrder, findOrderByPaymentOrderId } from "@/lib/services/store";

export const dynamic = "force-dynamic";

/**
 * Backup confirmation from Razorpay (e.g. if the student closed the tab right
 * after paying). Configure in Razorpay Dashboard → Webhooks with the events
 * "payment.captured" and "order.paid", using RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) {
    logger.warn("razorpay.webhook_bad_signature");
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    const event = JSON.parse(raw) as {
      event: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string } }; order?: { entity?: { id?: string } } };
    };
    if (event.event === "payment.captured" || event.event === "order.paid") {
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id ?? event.payload?.order?.entity?.id;
      if (orderId) {
        const booking = await findBookingByOrderId(orderId);
        if (booking) await confirmBooking(String(booking._id), { provider: "razorpay", paymentId: payment?.id });
        else {
          const order = await findOrderByPaymentOrderId(orderId);
          if (order) await confirmOrder(String(order._id), { provider: "razorpay", paymentId: payment?.id });
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("razorpay.webhook_failed", { error });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
