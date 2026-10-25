import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Shown instead of the checkout to visitors who aren't signed in: booking and buying need an account. */
export function LoginToContinue({ next, action }: { next: string; action: string }) {
  const q = encodeURIComponent(next);
  return (
    <div className="rounded-2xl border border-dashed border-line bg-paper-2/60 p-5 text-center">
      <p className="font-medium text-ink">Log in to {action}</p>
      <p className="mt-1 text-sm text-ink-2">You need a free account first. It keeps your bookings, receipts and downloads in one place. Takes under a minute, or use Google.</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href={`/account/login?mode=signup&next=${q}`} className="btn btn-accent !py-3"><UserPlus className="size-4" /> Create free account</Link>
        <Link href={`/account/login?next=${q}`} className="btn btn-ghost !py-3 text-ink"><LogIn className="size-4" /> Log in</Link>
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
