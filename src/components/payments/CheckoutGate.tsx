import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-5">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/**
 * Shown instead of the checkout to visitors who aren't signed in: booking and
 * buying need an account. "Continue with Google" signs up or logs in in one
 * step and comes straight back to this page (no login page in between).
 */
export function LoginToContinue({ next, action, google }: { next: string; action: string; google?: boolean }) {
  const q = encodeURIComponent(next);
  return (
    <div className="rounded-2xl border border-dashed border-line bg-paper-2/60 p-5 text-center">
      <p className="font-medium text-ink">Log in to {action}</p>
      <p className="mt-1 text-sm text-ink-2">You need a free account first. It keeps your bookings, receipts and downloads in one place.</p>
      {google && (
        <>
          <a href={`/api/account/google?next=${q}`} className="mt-4 flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-white text-[0.95rem] font-medium text-ink shadow-sm transition-colors hover:border-ink/30">
            <GoogleIcon /> Continue with Google
          </a>
          <div className="my-3 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" /></div>
        </>
      )}
      <div className={cn("flex flex-col gap-2 sm:flex-row sm:justify-center", !google && "mt-4")}>
        <Link href={`/account/login?mode=signup&next=${q}`} className="btn btn-accent !py-3"><UserPlus className="size-4" /> Create account</Link>
        <Link href={`/account/login?next=${q}`} className="btn btn-ghost !py-3 text-accent-deep"><LogIn className="size-4" /> Log in</Link>
      </div>
    </div>
  );
}

/** "I agree to the terms" box that must be ticked before checkout. Links open in a new tab so the form keeps its state. */
export function TermsCheckbox({ checked, onChange, termsHref, termsLabel, error, id }: { checked: boolean; onChange: (v: boolean) => void; termsHref: string; termsLabel: string; error?: string; id: string }) {
  return (
    <div>
      <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm leading-relaxed text-ink-2", error ? "border-accent bg-accent-soft/50" : "border-line bg-paper-2/40")}>
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]" aria-invalid={!!error} />
        <span>
          I have read and agree to the{" "}
          <a href={termsHref} target="_blank" rel="noopener" className="font-medium text-ink underline underline-offset-2">{termsLabel}</a>,{" "}
          <a href="/refund-policy" target="_blank" rel="noopener" className="font-medium text-ink underline underline-offset-2">refund policy</a> and{" "}
          <a href="/privacy" target="_blank" rel="noopener" className="font-medium text-ink underline underline-offset-2">privacy policy</a>.
        </span>
      </label>
      {error && <p className="mt-1.5 text-sm text-accent-deep">{error}</p>}
    </div>
  );
}
