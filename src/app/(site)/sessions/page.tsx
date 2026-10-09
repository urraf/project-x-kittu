import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, LogIn } from "lucide-react";
import { ReviewCard } from "@/components/mentorship/ReviewCard";
import { FeaturedSession, SessionCard } from "@/components/mentorship/SessionCard";
import { StatsStrip } from "@/components/mentorship/StatsStrip";
import { EmptyState } from "@/components/ui/EmptyState";
import { JsonLd } from "@/components/ui/JsonLd";
import { safe } from "@/lib/safe";
import { getMentorStats, listPublicReviews, listUpcomingSessions } from "@/lib/services/mentorship";
import { getSettings } from "@/lib/services/settings";
import { absoluteUrl } from "@/lib/site";
import type { MentorStats } from "@/lib/types";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { mentorship, profile } = await getSettings();
  return {
    title: "Sessions",
    description: `${mentorship.headline} Live mentorship sessions with ${profile.name} on scholarships, internships and studying abroad.`,
    alternates: { canonical: "/sessions" },
    openGraph: { title: `Book a session · ${profile.channelName}`, description: mentorship.intro, url: absoluteUrl("/sessions") },
  };
}

const EMPTY_STATS: MentorStats = { sessions: 0, students: 0, avgRating: 0, reviewCount: 0 };

export default async function SessionsPage() {
  const settings = await getSettings();
  const { mentorship, profile } = settings;
  const [sessions, reviews, stats] = await Promise.all([
    safe("sessions.upcoming", () => listUpcomingSessions(12), []),
    safe("sessions.reviews", () => listPublicReviews(24), []),
    safe("sessions.stats", () => getMentorStats(), EMPTY_STATS),
  ]);

  return (
    <>
      {stats.reviewCount > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Service",
            name: `Mentorship sessions with ${profile.name}`,
            provider: { "@type": "Person", name: profile.name },
            aggregateRating: { "@type": "AggregateRating", ratingValue: stats.avgRating, reviewCount: stats.reviewCount, bestRating: 5 },
          }}
        />
      )}

      {/* Hero */}
      <section className="grain relative overflow-hidden bg-night text-cream">
        <div aria-hidden className="absolute -right-24 -top-24 size-[26rem] rounded-full bg-accent/90" />
        <div className="container-x relative z-[2] grid grid-cols-1 gap-12 pb-16 pt-28 md:pt-32 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="kicker flex items-center gap-3 text-cream-muted" data-reveal>
              <span className="h-px w-8 bg-accent" /> Sessions with {profile.name.split(" ")[0]}
            </p>
            <h1 className="display mt-5 text-[2.9rem] leading-[0.98] sm:text-6xl lg:text-[4.6rem]" data-reveal>{mentorship.headline}</h1>
            <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-cream/75" data-reveal>{mentorship.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3" data-reveal>
              <a href="#upcoming" className="btn btn-accent">See upcoming sessions</a>
              <Link href="/account/login" className="btn btn-ghost text-cream"><LogIn className="size-4" /> Log in / My bookings</Link>
            </div>
          </div>
          <div className="hidden lg:col-span-4 lg:flex lg:justify-end" data-reveal>
            {profile.avatarUrl && (
              <span className="relative size-44 overflow-hidden rounded-full bg-night-2 ring-8 ring-night">
                <Image src={profile.avatarUrl} alt="" fill sizes="176px" className="object-cover" priority />
              </span>
            )}
          </div>
          <StatsStrip stats={stats} tone="dark" className="lg:col-span-12" />
        </div>
      </section>

      {/* Upcoming */}
      <section id="upcoming" className="scroll-mt-24 py-20 md:py-24">
        <div className="container-x">
          <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> Upcoming</p>
          <h2 className="display mt-4 text-4xl md:text-5xl">Pick a <em className="text-accent">date</em></h2>
          <p className="mt-3 max-w-2xl text-ink-2">All times are in Indian Standard Time (IST). Each session is a small live group, and you get the meeting link by email right after booking.</p>
          <div className="mt-10">
            {sessions.length ? (
              <div className="space-y-5">
                <FeaturedSession session={sessions[0]!} />
                {sessions.length > 1 && (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {sessions.slice(1).map((s) => <SessionCard key={s.id} session={s} />)}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState title="New dates coming soon" description="There are no open sessions right now. Follow on YouTube or Instagram to hear when the next one opens." />
            )}
          </div>
        </div>
      </section>

      {/* What you get */}
      {mentorship.benefits.length > 0 && (
        <section className="border-y border-line bg-paper-2 py-20">
          <div className="container-x grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> What you get</p>
              <h2 className="display mt-4 text-4xl md:text-5xl">Practical, honest, <em className="text-accent">specific.</em></h2>
            </div>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-7">
              {mentorship.benefits.map((b) => (
                <li key={b} className="flex gap-3 rounded-2xl border border-line bg-[#fffdf9] p-5 text-[0.98rem] text-ink-2">
                  <Check className="mt-0.5 size-5 shrink-0 text-accent" /> {b}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="py-20 md:py-24">
        <div className="container-x">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> Reviews</p>
              <h2 className="display mt-4 text-4xl md:text-5xl">What students <em className="text-accent">say</em></h2>
            </div>
            {stats.reviewCount > 0 && (
              <p className="text-ink-2"><strong className="text-ink">{stats.avgRating.toFixed(1)} / 5</strong> from {stats.reviewCount} review{stats.reviewCount === 1 ? "" : "s"}</p>
            )}
          </div>
          <div className="mt-10">
            {reviews.length ? (
              <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid">
                {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
              </div>
            ) : (
              <EmptyState title="Reviews appear after sessions" description="Every attendee gets a feedback link after their session. Their reviews show up here." />
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {mentorship.faqs.length > 0 && (
        <section className="border-t border-line bg-paper-2 py-20">
          <div className="container-x grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-4">
              <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> FAQ</p>
              <h2 className="display mt-4 text-4xl">Good to know</h2>
            </div>
            <div className="divide-y divide-line border-y border-line md:col-span-8">
              {mentorship.faqs.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="text-xl text-accent transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-ink-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
