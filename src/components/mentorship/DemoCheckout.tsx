"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, CreditCard, Loader2, ShieldCheck, Smartphone, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type CheckoutInfo = {
  orderId: string;
  amount: number;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
};

const METHODS = [
  { id: "upi", label: "UPI", hint: "Google Pay, PhonePe, Paytm", Icon: Smartphone },
  { id: "card", label: "Card", hint: "Visa, Mastercard, RuPay", Icon: CreditCard },
  { id: "netbanking", label: "Netbanking", hint: "All major banks", Icon: Building2 },
] as const;

/**
 * Practice checkout shown while payments run in demo mode. It looks and
 * behaves like Razorpay's window, but no money moves.
 */
export function DemoCheckout({
  info,
  onSuccess,
  onFail,
  onDismiss,
}: {
  info: CheckoutInfo;
  onSuccess: () => Promise<void>;
  onFail: () => void;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("upi");
  const [processing, setProcessing] = useState(false);
  const rupees = `₹${(info.amount / 100).toLocaleString("en-IN")}`;

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  async function pay() {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1200)); // feels like a real payment
    await onSuccess();
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!processing) onDismiss();
      }}
      aria-labelledby="demo-checkout-title"
      className="m-auto w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-2xl border-0 bg-white p-0 text-[#1f2937] shadow-2xl backdrop:bg-night/70 backdrop:backdrop-blur-sm"
    >
      <div className="bg-[#fff4d6] px-4 py-1.5 text-center text-[0.7rem] font-semibold uppercase tracking-wider text-[#7a5410]">Demo payment · no real money is charged</div>
      <div className="relative bg-[#0c2451] px-5 pb-5 pt-4 text-white">
        {!processing && (
          <button type="button" onClick={onDismiss} aria-label="Close" className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
            <X className="size-4" />
          </button>
        )}
        <p id="demo-checkout-title" className="pr-8 text-[0.95rem] font-semibold">{info.name}</p>
        <p className="mt-0.5 line-clamp-2 pr-8 text-xs text-white/70">{info.description}</p>
        <p className="mt-4 text-[1.9rem] font-semibold leading-none">{rupees}</p>
        <p className="mt-2 truncate text-xs text-white/70">{info.prefill.email} · {info.prefill.contact}</p>
      </div>

      {processing ? (
        <div className="flex flex-col items-center px-5 py-12 text-center" role="status">
          <Loader2 className="size-8 animate-spin text-[#2b6de9]" />
          <p className="mt-4 font-medium">Processing payment…</p>
          <p className="mt-1 text-sm text-[#6b7280]">Please don&apos;t close this window.</p>
        </div>
      ) : (
        <div className="px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Payment method</p>
          <div className="mt-3 space-y-2" role="radiogroup" aria-label="Payment method">
            {METHODS.map(({ id, label, hint, Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={method === id}
                onClick={() => setMethod(id)}
                className={cn("flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors", method === id ? "border-[#2b6de9] bg-[#f0f5ff]" : "border-[#e5e7eb] hover:border-[#c7d2fe]")}
              >
                <Icon className={cn("size-5 shrink-0", method === id ? "text-[#2b6de9]" : "text-[#6b7280]")} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-[#6b7280]">{hint}</span>
                </span>
              </button>
            ))}
          </div>
          <button type="button" onClick={pay} className="mt-5 w-full rounded-xl bg-[#2b6de9] py-3.5 text-[0.95rem] font-semibold text-white hover:bg-[#1f5bd0]">
            Pay {rupees}
          </button>
          <button type="button" onClick={onFail} className="mt-2 w-full rounded-xl py-2 text-xs text-[#6b7280] underline-offset-2 hover:underline">
            Simulate a failed payment
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[0.7rem] text-[#9ca3af]">
            <ShieldCheck className="size-3.5" /> Practice checkout. Real payments use Razorpay.
          </p>
        </div>
      )}
    </dialog>
  );
}
