import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of use" },
  { href: "/refund-policy", label: "Refunds & cancellations" },
  { href: "/shipping-policy", label: "Delivery policy" },
];

/** Shared layout for the policy pages: title, last-updated date, readable prose and links to the other policies. */
export function LegalPage({ jp, title, updated, path, children }: { jp: string; title: string; updated: string; path: string; children: React.ReactNode }) {
  return (
    <section className="container-x max-w-3xl pb-24 pt-28 md:pt-32">
      <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> <span className="jp text-accent">{jp}</span> Policies</p>
      <h1 className="display mt-5 text-[2.6rem] leading-[1.02] sm:text-6xl">{title}</h1>
      <p className="mt-4 text-sm text-muted">Last updated {updated}</p>
      <div className="prose-kk mt-10">{children}</div>
      <nav aria-label="Policies" className="mt-14 flex flex-wrap gap-2 border-t border-line pt-6">
        {LEGAL_LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={l.href === path ? "page" : undefined} className={cn("chip", l.href === path && "!border-ink !bg-ink !text-cream")}>{l.label}</Link>
        ))}
      </nav>
    </section>
  );
}
