import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function SectionHeader({
  kicker,
  title,
  description,
  href,
  linkLabel,
  tone = "light",
  className,
}: {
  kicker: string;
  title: React.ReactNode;
  description?: string;
  href?: string;
  linkLabel?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", className)} data-reveal>
      <div className="max-w-2xl">
        <p className={cn("kicker flex items-center gap-3", tone === "dark" ? "text-cream-muted" : "text-muted")}>
          <span className="h-px w-8 bg-accent" />
          {kicker}
        </p>
        <h2 className={cn("display mt-5 text-[2.6rem] md:text-6xl", tone === "dark" ? "text-cream" : "text-ink")}>{title}</h2>
        {description && <p className={cn("mt-5 max-w-xl text-[1.05rem] leading-relaxed", tone === "dark" ? "text-cream-muted" : "text-ink-2")}>{description}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className={cn("group inline-flex shrink-0 items-center gap-2 text-[0.95rem] font-medium", tone === "dark" ? "text-cream" : "text-ink")}
        >
          <span className="link-underline">{linkLabel ?? "View all"}</span>
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
