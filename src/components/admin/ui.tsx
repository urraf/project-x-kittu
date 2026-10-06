"use client";

import { forwardRef, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { useNow } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3.5 text-[0.8rem]" : "h-10 px-4.5 text-[0.88rem]",
        variant === "primary" && "bg-ink text-cream hover:bg-ink-2",
        variant === "accent" && "bg-accent text-white hover:bg-accent-deep",
        variant === "secondary" && "border border-line bg-[#fffdf9] text-ink hover:border-ink/40",
        variant === "ghost" && "text-ink-2 hover:bg-paper-2 hover:text-ink",
        variant === "danger" && "border border-accent/30 bg-[#fffdf9] text-accent-deep hover:bg-accent-soft",
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});

/* ------------------------------------------------------------------ */
/* Form primitives                                                     */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  error,
  htmlFor,
  counter,
  className,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  htmlFor?: string;
  counter?: { value: number; max: number; ideal?: [number, number] };
  className?: string;
  children: React.ReactNode;
}) {
  const tone = counter
    ? counter.value > counter.max
      ? "text-accent-deep"
      : counter.ideal && (counter.value < counter.ideal[0] || counter.value > counter.ideal[1])
        ? "text-[#a8741a]"
        : "text-moss"
    : "";
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="label">{label}</label>
        {counter && <span className={cn("font-mono text-[0.7rem]", tone)}>{counter.value}/{counter.max}</span>}
      </div>
      {children}
      {error ? <p className="mt-1.5 text-[0.78rem] text-accent-deep">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4", disabled && "cursor-not-allowed opacity-60")}>
      <span>
        <span className="block text-[0.88rem] font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[0.78rem] text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-ink" : "bg-paper-3")}
      >
        <span className={cn("absolute left-0 top-0.5 size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[1.375rem]" : "translate-x-0.5")} />
      </button>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Layout & feedback                                                   */
/* ------------------------------------------------------------------ */

export function PageHeader({ title, description, actions, kicker }: { title: React.ReactNode; description?: string; actions?: React.ReactNode; kicker?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        {kicker && <p className="kicker text-muted">{kicker}</p>}
        <h1 className="display mt-1 text-[2.6rem] leading-none md:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-[0.95rem] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("card p-5 md:p-6", className)}>{children}</div>;
}

export function StatusBadge({ status, publishedAt }: { status: string; publishedAt?: string }) {
  const now = useNow();
  const scheduled = status === "published" && publishedAt && new Date(publishedAt).getTime() > now;
  const label = scheduled ? "Scheduled" : status === "published" ? "Published" : "Draft";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-medium",
        scheduled ? "bg-[#f3e6c8] text-[#7a5410]" : status === "published" ? "bg-[#dde8de] text-moss" : "bg-paper-3 text-ink-2",
      )}
    >
      <span className={cn("size-1.5 rounded-full", scheduled ? "bg-[#c08a1e]" : status === "published" ? "bg-moss" : "bg-muted")} />
      {label}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-muted", className)} />;
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-sm text-muted">
      <Spinner /> {label}
    </div>
  );
}

export function AdminEmpty({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <p className="display text-3xl">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm text-ink-2">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dialog (native <dialog> for focus trapping & Esc handling)          */
/* ------------------------------------------------------------------ */

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-auto max-h-[90vh] w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-line bg-paper p-0 text-ink shadow-2xl backdrop:bg-night/60 backdrop:backdrop-blur-sm",
        size === "md" ? "max-w-lg" : size === "lg" ? "max-w-3xl" : "max-w-5xl",
      )}
    >
      {open && (
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="display text-2xl">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full hover:bg-paper-2">
              <X className="size-4" />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line bg-paper-2/60 px-6 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
  loading,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="accent" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="text-[0.95rem] text-ink-2">{message}</div>
    </Dialog>
  );
}
