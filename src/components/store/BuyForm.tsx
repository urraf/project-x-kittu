"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, KeyRound, Loader2, Lock, MailCheck, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { postJson, useCheckout, type CheckoutInfo } from "@/components/payments/useCheckout";
import { PriceTag, discountPct } from "@/components/store/ProductCard";
import { formatPrice } from "@/lib/utils/session-time";
import type { ProductDTO } from "@/lib/services/store";

type Captcha = { question: string; token: string };
type Start = { orderId: string; status: "paid"; newAccount: boolean } | { orderId: string; status: "payment_required"; demo: boolean; razorpay: CheckoutInfo };
type Done = { orderId: string; newAccount?: boolean };

export function BuyForm({ product, paymentMode, student }: { product: ProductDTO; paymentMode: "razorpay" | "demo" | "off"; student?: { name: string; email: string; phone: string } | null }) {
  const router = useRouter();
  const [name, setName] = useState(student?.name ?? "");
  const [email, setEmail] = useState(student?.email ?? "");
  const [phone, setPhone] = useState(student?.phone || "+91 ");
  const [answer, setAnswer] = useState("");
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const website = useRef<HTMLInputElement>(null);
  const { pay, dialog } = useCheckout<Done>();
  const off = discountPct(product);

  const loadCaptcha = () => {
    setAnswer("");
    fetch("/api/captcha", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => j?.ok && setCaptcha(j.data))
      .catch(() => {});
  };
  useEffect(() => {
    if (student) return;
    fetch("/api/captcha", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => j?.ok && setCaptcha(j.data))
      .catch(() => {});
  }, [student]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/^(\+\d{1,3})[\s-]*\1[\s-]*/, "$1 ").replace(/\s{2,}/g, " ");
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "Enter a valid email address.";
    if (!/^[+\d][\d\s-]{6,}$/.test(cleanPhone) || cleanPhone.replace(/\D/g, "").length < 8) errs.phone = "Enter a valid phone number.";
    if (!student && !answer.trim()) errs.captchaAnswer = "Please answer the math question.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const start = await postJson<Start>(`/api/store/${product.id}/buy`, {
        name,
        email,
        phone: cleanPhone,
        captchaToken: captcha?.token,
        captchaAnswer: answer,
        website: website.current?.value ?? "",
      });
      const result = start.status === "paid" ? { orderId: start.orderId, newAccount: start.newAccount } : await pay(`/api/store/orders/${start.orderId}`, start.razorpay, start.demo);
      setDone(result);
      router.refresh();
    } catch (err) {
      const e2 = err as Error & { details?: { path: string; message: string }[] };
      const f: Record<string, string> = {};
      e2.details?.forEach((d) => (f[d.path] = d.message));
      setErrors({ ...f, form: Object.keys(f).length ? "" : e2.message });
      if (!student) loadCaptcha();
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-line bg-[#fffdf9] p-6 shadow-[0_24px_60px_-40px_rgba(29,43,69,0.45)] md:p-8" role="status">
        <CheckCircle2 className="size-11 text-moss" />
        <h2 className="display mt-4 text-4xl">It&apos;s yours!</h2>
        <p className="mt-3 text-ink-2"><strong className="text-ink">{product.title}</strong> is now in your library.</p>
        <ul className="mt-5 space-y-3 text-[0.95rem] text-ink-2">
          <li className="flex gap-3"><MailCheck className="mt-0.5 size-5 shrink-0 text-accent" /> <span>We&apos;ve emailed your receipt to <strong className="break-all text-ink">{email}</strong>.</span></li>
          {!student && (
            <li className="flex gap-3"><KeyRound className="mt-0.5 size-5 shrink-0 text-accent" /> <span>{done.newAccount ? <>Your account is ready. The email has your <strong className="text-ink">login email and password</strong>.</> : <>Log in with your existing password to download.</>}</span></li>
          )}
        </ul>
        {student ? (
          <a href={`/api/account/library/${done.orderId}/download`} className="btn btn-accent mt-7"><Download className="size-4" /> Download now</a>
        ) : (
          <Link href="/account/login?next=/account?tab=library" className="btn btn-ink mt-7">Log in to download</Link>
        )}
      </div>
    );
  }

  const note = paymentMode === "demo" ? "Demo mode: a practice checkout opens, no real money is charged" : paymentMode === "off" ? "Online payments open soon" : "Secure payment by Razorpay · UPI, cards, netbanking & wallets";
  return (
    <form id="buy" onSubmit={submit} noValidate className="scroll-mt-28 overflow-hidden rounded-3xl border border-line bg-[#fffdf9] shadow-[0_24px_60px_-40px_rgba(29,43,69,0.45)]">
      <div className="border-b border-line bg-paper-2/70 px-6 pb-5 pt-6 md:px-7">
        <div className="flex items-end justify-between gap-3">
          <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />
          {off > 0 && <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white">Save {off}%</span>}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-2"><Zap className="size-4 text-gold" /> Instant access after {product.price ? "payment" : "sign-up"} · yours to keep</p>
      </div>
      <div className="space-y-4 p-6 md:p-7">
        {student ? (
          <p className="text-sm text-muted">Buying as <strong className="text-ink">{student.email}</strong>. It goes straight to your library.</p>
        ) : (
          <p className="text-sm text-muted">
            New here? An account is created for you. Have one? <Link href={`/account/login?next=${encodeURIComponent(`/store/${product.slug}#buy`)}`} className="font-medium text-ink underline underline-offset-4">Log in</Link>
          </p>
        )}
        <div>
          <label htmlFor="by-name" className="label">Full name</label>
          <input id="by-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="field" maxLength={100} aria-invalid={!!errors.name} />
          {errors.name && <p className="mt-1.5 text-sm text-accent-deep">{errors.name}</p>}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="by-email" className="label">Email</label>
            <input id="by-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={!!student} className="field" maxLength={200} aria-invalid={!!errors.email} />
            {errors.email && <p className="mt-1.5 text-sm text-accent-deep">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="by-phone" className="label">Phone (WhatsApp)</label>
            <input id="by-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="field" maxLength={30} aria-invalid={!!errors.phone} />
            {errors.phone && <p className="mt-1.5 text-sm text-accent-deep">{errors.phone}</p>}
          </div>
        </div>
        {!student && (
          <div>
            <label htmlFor="by-captcha" className="label">Quick check: what is</label>
            <div className="flex items-stretch gap-2">
              <span className="flex min-w-[6.5rem] select-none items-center justify-center rounded-[10px] border border-line bg-paper-2 px-3 font-mono text-ink" aria-live="polite">{captcha ? `${captcha.question} =` : "…"}</span>
              <input id="by-captcha" inputMode="numeric" autoComplete="off" value={answer} onChange={(e) => setAnswer(e.target.value.replace(/[^\d-]/g, ""))} className="field w-20 text-center font-mono" aria-invalid={!!errors.captchaAnswer} />
              <button type="button" onClick={loadCaptcha} aria-label="New question" className="grid w-11 place-items-center rounded-[10px] border border-line text-muted hover:text-ink"><RefreshCw className="size-4" /></button>
            </div>
            {errors.captchaAnswer && <p className="mt-1.5 text-sm text-accent-deep">{errors.captchaAnswer}</p>}
          </div>
        )}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="by-website">Website</label>
          <input id="by-website" ref={website} tabIndex={-1} autoComplete="off" />
        </div>
        {errors.form && <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-deep">{errors.form}</p>}
        <button type="submit" disabled={busy || (!student && !captcha)} className="btn btn-accent w-full !py-3.5 text-base">
          {busy ? <Loader2 className="size-4 animate-spin" /> : product.price ? <Lock className="size-4" /> : <Download className="size-4" />}
          {busy ? "Please wait…" : product.price ? `Buy now · ${formatPrice(product.price)}` : "Get it free"}
        </button>
        {product.price > 0 && <p className="text-center text-xs text-muted">{note}</p>}
        <ul className="grid grid-cols-1 gap-2.5 border-t border-line pt-4 text-[0.82rem] text-ink-2 sm:grid-cols-2">
          <li className="flex items-center gap-2"><Zap className="size-4 shrink-0 text-moss" /> Instant download</li>
          <li className="flex items-center gap-2"><MailCheck className="size-4 shrink-0 text-moss" /> Receipt by email</li>
          <li className="flex items-center gap-2"><ShieldCheck className="size-4 shrink-0 text-moss" /> {product.price ? "Secure checkout" : "No payment needed"}</li>
          <li className="flex items-center gap-2"><Download className="size-4 shrink-0 text-moss" /> Re-download any time</li>
        </ul>
      </div>
      {dialog}
    </form>
  );
}
