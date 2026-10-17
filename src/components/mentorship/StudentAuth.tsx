"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ApiError = Error & { details?: { path: string; message: string }[] };

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    const err = new Error(json?.error?.message ?? "Something went wrong. Please try again.") as ApiError;
    err.details = json?.error?.details;
    throw err;
  }
  return json.data as T;
}

const fieldErrors = (e: unknown) => {
  const out: Record<string, string> = {};
  (e as ApiError).details?.forEach((d) => (out[d.path] ||= d.message));
  return out;
};

/** Only same-site paths, so a crafted link can't send people elsewhere after login. */
const safeNext = (next?: string) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/account");

export type AuthMode = "login" | "signup" | "forgot";

export function PasswordInput({ id, value, onChange, autoComplete, invalid }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} className="field pr-12" maxLength={128} aria-invalid={invalid} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted hover:text-ink">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1.5 text-sm text-accent-deep">{msg}</p> : null;
}

function FormError({ msg }: { msg?: string }) {
  return msg ? <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-deep">{msg}</p> : null;
}

function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={busy} className="btn btn-ink w-full !py-3.5 text-base">
      {busy && <Loader2 className="size-4 animate-spin" />} {children}
    </button>
  );
}

/** "Resend code" with a short cooldown so people don't hammer it. */
function useCooldown(seconds: number) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!left) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return { left, start: () => setLeft(seconds) };
}

function CodeInput({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid?: boolean }) {
  return (
    <input
      id="auth-code"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      placeholder="••••••"
      className="field text-center font-mono text-2xl tracking-[0.6em]"
      aria-invalid={invalid}
      autoFocus
    />
  );
}

/**
 * One card for everything account-related: log in, sign up (with a code sent
 * to the email) and forgot password. Switching modes keeps the email typed.
 */
export function StudentAuth({ initialMode = "login", next, google = false, notice }: { initialMode?: AuthMode; next?: string; google?: boolean; notice?: string }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<"details" | "code">("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const cooldown = useCooldown(30);

  const go = (m: AuthMode) => {
    setMode(m);
    setStep("details");
    setErrors({});
    setCode("");
    setPassword("");
  };

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErrors({});
    try {
      await fn();
    } catch (e) {
      const f = fieldErrors(e);
      setErrors({ ...f, form: Object.keys(f).length && !f.code && !f.currentPassword ? "" : (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const finish = () => {
    // Full navigation so the header and pages re-render as signed in.
    window.location.assign(safeNext(next));
  };

  const cleanPhone = () => phone.trim().replace(/^(\+\d{1,3})[\s-]*\1[\s-]*/, "$1 ").replace(/\s{2,}/g, " ");

  const sendSignupCode = () =>
    run(async () => {
      await post("/api/account/signup", { name, email, phone: cleanPhone(), password });
      setStep("code");
      setCode("");
      cooldown.start();
    });

  const sendResetCode = () =>
    run(async () => {
      await post("/api/account/password/forgot", { email });
      setStep("code");
      setCode("");
      cooldown.start();
    });

  const tabs = (
    <div role="tablist" aria-label="Account" className="grid grid-cols-2 rounded-full bg-paper-2 p-1 text-sm">
      {(["login", "signup"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          onClick={() => go(m)}
          className={cn("rounded-full py-2.5 font-medium transition-colors", mode === m ? "bg-ink text-cream shadow-sm" : "text-ink-2 hover:text-ink")}
        >
          {m === "login" ? "Log in" : "Sign up"}
        </button>
      ))}
    </div>
  );

  const codeStep = (title: string, onResend: () => void, children: React.ReactNode) => (
    <div className="space-y-5">
      <button type="button" onClick={() => setStep("details")} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back
      </button>
      <div className="flex items-start gap-3 rounded-2xl bg-paper-2 p-4">
        <MailCheck className="mt-0.5 size-5 shrink-0 text-accent" />
        <div>
          <p className="font-medium text-ink">{title}</p>
          <p className="mt-0.5 text-sm text-ink-2">
            We sent a 6-digit code to <strong className="break-all text-ink">{email}</strong>. Check your spam folder if you don&apos;t see it.
          </p>
        </div>
      </div>
      {children}
      <p className="text-center text-sm text-muted">
        Didn&apos;t get it?{" "}
        <button type="button" onClick={onResend} disabled={cooldown.left > 0 || busy} className="font-medium text-ink underline underline-offset-4 disabled:text-muted disabled:no-underline">
          {cooldown.left > 0 ? `Resend in ${cooldown.left}s` : "Resend code"}
        </button>
      </p>
    </div>
  );

  return (
    <div className="rounded-3xl border border-line bg-[#fffdf9] p-6 shadow-[0_24px_60px_-40px_rgba(22,18,15,0.45)] md:p-8">
      {mode !== "forgot" && step === "details" && <div className="mb-7">{tabs}</div>}
      {notice && <p role="alert" className="mb-5 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-deep">{notice}</p>}
      {google && mode !== "forgot" && step === "details" && (
        <>
          <a
            href={`/api/account/google${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-[#fffdf9] text-[0.95rem] font-medium text-ink transition-colors hover:border-ink/40 hover:bg-paper-2"
          >
            <svg viewBox="0 0 48 48" aria-hidden className="size-5">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            Continue with Google
          </a>
          <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" /></div>
        </>
      )}

      {/* ---------------- Log in ---------------- */}
      {mode === "login" && (
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await post("/api/account/login", { email, password });
              finish();
            });
          }}
        >
          <div>
            <label htmlFor="auth-email" className="label">Email</label>
            <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" maxLength={200} aria-invalid={!!errors.email} />
            <Err msg={errors.email} />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="auth-password" className="label">Password</label>
              <button type="button" onClick={() => go("forgot")} className="text-xs font-medium text-accent-deep hover:underline">Forgot password?</button>
            </div>
            <PasswordInput id="auth-password" value={password} onChange={setPassword} autoComplete="current-password" invalid={!!errors.password} />
            <Err msg={errors.password} />
          </div>
          <FormError msg={errors.form} />
          <Submit busy={busy}>Log in</Submit>
          <p className="pt-1 text-center text-sm text-ink-2">
            New here?{" "}
            <button type="button" onClick={() => go("signup")} className="font-medium text-ink underline underline-offset-4">Create an account</button>
          </p>
          <p className="text-center text-xs text-muted">Booked a session already? Your login details are in the booking email.</p>
        </form>
      )}

      {/* ---------------- Sign up ---------------- */}
      {mode === "signup" && step === "details" && (
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            sendSignupCode();
          }}
        >
          <div>
            <label htmlFor="auth-name" className="label">Full name</label>
            <input id="auth-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="field" maxLength={100} aria-invalid={!!errors.name} />
            <Err msg={errors.name} />
          </div>
          <div>
            <label htmlFor="auth-email" className="label">Email</label>
            <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" maxLength={200} aria-invalid={!!errors.email} />
            <Err msg={errors.email} />
          </div>
          <div>
            <label htmlFor="auth-phone" className="label">Phone (WhatsApp)</label>
            <input id="auth-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="field" maxLength={30} aria-invalid={!!errors.phone} />
            <Err msg={errors.phone} />
          </div>
          <div>
            <label htmlFor="auth-password" className="label">Create a password</label>
            <PasswordInput id="auth-password" value={password} onChange={setPassword} autoComplete="new-password" invalid={!!errors.password} />
            {errors.password ? <Err msg={errors.password} /> : <p className="hint">At least 8 characters.</p>}
          </div>
          <FormError msg={errors.form} />
          <Submit busy={busy}>Continue</Submit>
          <p className="text-center text-xs text-muted">We&apos;ll email you a code to confirm it&apos;s really you.</p>
        </form>
      )}
      {mode === "signup" && step === "code" &&
        codeStep(
          "Confirm your email",
          sendSignupCode,
          <form
            noValidate
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await post("/api/account/signup/verify", { email, code });
                finish();
              });
            }}
          >
            <div>
              <label htmlFor="auth-code" className="label">6-digit code</label>
              <CodeInput value={code} onChange={setCode} invalid={!!errors.code} />
            </div>
            <FormError msg={errors.form || errors.code} />
            <Submit busy={busy}>Create my account</Submit>
          </form>,
        )}

      {/* ---------------- Forgot password ---------------- */}
      {mode === "forgot" && (
        <>
          <button type="button" onClick={() => go("login")} className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> Back to log in
          </button>
          {step === "details" ? (
            <form
              noValidate
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                sendResetCode();
              }}
            >
              <div>
                <h2 className="display text-3xl">Forgot your password?</h2>
                <p className="mt-1.5 text-sm text-ink-2">Enter your email and we&apos;ll send you a code to set a new one.</p>
              </div>
              <div>
                <label htmlFor="auth-email" className="label">Email</label>
                <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" maxLength={200} aria-invalid={!!errors.email} />
                <Err msg={errors.email} />
              </div>
              <FormError msg={errors.form} />
              <Submit busy={busy}>Send code</Submit>
            </form>
          ) : (
            codeStep(
              "Check your email",
              sendResetCode,
              <form
                noValidate
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    await post("/api/account/password/reset", { email, code, newPassword: password });
                    finish();
                  });
                }}
              >
                <div>
                  <label htmlFor="auth-code" className="label">6-digit code</label>
                  <CodeInput value={code} onChange={setCode} invalid={!!errors.code} />
                </div>
                <div>
                  <label htmlFor="auth-password" className="label">New password</label>
                  <PasswordInput id="auth-password" value={password} onChange={setPassword} autoComplete="new-password" invalid={!!errors.newPassword} />
                  {errors.newPassword ? <Err msg={errors.newPassword} /> : <p className="hint">At least 8 characters.</p>}
                </div>
                <FormError msg={errors.form || errors.code} />
                <Submit busy={busy}>Set new password</Submit>
              </form>,
            )
          )}
          <p className="mt-4 text-center text-xs text-muted">If there&apos;s no account with this email, no code is sent.</p>
        </>
      )}
    </div>
  );
}
