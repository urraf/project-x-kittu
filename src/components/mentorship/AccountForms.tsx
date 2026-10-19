"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Loader2, LogOut, Star } from "lucide-react";
import { PasswordInput } from "@/components/mentorship/StudentAuth";
import { cn } from "@/lib/utils/cn";

async function post<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    const err = new Error(json?.error?.message ?? "Something went wrong. Please try again.") as Error & { details?: { path: string; message: string }[] };
    err.details = json?.error?.details;
    throw err;
  }
  return json.data as T;
}

/** Change password from the student panel (other devices get signed out). */
export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    if (next.length < 8) return setErrors({ newPassword: "Use at least 8 characters." });
    setState("saving");
    try {
      await post("/api/account/password", { currentPassword: current, newPassword: next });
      setState("saved");
      setCurrent("");
      setNext("");
    } catch (err) {
      const e2 = err as Error & { details?: { path: string; message: string }[] };
      const f: Record<string, string> = {};
      e2.details?.forEach((d) => (f[d.path] ||= d.message));
      setErrors({ ...f, form: e2.message });
      setState("idle");
    }
  }
  return (
    <form onSubmit={save} noValidate className="space-y-4">
      <div>
        <label className="label" htmlFor="pw-current">Current password</label>
        <PasswordInput id="pw-current" value={current} onChange={(v) => (setCurrent(v), setState("idle"))} autoComplete="current-password" invalid={!!errors.currentPassword} />
      </div>
      <div>
        <label className="label" htmlFor="pw-new">New password</label>
        <PasswordInput id="pw-new" value={next} onChange={(v) => (setNext(v), setState("idle"))} autoComplete="new-password" invalid={!!errors.newPassword} />
        {errors.newPassword && !errors.form ? <p className="mt-1.5 text-sm text-accent-deep">{errors.newPassword}</p> : <p className="hint">At least 8 characters.</p>}
      </div>
      {errors.form && <p className="text-sm text-accent-deep">{errors.form}</p>}
      {state === "saved" && <p className="text-sm text-moss">Password changed. Other devices have been signed out.</p>}
      <button type="submit" disabled={state === "saving" || !current || !next} className="btn btn-ink !py-2.5">
        {state === "saving" ? <Loader2 className="size-4 animate-spin" /> : state === "saved" ? <CheckCircle2 className="size-4" /> : null}
        {state === "saved" ? "Changed" : "Change password"}
      </button>
    </form>
  );
}

export function ProfileForm({ initial }: { initial: { name: string; phone: string; email: string } }) {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setState("saving");
    try {
      await post("/api/account/profile", { name, phone }, "PATCH");
      setState("saved");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }
  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label className="label" htmlFor="pf-email">Email</label>
        <input id="pf-email" value={initial.email} disabled className="field opacity-70" />
      </div>
      <div>
        <label className="label" htmlFor="pf-name">Name</label>
        <input id="pf-name" value={name} onChange={(e) => (setName(e.target.value), setState("idle"))} className="field" maxLength={100} />
      </div>
      <div>
        <label className="label" htmlFor="pf-phone">Phone</label>
        <input id="pf-phone" value={phone} onChange={(e) => (setPhone(e.target.value), setState("idle"))} className="field" maxLength={30} />
      </div>
      {error && <p className="text-sm text-accent-deep">{error}</p>}
      <button type="submit" disabled={state === "saving"} className="btn btn-ink !py-2.5">
        {state === "saving" ? <Loader2 className="size-4 animate-spin" /> : state === "saved" ? <CheckCircle2 className="size-4" /> : null}
        {state === "saved" ? "Saved" : "Save"}
      </button>
    </form>
  );
}

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        await post("/api/account/logout", {}).catch(() => {});
        // Full reload so the server re-renders without the session cookie.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/account/login");
      }}
      className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
    >
      <LogOut className="size-4" /> Log out
    </button>
  );
}

const LABELS = ["", "Not helpful", "Could be better", "Good", "Very helpful", "Amazing"];

/** Star rating + review form behind a one-time feedback link (one per booking or purchase). */
export function FeedbackForm({ token, kind, defaultName }: { token: string; kind: "session" | "product"; defaultName: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [name, setName] = useState(defaultName);
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!rating) return setError("Choose a star rating.");
    setState("saving");
    try {
      await post(`/api/feedback/${token}`, { rating, text, name });
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }
  if (state === "done") {
    return (
      <div className="rounded-2xl border border-line bg-[#fffdf9] p-6 text-center" role="status">
        <CheckCircle2 className="mx-auto size-10 text-moss" />
        <h2 className="display mt-3 text-4xl">Thank you!</h2>
        <p className="mt-2 text-ink-2">Your feedback has been received. It helps other students decide, and it helps us get better.</p>
        <Link href={kind === "session" ? "/sessions" : "/store"} className="btn btn-ink mt-5">{kind === "session" ? "See upcoming sessions" : "Browse the study store"}</Link>
      </div>
    );
  }
  const shown = hover || rating;
  return (
    <form onSubmit={submit} noValidate className="rounded-2xl border border-line bg-[#fffdf9] p-6 md:p-7">
      <p className="label">{kind === "session" ? "How was the session?" : "How useful was it?"}</p>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={rating === i}
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            onClick={() => setRating(i)}
            onMouseEnter={() => setHover(i)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star className={cn("size-9", i <= shown ? "fill-[#e0a43a] text-[#e0a43a]" : "text-line")} />
          </button>
        ))}
        <span className="ml-2 text-sm text-ink-2">{LABELS[shown]}</span>
      </div>
      <div className="mt-5">
        <label htmlFor="fb-text" className="label">Your review {kind === "session" && <span className="font-normal text-muted">(shown on the website)</span>}</label>
        <textarea id="fb-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} className="field" placeholder="What did you find most useful?" />
      </div>
      <div className="mt-4">
        <label htmlFor="fb-name" className="label">Name to show</label>
        <input id="fb-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="field" />
        <p className="hint">Tip: you can use just your first name.</p>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-deep">{error}</p>}
      <p className="mt-5 text-xs text-muted">You can send feedback once with this link, so take your time.</p>
      <button type="submit" disabled={state === "saving"} className="btn btn-accent mt-6 w-full !py-3.5">
        {state === "saving" && <Loader2 className="size-4 animate-spin" />} Submit feedback
      </button>
    </form>
  );
}
