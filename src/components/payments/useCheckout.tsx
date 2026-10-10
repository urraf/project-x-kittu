"use client";

import { useCallback, useState } from "react";
import { DemoCheckout } from "@/components/mentorship/DemoCheckout";

export type CheckoutInfo = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
};

type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    const err = new Error(json?.error?.message ?? "Something went wrong. Please try again.") as Error & { details?: { path: string; message: string }[] };
    err.details = json?.error?.details;
    throw err;
  }
  return json.data as T;
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load the payment window. Check your connection and try again."));
    document.body.appendChild(s);
  });
}

/**
 * Runs a payment for something already created on the server (a booking or an
 * order). `base` is the API path that has /verify, /demo-pay and /abandon.
 * Resolves with the confirmation data, or rejects with a message to show.
 */
export function useCheckout<T>() {
  const [demo, setDemo] = useState<null | { info: CheckoutInfo; resolve: (v: T) => void; reject: (e: Error) => void; base: string }>(null);

  const pay = useCallback(async (base: string, info: CheckoutInfo, isDemo: boolean): Promise<T> => {
    const release = () => fetch(`${base}/abandon`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: info.orderId }), keepalive: true }).catch(() => {});
    if (isDemo) {
      return new Promise<T>((resolve, reject) => setDemo({ info, resolve, reject, base }));
    }
    await loadRazorpay();
    return new Promise<T>((resolve, reject) => {
      const rp = new window.Razorpay!({
        key: info.keyId,
        order_id: info.orderId,
        amount: info.amount,
        currency: info.currency,
        name: info.name,
        description: info.description,
        prefill: info.prefill,
        theme: { color: "#d9482b" },
        handler: async (r: RazorpayResponse) => {
          try {
            resolve(await postJson<T>(`${base}/verify`, { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }));
          } catch (e) {
            reject(e as Error);
          }
        },
        modal: {
          ondismiss: () => {
            release();
            reject(new Error("Payment was cancelled. You can try again whenever you're ready."));
          },
        },
      });
      rp.open();
    });
  }, []);

  const dialog = demo ? (
    <DemoCheckout
      info={demo.info}
      onSuccess={async () => {
        try {
          const v = await postJson<T>(`${demo.base}/demo-pay`, { orderId: demo.info.orderId });
          setDemo(null);
          demo.resolve(v);
        } catch (e) {
          setDemo(null);
          demo.reject(e as Error);
        }
      }}
      onFail={() => {
        fetch(`${demo.base}/abandon`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: demo.info.orderId }), keepalive: true }).catch(() => {});
        setDemo(null);
        demo.reject(new Error("The payment failed (demo). Please try again."));
      }}
      onDismiss={() => {
        fetch(`${demo.base}/abandon`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: demo.info.orderId }), keepalive: true }).catch(() => {});
        setDemo(null);
        demo.reject(new Error("Payment was cancelled. You can try again whenever you're ready."));
      }}
    />
  ) : null;

  return { pay, dialog };
}
