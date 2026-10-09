import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ReviewCard } from "@/components/mentorship/ReviewCard";
import { SessionCard } from "@/components/mentorship/SessionCard";
import { StatsStrip } from "@/components/mentorship/StatsStrip";
import type { MentorSessionDTO, MentorStats, ReviewDTO } from "@/lib/types";

/** Homepage block: next sessions, live counters and a few reviews. */
export function SessionsTeaser({ headline, intro, sessions, reviews, stats }: { headline: string; intro: string; sessions: MentorSessionDTO[]; reviews: ReviewDTO[]; stats: MentorStats }) {
  return (
    <section className="grain relative overflow-hidden bg-night py-24 text-cream md:py-28">
      <div aria-hidden className="absolute -left-32 -top-32 size-[24rem] rounded-full bg-accent/10 blur-3xl" />
      <div className="container-x relative z-[2]">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7" data-reveal>
            <p className="kicker flex items-center gap-3 text-cream-muted"><span className="h-px w-8 bg-accent" /> Live sessions</p>
            <h2 className="display mt-5 text-[2.6rem] leading-[1.02] md:text-6xl">{headline}</h2>
            <p className="mt-5 max-w-xl leading-relaxed text-cream/70">{intro}</p>
          </div>
          <div className="lg:col-span-5" data-reveal>
            <StatsStrip stats={stats} tone="dark" />
          </div>
        </div>
        {sessions.length > 0 && (
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" data-reveal>
            {sessions.slice(0, 3).map((s) => <SessionCard key={s.id} session={s} tone="dark" />)}
          </div>
        )}
        {reviews.length > 0 && (
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3" data-reveal>
            {reviews.slice(0, 3).map((r) => <ReviewCard key={r.id} review={r} tone="dark" />)}
          </div>
        )}
        <Link href="/sessions" className="btn btn-accent mt-12">
          {sessions.length ? "See all sessions & reviews" : "See sessions & reviews"} <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
