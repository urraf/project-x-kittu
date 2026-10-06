"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

type Errors = Partial<Record<"name" | "email" | "message" | "form", string>>;

export function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [errors, setErrors] = useState<Errors>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form.entries());
    const next: Errors = {};
    if (String(body.name ?? "").trim().length < 2) next.name = "Please tell me your name.";
    if (!/^\S+@\S+\.\S+$/.test(String(body.email ?? ""))) next.email = "Please enter a valid email.";
    if (String(body.message ?? "").trim().length < 20) next.message = "A little more detail helps (20+ characters).";
    setErrors(next);
    if (Object.keys(next).length) return;

    setState("sending");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        const details = json?.error?.details as { path: string; message: string }[] | undefined;
        const fieldErrors: Errors = {};
        details?.forEach((d) => ((fieldErrors as Record<string, string>)[d.path] = d.message));
        setErrors({ ...fieldErrors, form: json?.error?.message ?? "Something went wrong. Please try again." });
        setState("idle");
        return;
      }
      setState("sent");
    } catch {
      setErrors({ form: "Network error. Please check your connection and try again." });
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="flex flex-col items-start rounded-2xl border border-line bg-paper-2 p-8" role="status">
        <CheckCircle2 className="size-8 text-accent" />
        <h3 className="display mt-5 text-4xl">Message received.</h3>
        <p className="mt-3 max-w-md text-ink-2">Thank you for reaching out. I read every message personally and usually reply within a few days.</p>
      </div>
    );
  }

  const field = "w-full border-0 border-b border-line bg-transparent px-0 py-3 text-[1.02rem] text-ink outline-none transition-colors placeholder:text-muted focus:border-ink";
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="kicker text-muted">Your name</label>
          <input id="c-name" name="name" autoComplete="name" className={field} aria-invalid={!!errors.name} aria-describedby={errors.name ? "c-name-err" : undefined} />
          {errors.name && <p id="c-name-err" className="mt-2 text-sm text-accent-deep">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="c-email" className="kicker text-muted">Email</label>
          <input id="c-email" name="email" type="email" autoComplete="email" className={field} aria-invalid={!!errors.email} aria-describedby={errors.email ? "c-email-err" : undefined} />
          {errors.email && <p id="c-email-err" className="mt-2 text-sm text-accent-deep">{errors.email}</p>}
        </div>
      </div>
      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <label htmlFor="c-org" className="kicker text-muted">Organisation (optional)</label>
          <input id="c-org" name="organisation" autoComplete="organization" className={field} />
        </div>
        <div>
          <label htmlFor="c-topic" className="kicker text-muted">What&apos;s this about?</label>
          <select id="c-topic" name="topic" defaultValue="collaboration" className={`${field} cursor-pointer`}>
            <option value="collaboration">Brand / university collaboration</option>
            <option value="speaking">Talk, webinar or workshop</option>
            <option value="question">A question about applying</option>
            <option value="other">Something else</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="c-msg" className="kicker text-muted">Message</label>
        <textarea id="c-msg" name="message" rows={5} className={`${field} resize-y`} aria-invalid={!!errors.message} aria-describedby={errors.message ? "c-msg-err" : undefined} />
        {errors.message && <p id="c-msg-err" className="mt-2 text-sm text-accent-deep">{errors.message}</p>}
      </div>
      {/* Honeypot: hidden from people, tempting for bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {errors.form && <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-deep" role="alert">{errors.form}</p>}
      <button type="submit" className="btn btn-ink" disabled={state === "sending"}>
        {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : null}
        {state === "sending" ? "Sending…" : "Send message"}
        {state !== "sending" && <ArrowRight className="size-4" />}
      </button>
    </form>
  );
}
