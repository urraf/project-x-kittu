"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CheckCircle2, Download, KeyRound, Loader2, Lock, MailCheck, ShieldCheck, Zap } from "lucide-react";
import { LoginToContinue, TermsCheckbox } from "@/components/payments/CheckoutGate";
import { postJson, useCheckout, type CheckoutInfo } from "@/components/payments/useCheckout";
import { PriceTag, discountPct } from "@/components/store/ProductCard";
import { formatPrice } from "@/lib/utils/session-time";
import type { ProductDTO } from "@/lib/services/store";

type Start = { orderId: string; status: "paid"; newAccount: boolean } | { orderId: string; status: "payment_required"; demo: boolean; razorpay: CheckoutInfo };
type Done = { orderId: string; newAccount?: boolean };

export function BuyForm({ product, paymentMode, student }: { product: ProductDTO; paymentMode: "razorpay" | "demo" | "off"; student?: { name: string; email: string; phone: string } | null }) {
  const router = useRouter();
  const [name, setName] = useState(student?.name ?? "");
  const [email, setEmail] = useState(student?.email ?? "");
  const [phone, setPhone] = useState(student?.phone || "+91 ");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const website = useRef<HTMLInputElement>(null);
  const { pay, dialog } = useCheckout<Done>();
  const off = discountPct(product);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/^(\+\d{1,3})[\s-]*\1[\s-]*/, "$1 ").replace(/\s{2,}/g, " ");
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "Enter a valid email address.";
    if (!/^[+\d][\d\s-]{6,}$/.test(cleanPhone) || cleanPhone.replace(/\D/g, "").length < 8) errs.phone = "Enter a valid phone number.";
    if (!agree) errs.acceptTerms = "Please tick the box to accept the terms before continuing.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const start = await postJson<Start>(`/api/store/${product.id}/buy`, {
        name,
        email,
        phone: cleanPhone,
        acceptTerms: agree,
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
          {done.newAccount && (
            <li className="flex gap-3"><KeyRound className="mt-0.5 size-5 shrink-0 text-accent" /> <span>The email also has a <strong className="text-ink">password</strong>, so you can log in with your email next time too.</span></li>
          )}
        </ul>
        <div className="mt-7 flex flex-wrap gap-2">
          <a href={`/api/account/library/${done.orderId}/download`} className="btn btn-accent"><Download className="size-4" /> Download now</a>
          <Link href="/account?tab=library" className="btn btn-ghost text-ink">My library</Link>
        </div>
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
        {!student ? (
          <LoginToContinue next={`/store/${product.slug}#buy`} action={product.price ? "buy this guide" : "get this guide"} />
        ) : (
        <>
        <p className="text-sm text-muted">Buying as <strong className="text-ink">{student.email}</strong>. It goes straight to your library.</p>
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
        <TermsCheckbox id="by-terms" checked={agree} onChange={(v) => { setAgree(v); if (v) setErrors((e) => ({ ...e, acceptTerms: "" })); }} termsHref="/product-terms" termsLabel="study material terms" error={errors.acceptTerms} />
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="by-website">Website</label>
          <input id="by-website" ref={website} tabIndex={-1} autoComplete="off" />
        </div>
        {errors.form && <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-deep">{errors.form}</p>}
        <button type="submit" disabled={busy} className="btn btn-accent w-full !py-3.5 text-base">
          {busy ? <Loader2 className="size-4 animate-spin" /> : product.price ? <Lock className="size-4" /> : <Download className="size-4" />}
          {busy ? "Please wait…" : product.price ? `Buy now · ${formatPrice(product.price)}` : "Get it free"}
        </button>
        {product.price > 0 && <p className="text-center text-xs text-muted">{note}</p>}
        </>
        )}
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
