import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, Star, Video } from "lucide-react";
import { discountPct } from "@/components/store/ProductCard";
import { formatDuration, formatPrice, formatSessionDate, formatSessionTime } from "@/lib/utils/session-time";
import { cn } from "@/lib/utils/cn";
import type { ProductDTO } from "@/lib/services/store";
import type { MentorSessionDTO } from "@/lib/types";

/** Compact, booking-first cards for the sessions page (in the spirit of creator storefronts). */

function Shell({ href, children, footer }: { href: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-2xl border border-line bg-[#fffdf9] transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-[0_18px_40px_-30px_rgba(29,43,69,0.55)]"
    >
      <div className="flex-1 p-5">{children}</div>
      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5">
        {footer}
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-cream transition-colors group-hover:bg-accent">
          <ArrowRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}

function Chip({ children, tone = "accent" }: { children: React.ReactNode; tone?: "accent" | "moss" | "gold" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[0.7rem] font-medium",
        tone === "accent" && "bg-accent-soft text-accent-deep",
        tone === "moss" && "bg-matcha-soft text-moss",
        tone === "gold" && "bg-[#f3e6c8] text-[#7a5410]",
      )}
    >
      {children}
    </span>
  );
}

export function SessionServiceCard({ session, rating }: { session: MentorSessionDTO; rating?: number }) {
  const full = session.seatsLeft === 0;
  const tight = !full && session.seatsLeft <= Math.max(3, Math.ceil(session.capacity * 0.3));
  return (
    <Shell
      href={`/sessions/${session.slug}`}
      footer={
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-semibold text-ink">{session.price ? formatPrice(session.price) : "FREE"}</span>
          {full ? <Chip>Fully booked</Chip> : tight ? <Chip>Only {session.seatsLeft} left</Chip> : null}
        </span>
      }
    >
      <p className="flex items-center justify-between gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><Video className="size-3.5 text-accent" /> Live session · {formatDuration(session.durationMin)}</span>
        {rating ? <span className="inline-flex items-center gap-1 text-ink-2"><Star className="size-3.5 fill-current text-[#c08a1e]" /> {rating.toFixed(1)}</span> : null}
      </p>
      <h3 className="mt-2 text-[1.06rem] font-semibold leading-snug text-ink group-hover:text-accent-deep">{session.title}</h3>
      {session.summary && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-2">{session.summary}</p>}
      <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-paper-2 px-2.5 py-1 text-xs text-ink-2">
        <CalendarDays className="size-3.5" /> {formatSessionDate(session.startsAt)} · {formatSessionTime(session.startsAt)} IST
      </p>
    </Shell>
  );
}

export function ProductServiceCard({ product }: { product: ProductDTO }) {
  const off = discountPct(product);
  return (
    <Shell
      href={`/store/${product.slug}`}
      footer={
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-semibold text-ink">{product.price ? formatPrice(product.price) : "FREE"}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price && <span className="text-sm text-muted line-through">{formatPrice(product.compareAtPrice)}</span>}
          {product.featured ? <Chip tone="gold">Bestseller</Chip> : off >= 40 ? <Chip>{off}% off</Chip> : null}
        </span>
      }
    >
      <p className="flex items-center gap-1.5 text-xs text-muted"><FileText className="size-3.5 text-accent" /> Digital product · {product.category}</p>
      <h3 className="mt-2 text-[1.06rem] font-semibold leading-snug text-ink group-hover:text-accent-deep">{product.title}</h3>
      {product.summary && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-2">{product.summary}</p>}
    </Shell>
  );
}
