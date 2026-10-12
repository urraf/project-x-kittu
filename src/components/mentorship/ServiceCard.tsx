import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Download, FileText, Star } from "lucide-react";
import { discountPct } from "@/components/store/ProductCard";
import { formatDuration, formatPrice, formatSessionTime } from "@/lib/utils/session-time";
import { cn } from "@/lib/utils/cn";
import type { ProductDTO } from "@/lib/services/store";
import type { MentorSessionDTO } from "@/lib/types";

/** Storefront cards for the sessions page. Live sessions and study material look deliberately different. */

const JP_WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];

/** Month, day and weekday of a session in India time, for the calendar tile. */
function istDate(iso: string) {
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600_000);
  return {
    month: d.toLocaleString("en-IN", { month: "short", timeZone: "UTC" }).toUpperCase(),
    day: d.getUTCDate(),
    weekday: d.toLocaleString("en-IN", { weekday: "short", timeZone: "UTC" }),
    jp: JP_WEEKDAY[d.getUTCDay()],
  };
}

export function SessionServiceCard({ session, rating, compact = false }: { session: MentorSessionDTO; rating?: number; compact?: boolean }) {
  const full = session.seatsLeft === 0;
  const tight = !full && session.seatsLeft <= Math.max(3, Math.ceil(session.capacity * 0.3));
  const date = istDate(session.startsAt);
  const pct = Math.max(6, Math.round((session.seatsTaken / Math.max(1, session.capacity)) * 100));
  return (
    <Link
      href={`/sessions/${session.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-[#fffdf9] transition-all duration-300 hover:-translate-y-1 hover:border-ink/20 hover:shadow-[0_26px_50px_-34px_rgba(29,43,69,0.6)]"
    >
      <div className={cn("img-zoom relative overflow-hidden bg-indigo-soft", compact ? "aspect-[2/1]" : "aspect-[16/9]")}>
        {session.coverImage ? (
          <Image src={session.coverImage.url} alt={session.coverImage.alt || session.title} fill sizes="(min-width: 768px) 26rem, 100vw" placeholder={session.coverImage.blurDataURL ? "blur" : "empty"} blurDataURL={session.coverImage.blurDataURL} className="object-cover" />
        ) : (
          <span aria-hidden className="seigaiha absolute inset-0" />
        )}
        {/* Japanese desk-calendar tile */}
        <span className="absolute right-3 top-3 w-14 overflow-hidden rounded-xl bg-[#fffdf9] text-center shadow-[0_10px_24px_-12px_rgba(29,43,69,0.55)]">
          <span className="block bg-accent py-0.5 text-[0.6rem] font-semibold tracking-[0.14em] text-white">{date.month}</span>
          <span className="display block pt-0.5 text-[1.7rem] leading-none text-ink">{date.day}</span>
          <span className="block pb-1 text-[0.62rem] text-muted"><span className="jp text-accent">{date.jp}</span> {date.weekday}</span>
        </span>
      </div>

      <div className={cn("flex flex-1 flex-col", compact ? "px-4 pb-3 pt-3" : "px-5 pb-4 pt-4")}>
        <p className="flex items-center justify-between gap-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5 text-accent" /> {formatSessionTime(session.startsAt)} IST · {formatDuration(session.durationMin)}</span>
          {rating ? <span className="inline-flex items-center gap-1 text-ink-2"><Star className="size-3.5 fill-current text-[#c08a1e]" /> {rating.toFixed(1)}</span> : null}
        </p>
        <h3 className={cn("mt-2 font-semibold leading-snug text-ink group-hover:text-accent-deep", compact ? "line-clamp-2 text-[1rem]" : "text-[1.08rem]")}>{session.title}</h3>
        {session.summary && !compact && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-2">{session.summary}</p>}
        <div className={cn("mt-auto", compact ? "pt-3" : "pt-4")}>
          <div className="flex items-center justify-between text-[0.72rem] text-muted">
            <span>Group of {session.capacity}</span>
            <span className={cn("font-medium", (full || tight) && "text-accent-deep")}>{full ? "Fully booked" : tight ? `Only ${session.seatsLeft} left` : `${session.seatsLeft} seats left`}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-3" aria-hidden>
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-[#f08a4b]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className={cn("flex items-center justify-between gap-3 border-t border-line bg-paper-2/50", compact ? "px-4 py-2.5" : "px-5 py-3.5")}>
        <span className={cn("display leading-none text-ink", compact ? "text-xl" : "text-2xl")}>{session.price ? formatPrice(session.price) : "Free"}</span>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full font-medium transition-colors", compact ? "px-3.5 py-1.5 text-[0.82rem]" : "px-4 py-2 text-sm", full ? "bg-paper-3 text-ink-2" : "bg-accent text-white group-hover:bg-accent-deep")}>
          {full ? "View details" : "Book seat"} <ArrowRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}

export function ProductServiceCard({ product }: { product: ProductDTO }) {
  const off = discountPct(product);
  return (
    <Link
      href={`/store/${product.slug}`}
      className="group relative flex h-full gap-4 overflow-hidden rounded-3xl border border-[#ead6c4] bg-[#fbf0e6] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[0_22px_44px_-32px_rgba(176,58,32,0.55)]"
    >
      <span aria-hidden className="asanoha absolute inset-0" />
      <div className="img-zoom relative aspect-[16/10] w-36 shrink-0 self-start overflow-hidden rounded-2xl bg-paper-3 ring-1 ring-[#ead6c4] sm:w-40">
        {product.coverImage ? (
          <Image src={product.coverImage.url} alt={product.coverImage.alt || product.title} fill sizes="10rem" className="object-cover" />
        ) : (
          <span aria-hidden className="seigaiha absolute inset-0 bg-sakura" />
        )}
        {off > 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[0.62rem] font-semibold text-white">{off}% off</span>}
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col py-0.5 pr-1">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#fffdf9] px-2 py-0.5 text-[0.66rem] font-medium text-accent-deep ring-1 ring-[#ead6c4]">
          <FileText className="size-3" /> {product.category} · PDF
        </span>
        <h3 className="mt-1.5 line-clamp-2 text-[0.98rem] font-semibold leading-snug text-ink group-hover:text-accent-deep">{product.title}</h3>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2">
          <span className="display text-xl leading-none text-ink">{product.price ? formatPrice(product.price) : "Free"}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price && <span className="text-xs text-muted line-through">{formatPrice(product.compareAtPrice)}</span>}
          {product.featured && <span className="rounded-full bg-[#f3e6c8] px-2 py-0.5 text-[0.62rem] font-medium text-[#7a5410]">Bestseller</span>}
        </div>
        <span className="mt-1 inline-flex items-center gap-1 text-[0.7rem] text-muted"><Download className="size-3" /> Instant download</span>
      </div>
    </Link>
  );
}
