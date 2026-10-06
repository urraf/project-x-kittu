import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** The rising-sun mark: a vermilion disc cut by two horizon lines (pure paths, no ids). */
export function SunMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="var(--color-accent)">
      <path d="M1.543 20A15 15 0 1 1 30.457 20Z" />
      <path d="M2.085 21.6H29.915A15 15 0 0 1 28.56 24.2H3.44A15 15 0 0 1 2.085 21.6Z" />
      <path d="M4.311 25.4H27.689A15 15 0 0 1 4.311 25.4Z" />
    </svg>
  );
}

export function Logo({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <Link href="/" aria-label="Life of KittuKun, home" className={cn("group inline-flex items-center gap-2.5", className)}>
      <SunMark className="size-8 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5 group-hover:rotate-[-8deg]" />
      <span className="flex flex-col leading-none">
        <span className={cn("kicker !text-[0.56rem] !tracking-[0.3em]", tone === "light" ? "text-cream-muted" : "text-muted")}>Life of</span>
        <span className={cn("display -mt-0.5 text-[1.45rem] italic", tone === "light" ? "text-cream" : "text-ink")}>KittuKun</span>
      </span>
    </Link>
  );
}
