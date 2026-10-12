import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarClock, GraduationCap, MapPin } from "lucide-react";
import { degreeLabel, fundingLabel, typeLabel } from "@/lib/opportunities/constants";
import { cn } from "@/lib/utils/cn";
import type { OpportunityDTO } from "@/lib/services/opportunities";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** "5 days left" (red when close), "Rolling", or "Closed". */
export function DeadlineChip({ o, className }: { o: Pick<OpportunityDTO, "deadline" | "daysLeft" | "rolling" | "closed">; className?: string }) {
  let label: string;
  let tone: string;
  if (o.closed) [label, tone] = ["Closed", "bg-paper-3 text-ink-2"];
  else if (o.daysLeft !== undefined) {
    label = o.daysLeft === 0 ? "Closes today" : o.daysLeft === 1 ? "1 day left" : `${o.daysLeft} days left`;
    tone = o.daysLeft <= 7 ? "bg-accent text-white" : o.daysLeft <= 30 ? "bg-[#f6e7c6] text-[#7a5410]" : "bg-matcha-soft text-moss";
  } else [label, tone] = [o.rolling ? "Rolling" : "Open", "bg-indigo-soft text-indigo"];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tone, className)}>{label}</span>;
}

/** Kanji and tint for the designed fallback when an opportunity has no photo. */
const TYPE_ART: Record<string, { jp: string; tint: string; pattern: string }> = {
  internship: { jp: "研修", tint: "bg-indigo-soft", pattern: "seigaiha" },
  scholarship: { jp: "奨学金", tint: "bg-accent-soft", pattern: "asanoha" },
  fellowship: { jp: "研究", tint: "bg-matcha-soft", pattern: "shippo" },
  research: { jp: "研究", tint: "bg-matcha-soft", pattern: "shippo" },
  exchange: { jp: "交流", tint: "bg-sakura", pattern: "seigaiha" },
  "summer-school": { jp: "夏期", tint: "bg-[#f8eed6]", pattern: "asanoha" },
  conference: { jp: "会議", tint: "bg-indigo-soft", pattern: "shippo" },
  competition: { jp: "挑戦", tint: "bg-accent-soft", pattern: "seigaiha" },
  job: { jp: "仕事", tint: "bg-[#f8eed6]", pattern: "asanoha" },
};

export const fundingTone = (f: string) => (f === "fully-funded" ? "bg-[#dde8de] text-moss" : f === "self-funded" ? "bg-paper-3 text-ink-2" : "bg-sakura text-accent-deep");

export function OpportunityCard({ o, compact = true }: { o: OpportunityDTO; compact?: boolean }) {
  const art = TYPE_ART[o.type] ?? TYPE_ART.internship!;
  return (
    <Link
      href={`/opportunities/${o.slug}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-[#fffdf9] transition-all duration-300 hover:-translate-y-1 hover:border-ink/20 hover:shadow-[0_24px_50px_-35px_rgba(29,43,69,0.55)]",
        o.closed && "opacity-70",
      )}
    >
      <div className={cn("img-zoom relative overflow-hidden", compact ? "aspect-[16/5]" : "aspect-[16/7]", !o.coverImage && art.tint)}>
        {o.coverImage ? (
          <Image src={o.coverImage.url} alt={o.coverImage.alt || o.title} fill sizes="(min-width: 1024px) 24rem, (min-width: 640px) 45vw, 100vw" className="object-cover" />
        ) : (
          <>
            <span aria-hidden className={cn("absolute inset-0", art.pattern)} />
            <span aria-hidden className="jp absolute -bottom-3 left-4 text-[3.6rem] leading-none text-ink/10">{art.jp}</span>
          </>
        )}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/35 to-transparent" />
        <DeadlineChip o={o} className="absolute right-3 top-3 shadow-sm" />
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-[#fffdf9]/95 px-2.5 py-1 text-xs font-medium text-indigo">{typeLabel(o.type)}</span>
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", fundingTone(o.funding))}>{fundingLabel(o.funding)}</span>
        </div>
      </div>
      <div className={cn("flex flex-1 flex-col", compact ? "p-4" : "p-5")}>
        {o.organization && <p className="line-clamp-1 text-xs font-medium uppercase tracking-wider text-muted">{o.organization}</p>}
        <h3 className={cn("display mt-1.5 leading-[1.12] text-ink", compact ? "line-clamp-2 text-[1.12rem]" : "text-[1.45rem]")}><span className="link-underline">{o.title}</span></h3>
        {o.summary && !compact && <p className="mt-2 line-clamp-2 text-[0.93rem] leading-relaxed text-ink-2">{o.summary}</p>}
        <ul className={cn("mt-auto space-y-1.5 text-sm text-ink-2", compact ? "pt-3" : "pt-5")}>
          <li className="flex items-center gap-2"><MapPin className="size-4 shrink-0 text-accent" /> {[o.location, o.country].filter(Boolean).join(", ")}</li>
          {o.deadline && <li className="flex items-center gap-2"><CalendarClock className="size-4 shrink-0 text-accent" /> Deadline {fmt(o.deadline)}</li>}
          {o.degreeLevels.length > 0 && !compact && <li className="flex items-center gap-2"><GraduationCap className="size-4 shrink-0 text-accent" /> {o.degreeLevels.map(degreeLabel).join(" · ")}</li>}
        </ul>
        <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium text-ink", compact ? "mt-3" : "mt-4")}>
          View details <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
