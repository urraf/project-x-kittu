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

export const fundingTone = (f: string) => (f === "fully-funded" ? "bg-[#dde8de] text-moss" : f === "self-funded" ? "bg-paper-3 text-ink-2" : "bg-sakura text-accent-deep");

export function OpportunityCard({ o }: { o: OpportunityDTO }) {
  return (
    <Link
      href={`/opportunities/${o.slug}`}
      className={cn(
        "group flex h-full flex-col rounded-3xl border border-line bg-[#fffdf9] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-ink/20 hover:shadow-[0_24px_50px_-35px_rgba(29,43,69,0.55)]",
        o.closed && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-indigo-soft px-2.5 py-1 text-xs font-medium text-indigo">{typeLabel(o.type)}</span>
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", fundingTone(o.funding))}>{fundingLabel(o.funding)}</span>
        </div>
        <DeadlineChip o={o} className="shrink-0" />
      </div>
      {o.organization && <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted">{o.organization}</p>}
      <h3 className="display mt-1.5 text-[1.55rem] leading-[1.12] text-ink"><span className="link-underline">{o.title}</span></h3>
      {o.summary && <p className="mt-2 line-clamp-2 text-[0.93rem] leading-relaxed text-ink-2">{o.summary}</p>}
      <ul className="mt-auto space-y-1.5 pt-5 text-sm text-ink-2">
        <li className="flex items-center gap-2"><MapPin className="size-4 shrink-0 text-accent" /> {[o.location, o.country].filter(Boolean).join(", ")}</li>
        {o.deadline && <li className="flex items-center gap-2"><CalendarClock className="size-4 shrink-0 text-accent" /> Deadline {fmt(o.deadline)}</li>}
        {o.degreeLevels.length > 0 && <li className="flex items-center gap-2"><GraduationCap className="size-4 shrink-0 text-accent" /> {o.degreeLevels.map(degreeLabel).join(" · ")}</li>}
      </ul>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
        View details <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
