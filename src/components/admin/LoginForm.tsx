"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, RefreshCw, ShieldCheck } from "lucide-react";
import { api, ApiClientError } from "@/lib/admin/api";
import { Button } from "@/components/admin/ui";

type Captcha = { question: string; token: string; expiresInSec: number };

export function LoginForm({ next, emailRequired = false }: { next?: string; emailRequired?: boolean }) {
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [answer, setAnswer] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const loadCaptcha = useCallback(async () => {
    setAnswer("");
    try {
      setCaptcha(await api<Captcha>("/api/admin/auth/captcha"));
    } catch {
      setError("Couldn't load the security question. Please refresh the page.");
    }
  }, []);

  useEffect(() => {
    api<Captcha>("/api/admin/auth/captcha").then(setCaptcha, () => setError("Couldn't load the security question. Please refresh the page."));
  }, []);

  // Captchas expire after a few minutes; refresh quietly before that happens.
  useEffect(() => {
    if (!captcha) return;
    const t = setTimeout(loadCaptcha, Math.max(30, captcha.expiresInSec - 20) * 1000);
    return () => clearTimeout(t);
  }, [captcha, loadCaptcha]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!captcha) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ redirect: string }>("/api/admin/auth/login", {
        body: { email: emailRequired ? email : undefined, password, captchaAnswer: answer, captchaToken: captcha.token, next },
      });
      // Full navigation so the server re-renders with the new session cookie.
      window.location.assign(res.redirect);
    } catch (err) {
      const e = err as ApiClientError;
      setError(e.message);
      setLocked(e.status === 429);
      if (e.code === "invalid_credentials") setPassword("");
      await loadCaptcha();
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {emailRequired && (
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field !h-12"
            placeholder="you@example.com"
          />
        </div>
      )}
      <div>
        <label htmlFor="password" className="label">Password</label>
        <div className="relative">
          <input
            id="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            autoFocus={!emailRequired}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field !h-12 pr-11"
          />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-ink">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="captcha" className="label">Quick check: what is the answer?</label>
        <div className="flex items-stretch gap-2">
          <div className="flex min-w-[7.5rem] items-center justify-center rounded-[10px] border border-line bg-paper-2 px-4 font-mono text-lg tracking-wider text-ink select-none" aria-live="polite">
            {captcha ? `${captcha.question} =` : "…"}
          </div>
          <input
            id="captcha"
            inputMode="numeric"
            autoComplete="off"
            required
            value={answer}
            onChange={(e) => setAnswer(e.target.value.replace(/[^\d-]/g, ""))}
            className="field !h-12 min-w-0 flex-1 text-center font-mono text-lg"
            aria-describedby="captcha-hint"
          />
          <button type="button" onClick={loadCaptcha} aria-label="New question" className="grid w-12 place-items-center rounded-[10px] border border-line text-muted hover:text-ink">
            <RefreshCw className="size-4" />
          </button>
        </div>
        <p id="captcha-hint" className="hint">This keeps bots out. Each question works once.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-deep">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" loading={loading} disabled={!captcha || !password || !answer || locked || (emailRequired && !email.trim())} className="!h-12 w-full">
        <ShieldCheck className="size-4" /> Sign in
      </Button>
    </form>
  );
}
