"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api, ApiClientError, errorMessage } from "@/lib/admin/api";
import { Button, Card, Field } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils/text";
import { cn } from "@/lib/utils/cn";

export type AccountInfo = { email: string | null; passwordChangedAt: string | null; emailChangedAt: string | null };

function strength(p: string) {
  let score = 0;
  if (p.length >= 10) score++;
  if (p.length >= 14) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  return Math.min(4, score);
}
const LABELS = ["Too weak", "Weak", "Okay", "Strong", "Very strong"];
const COLORS = ["bg-accent", "bg-accent", "bg-[#c08a1e]", "bg-moss", "bg-moss"];

function signedOutNote(n: number) {
  return n ? `Signed out ${n} other device${n > 1 ? "s" : ""}.` : undefined;
}

function EmailForm({ info, onChanged }: { info: AccountInfo; onChanged: (email: string) => void }) {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(newEmail.trim())) errs.newEmail = "Enter a valid email address.";
    if (!password) errs.currentPassword = "Enter your current password to confirm.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const res = await api<{ email: string; signedOutSessions: number }>("/api/admin/account/email", { body: { newEmail, currentPassword: password } });
      setNewEmail("");
      setPassword("");
      onChanged(res.email);
      toast.success("Login email updated", { description: signedOutNote(res.signedOutSessions) ?? "Use it next time you sign in." });
    } catch (err) {
      if (err instanceof ApiClientError) setErrors(err.fieldErrors);
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} noValidate className="space-y-5">
        <h2 className="flex items-center gap-2 font-medium"><Mail className="size-4 text-accent" /> Login email</h2>
        <div className="rounded-xl bg-paper-2 px-4 py-3 text-sm">
          <p className="text-xs text-muted">Current login email</p>
          <p className="mt-0.5 font-medium text-ink">{info.email ?? "Not set yet. You sign in with just the password."}</p>
        </div>
        <Field label={info.email ? "New email" : "Email"} htmlFor="acc-email" error={errors.newEmail}>
          <input id="acc-email" type="email" autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="field" placeholder="you@example.com" aria-invalid={!!errors.newEmail} maxLength={200} />
        </Field>
        <Field label="Current password" htmlFor="acc-email-pw" error={errors.currentPassword} hint="Needed to confirm it's you.">
          <input id="acc-email-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" aria-invalid={!!errors.currentPassword} />
        </Field>
        <Button type="submit" variant="primary" loading={saving}>{info.email ? "Update email" : "Save email"}</Button>
      </form>
    </Card>
  );
}

function PasswordForm({ onChanged }: { onChanged: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const s = strength(next);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!current) errs.currentPassword = "Enter your current password.";
    if (next.length < 10) errs.newPassword = "Use at least 10 characters.";
    if (next && confirm !== next) errs.confirmPassword = "The new passwords don't match.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const res = await api<{ changed: boolean; signedOutSessions: number }>("/api/admin/account/password", {
        body: { currentPassword: current, newPassword: next, confirmPassword: confirm },
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      onChanged();
      toast.success("Password changed", { description: signedOutNote(res.signedOutSessions) ?? "Use your new password next time you sign in." });
    } catch (err) {
      if (err instanceof ApiClientError) setErrors(err.fieldErrors);
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const type = show ? "text" : "password";
  return (
    <Card>
      <form onSubmit={submit} noValidate className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-medium"><KeyRound className="size-4 text-accent" /> Password</h2>
          <button type="button" onClick={() => setShow((v) => !v)} className="inline-flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink">
            {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} {show ? "Hide" : "Show"}
          </button>
        </div>
        <Field label="Current password" htmlFor="pw-current" error={errors.currentPassword}>
          <input id="pw-current" type={type} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="field" aria-invalid={!!errors.currentPassword} />
        </Field>
        <Field label="New password" htmlFor="pw-new" error={errors.newPassword} hint="At least 10 characters. A short phrase like “kittu-tokyo-summer-25” works well.">
          <input id="pw-new" type={type} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className="field" aria-invalid={!!errors.newPassword} maxLength={128} />
          {next && (
            <div className="mt-2 flex items-center gap-3" aria-live="polite">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < Math.max(1, s) ? COLORS[s] : "bg-paper-3")} />
                ))}
              </div>
              <span className="text-xs text-muted">{LABELS[s]}</span>
            </div>
          )}
        </Field>
        <Field label="Confirm new password" htmlFor="pw-confirm" error={errors.confirmPassword}>
          <input id="pw-confirm" type={type} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="field" aria-invalid={!!errors.confirmPassword} maxLength={128} />
        </Field>
        <Button type="submit" variant="primary" loading={saving}>Update password</Button>
      </form>
    </Card>
  );
}

/** Settings → Login & password: change the login email and the password. */
export function AccountSettings({ initial }: { initial: AccountInfo }) {
  const [info, setInfo] = useState(initial);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EmailForm info={info} onChanged={(email) => setInfo((i) => ({ ...i, email, emailChangedAt: new Date().toISOString() }))} />
        <PasswordForm onChanged={() => setInfo((i) => ({ ...i, passwordChangedAt: new Date().toISOString() }))} />
      </div>
      <Card className="space-y-2 text-sm text-ink-2">
        <h2 className="flex items-center gap-2 font-medium text-ink"><ShieldCheck className="size-4 text-moss" /> How your login is kept safe</h2>
        <p>
          {info.passwordChangedAt ? <>Password last changed on <strong className="text-ink">{formatDate(info.passwordChangedAt)}</strong>. </> : "You're still using the starting password from setup. We recommend changing it. "}
          {info.emailChangedAt ? <>Email last changed on <strong className="text-ink">{formatDate(info.emailChangedAt)}</strong>.</> : null}
        </p>
        <p>Both are saved in your database. The password is never stored as-is, only a scrambled version (a secure hash), so nobody can read it, not even with database access.</p>
        <p>Changing your email or password signs you out on every other device. This device stays signed in. Forgot your password? Your developer can reset it from the server.</p>
      </Card>
    </div>
  );
}
