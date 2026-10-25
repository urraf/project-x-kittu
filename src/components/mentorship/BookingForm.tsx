"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { BadgeCheck, CheckCircle2, KeyRound, Loader2, Lock, MailCheck, RotateCcw, ShieldCheck } from "lucide-react";
import { DemoCheckout } from "@/components/mentorship/DemoCheckout";
import { LoginToContinue, TermsCheckbox } from "@/components/payments/CheckoutGate";
import { formatPrice, formatSessionWhen } from "@/lib/utils/session-time";
import type { MentorSessionDTO } from "@/lib/types";

type RazorpayInfo = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
};
type StartResult = { bookingId: string; status: "confirmed"; newAccount: boolean } | { bookingId: string; status: "payment_required"; demo: boolean; razorpay: RazorpayInfo };
type Confirmed = { newAccount?: boolean };
type SignedInStudent = { name: string; email: string; phone: string };

type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    const err = new Error(json?.error?.message ?? "Something went wrong. Please try again.") as Error & { details?: { path: string; message: string }[] };
    err.details = json?.error?.details;
    throw err;
  }
  return json.data as T;
}

/** Frees the held seat when the student leaves the checkout without paying (best effort). */
function releaseSeat(bookingId: string, orderId: string) {
  fetch(`/api/bookings/${bookingId}/abandon`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }), keepalive: true }).catch(() => {});
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

export function BookingForm({ session, paymentMode, student, google }: { session: MentorSessionDTO; paymentMode: "razorpay" | "demo" | "off"; student?: SignedInStudent | null; google?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(student?.name ?? "");
  const [email, setEmail] = useState(student?.email ?? "");
  const [phone, setPhone] = useState(student?.phone || "+91 ");
  const [newAccount, setNewAccount] = useState(false);
  const [notes, setNotes] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stage, setStage] = useState<"form" | "working" | "paying" | "done">("form");
  const [demo, setDemo] = useState<{ bookingId: string; info: RazorpayInfo } | null>(null);
  const website = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // People often type their full number after the prefilled "+91 ": keep one country code.
    const cleanPhone = phone.trim().replace(/^(\+\d{1,3})[\s-]*\1[\s-]*/, "$1 ").replace(/\s{2,}/g, " ");
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "Enter a valid email address.";
    if (!/^[+\d][\d\s-]{6,}$/.test(cleanPhone) || cleanPhone.replace(/\D/g, "").length < 8) errs.phone = "Enter a valid phone number.";
    if (!agree) errs.acceptTerms = "Please tick the box to accept the terms before continuing.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setStage("working");
    try {
      const start = await post<StartResult>(`/api/sessions/${session.id}/book`, {
        name,
        email,
        phone: cleanPhone,
        notes,
        acceptTerms: agree,
        website: website.current?.value ?? "",
      });
      if (start.status === "confirmed") {
        setNewAccount(start.newAccount);
        setStage("done");
        router.refresh();
        return;
      }
      if (start.demo) {
        setStage("paying");
        setDemo({ bookingId: start.bookingId, info: start.razorpay });
        return;
      }
      await loadRazorpay();
      setStage("paying");
      const rp = new window.Razorpay!({
        key: start.razorpay.keyId,
        order_id: start.razorpay.orderId,
        amount: start.razorpay.amount,
        currency: start.razorpay.currency,
        name: start.razorpay.name,
        description: start.razorpay.description,
        prefill: start.razorpay.prefill,
        theme: { color: "#d9482b" },
        handler: async (r: RazorpayResponse) => {
          setStage("working");
          try {
            const res = await post<Confirmed>(`/api/bookings/${start.bookingId}/verify`, { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature });
            setNewAccount(Boolean(res.newAccount));
            setStage("done");
            router.refresh();
          } catch (err) {
            setErrors({ form: (err as Error).message });
            setStage("form");
          }
        },
        modal: {
          ondismiss: () => {
            releaseSeat(start.bookingId, start.razorpay.orderId);
            setErrors({ form: "Payment was cancelled. You can try again whenever you're ready." });
            setStage("form");
          },
        },
      });
      rp.on("payment.failed", (resp) => setErrors({ form: resp.error?.description ?? "The payment failed. Please try again." }));
      rp.open();
    } catch (err) {
      const e = err as Error & { details?: { path: string; message: string }[] };
      const fieldErrors: Record<string, string> = {};
      e.details?.forEach((d) => (fieldErrors[d.path] = d.message));
      setErrors({ ...fieldErrors, form: Object.keys(fieldErrors).length ? "" : e.message });
      setStage("form");
    }
  }

  function closeDemo(message: string, release = true) {
    if (demo && release) releaseSeat(demo.bookingId, demo.info.orderId);
    setDemo(null);
    setErrors({ form: message });
    setStage("form");
  }

  async function payDemo() {
    if (!demo) return;
    try {
      const res = await post<Confirmed>(`/api/bookings/${demo.bookingId}/demo-pay`, { orderId: demo.info.orderId });
      setNewAccount(Boolean(res.newAccount));
      setDemo(null);
      setStage("done");
      router.refresh();
    } catch (err) {
      closeDemo((err as Error).message, false);
    }
  }

  if (stage === "done") {
    return (
      <div id="book" className="scroll-mt-28 rounded-3xl border border-line bg-[#fffdf9] p-6 shadow-[0_24px_60px_-40px_rgba(22,18,15,0.45)] md:p-8" role="status">
        <CheckCircle2 className="size-11 text-moss" />
        <h2 className="display mt-4 text-4xl">You&apos;re booked!</h2>
        <p className="mt-3 text-ink-2">
          Your seat for <strong className="text-ink">{session.title}</strong> on {formatSessionWhen(session.startsAt, session.durationMin)} is confirmed.
        </p>
        <ul className="mt-5 space-y-3 text-[0.95rem] text-ink-2">
          <li className="flex gap-3"><MailCheck className="mt-0.5 size-5 shrink-0 text-accent" /> <span>We&apos;ve emailed the meeting link to <strong className="break-all text-ink">{email}</strong>, and you&apos;ll get a reminder 1 hour before.</span></li>
          {newAccount && (
            <li className="flex gap-3"><KeyRound className="mt-0.5 size-5 shrink-0 text-accent" /> <span>The email also has a <strong className="text-ink">password</strong>, so you can log in with your email next time too.</span></li>
          )}
        </ul>
        <Link href="/account" className="btn btn-ink mt-7">Go to my account</Link>
      </div>
    );
  }

  const payNote =
    paymentMode === "demo"
      ? "Demo mode: a practice checkout opens, no real money is charged"
      : paymentMode === "off"
        ? "Online payments open soon"
        : "Secure payment by Razorpay · UPI, cards, netbanking & wallets";

  const field = "field";
  const seatsTight = session.seatsLeft <= Math.max(3, Math.ceil(session.capacity * 0.3));
  const filledPct = Math.max(6, Math.round((session.seatsTaken / session.capacity) * 100));
  const busy = stage !== "form";
  return (
    <form id="book" onSubmit={submit} noValidate className="scroll-mt-28 overflow-hidden rounded-3xl border border-line bg-[#fffdf9] shadow-[0_24px_60px_-40px_rgba(22,18,15,0.45)]">
      <div className="border-b border-line bg-paper-2/70 px-6 pb-5 pt-6 md:px-7">
        <div className="flex items-end justify-between gap-4">
          <p className="leading-none">
            <span className="display text-5xl text-ink">{session.price ? formatPrice(session.price) : "Free"}</span>
            {session.price > 0 && <span className="ml-2 text-sm text-muted">per seat</span>}
          </p>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${seatsTight ? "bg-accent text-white" : "bg-[#dde8de] text-moss"}`}>
            {seatsTight ? `Only ${session.seatsLeft} left` : `${session.seatsLeft} seats left`}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper-3" aria-hidden>
          <div className="h-full rounded-full bg-gradient-to-r from-accent to-[#f08a4b]" style={{ width: `${filledPct}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">{session.seatsTaken > 0 ? `${session.seatsTaken} of ${session.capacity} seats taken` : `Small group of ${session.capacity}. Be the first to book!`}</p>
      </div>
      <div className="p-6 md:p-7">
        <h2 className="display text-3xl">Reserve your seat</h2>
        {!student ? (
          <div className="mt-5">
            <LoginToContinue next={`/sessions/${session.slug}#book`} action="book your seat" google={google} />
          </div>
        ) : (
        <>
        <p className="mt-1 text-sm text-muted">Booking as <strong className="text-ink">{student.email}</strong>. It will show up in your account.</p>
        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="bk-name" className="label">Full name</label>
            <input id="bk-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} maxLength={100} aria-invalid={!!errors.name} />
            {errors.name && <p className="mt-1.5 text-sm text-accent-deep">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bk-email" className="label">Email</label>
              <input id="bk-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} maxLength={200} aria-invalid={!!errors.email} readOnly={!!student} />
              {errors.email && <p className="mt-1.5 text-sm text-accent-deep">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="bk-phone" className="label">Phone (WhatsApp)</label>
              <input id="bk-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} maxLength={30} aria-invalid={!!errors.phone} />
              {errors.phone && <p className="mt-1.5 text-sm text-accent-deep">{errors.phone}</p>}
            </div>
          </div>
          <div>
            <label htmlFor="bk-notes" className="label">What do you want help with? <span className="font-normal text-muted">(optional)</span></label>
            <textarea id="bk-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={field} maxLength={1500} placeholder="e.g. 3rd-year CSE, CGPA 7.4, targeting MEXT and Max Planck internships" />
          </div>
          <TermsCheckbox id="bk-terms" checked={agree} onChange={(v) => { setAgree(v); if (v) setErrors((e) => ({ ...e, acceptTerms: "" })); }} termsHref="/session-terms" termsLabel="session terms" error={errors.acceptTerms} />
        </div>
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="bk-website">Website</label>
          <input id="bk-website" ref={website} tabIndex={-1} autoComplete="off" />
        </div>
        {errors.form && <p role="alert" className="mt-5 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-deep">{errors.form}</p>}
        <button type="submit" disabled={busy || session.seatsLeft === 0} className="btn btn-accent mt-6 w-full !py-3.5 text-base">
          {busy ? <Loader2 className="size-4 animate-spin" /> : session.price ? <Lock className="size-4" /> : null}
          {stage === "paying" ? "Complete the payment…" : busy ? "Please wait…" : session.price ? `Pay ${formatPrice(session.price)} & book my seat` : "Book my free seat"}
        </button>
        {session.price > 0 && <p className="mt-3 text-center text-xs text-muted">{payNote}</p>}
        </>
        )}
        <ul className="mt-6 grid grid-cols-1 gap-2.5 border-t border-line pt-5 text-[0.82rem] text-ink-2 sm:grid-cols-2">
          <li className="flex items-center gap-2"><MailCheck className="size-4 shrink-0 text-moss" /> Instant confirmation by email</li>
          <li className="flex items-center gap-2"><BadgeCheck className="size-4 shrink-0 text-moss" /> Join link + 1-hour reminder</li>
          <li className="flex items-center gap-2"><ShieldCheck className="size-4 shrink-0 text-moss" /> {session.price ? "Secure checkout" : "No payment needed"}</li>
          <li className="flex items-center gap-2"><RotateCcw className="size-4 shrink-0 text-moss" /> {session.price ? "Full refund if we cancel" : "Free, just show up"}</li>
        </ul>
      </div>
      {demo && (
        <DemoCheckout
          info={demo.info}
          onSuccess={payDemo}
          onFail={() => closeDemo("The payment failed (demo). Please try again.")}
          onDismiss={() => closeDemo("Payment was cancelled. You can try again whenever you're ready.")}
        />
      )}
    </form>
  );
}
