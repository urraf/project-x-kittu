import { Stars } from "@/components/mentorship/Stars";
import { cn } from "@/lib/utils/cn";
import type { MentorStats } from "@/lib/types";

export function StatsStrip({ stats, tone = "light", className }: { stats: MentorStats; tone?: "light" | "dark"; className?: string }) {
  const dark = tone === "dark";
  const items = [
    { value: stats.sessions.toLocaleString("en-IN"), label: "Sessions taken" },
    { value: stats.students.toLocaleString("en-IN"), label: "Students mentored" },
    { value: stats.avgRating ? stats.avgRating.toFixed(1) : "–", label: stats.reviewCount ? `Rating · ${stats.reviewCount} review${stats.reviewCount === 1 ? "" : "s"}` : "Rating", stars: stats.avgRating },
  ];
  return (
    <dl className={cn("grid grid-cols-3 gap-4 border-t pt-6", dark ? "border-cream/15" : "border-line", className)}>
      {items.map((i) => (
        <div key={i.label} className="flex flex-col">
          <dt className={cn("kicker order-2 mt-2 !text-[0.62rem] sm:!text-[0.7rem]", dark ? "text-cream-muted" : "text-muted")}>{i.label}</dt>
          <dd className="order-1 flex flex-wrap items-baseline gap-2">
            <span className="display text-4xl md:text-5xl">{i.value}</span>
            {i.stars ? <Stars value={i.stars} className="hidden sm:inline-flex" /> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
