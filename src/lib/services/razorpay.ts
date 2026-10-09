import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/http";
import { logger } from "@/lib/logger";

/**
 * Razorpay via its REST API (no SDK). Flow: create an order on the server →
 * Razorpay Checkout collects payment in the browser → verify the returned
 * signature on the server (and via webhook as a backup) → confirm the booking.
 */

export function isRazorpayConfigured() {
  return Boolean(env.razorpayKeyId && env.razorpayKeySecret);
}

/**
 * "razorpay": real payments. "demo": a practice checkout (PAYMENTS_DEMO=true and
 * no keys yet), no money moves. "off": paid sessions can't be booked.
 */
export function paymentMode(): "razorpay" | "demo" | "off" {
  if (isRazorpayConfigured()) return "razorpay";
  return env.paymentsDemo ? "demo" : "off";
}

export async function createRazorpayOrder(opts: { amountRupees: number; receipt: string; notes?: Record<string, string> }) {
  if (!isRazorpayConfigured()) throw new ApiError(503, "Online payments aren't set up yet. Please try again later.", "payments_not_configured");
  const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString("base64");
  const res = await fetch(`${env.razorpayApiBase}/orders`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Math.round(opts.amountRupees * 100), currency: "INR", receipt: opts.receipt.slice(0, 40), notes: opts.notes }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; amount?: number; error?: { description?: string } };
  if (!res.ok || !json.id) {
    logger.error("razorpay.order_failed", { status: res.status, error: json.error?.description });
    throw new ApiError(502, "We couldn't start the payment. Please try again in a minute.", "payment_provider_error");
  }
  return { orderId: json.id, amountPaise: json.amount ?? Math.round(opts.amountRupees * 100) };
}

function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Verifies the signature Razorpay Checkout returns after a successful payment. */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  if (!env.razorpayKeySecret) return false;
  const expected = createHmac("sha256", env.razorpayKeySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Verifies a webhook body against X-Razorpay-Signature. */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  if (!env.razorpayWebhookSecret) return false;
  const expected = createHmac("sha256", env.razorpayWebhookSecret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Full refund of a captured payment. Returns true on success. */
export async function refundPayment(paymentId: string) {
  if (!isRazorpayConfigured()) return false;
  const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString("base64");
  try {
    const res = await fetch(`${env.razorpayApiBase}/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ speed: "normal" }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) logger.error("razorpay.refund_failed", { status: res.status, body: (await res.text()).slice(0, 300) });
    return res.ok;
  } catch (error) {
    logger.error("razorpay.refund_failed", { error });
    return false;
  }
}
