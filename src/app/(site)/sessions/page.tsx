import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, LogIn, Star } from "lucide-react";
import { ReviewCard } from "@/components/mentorship/ReviewCard";
import { ProductServiceCard, SessionServiceCard } from "@/components/mentorship/ServiceCard";
import { ServiceTabs } from "@/components/mentorship/ServiceTabs";
import { TestimonialCard } from "@/components/mentorship/TestimonialCard";
import { SocialLinks } from "@/components/site/Footer";
import { EmptyState } from "@/components/ui/EmptyState";
import { JsonLd } from "@/components/ui/JsonLd";
import { Kittu } from "@/components/mascot/Kittu";
import { safe } from "@/lib/safe";
import { getMentorStats, listPublicReviews, listUpcomingSessions } from "@/lib/services/mentorship";
import { getSettings } from "@/lib/services/settings";
import { listPublishedProducts } from "@/lib/services/store";
import { listPublicTestimonials } from "@/lib/services/testimonials";
import { KEYWORDS, breadcrumbLd, collectionLd, seoMeta } from "@/lib/seo";
import type { MentorStats } from "@/lib/types";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await getSettings();
  return seoMeta({
    title: "Live Mentorship Sessions for Studying in Japan",
    description: `Live online sessions with ${profile.name} on the MEXT scholarship, research internships, SOP reviews and applying to Japanese universities.`,
    path: "/sessions",
    keywords: [...KEYWORDS.sessions, "MEXT scholarship", "study in Japan from India"],
  });
}

const EMPTY_STATS: MentorStats = { sessions: 0, students: 0, avgRating: 0, reviewCount: 0 };

export default async function SessionsPage() {
  const settings = await getSettings();
  const { mentorship, profile, social } = settings;
  const firstName = profile.name.split(" ")[0];
  const [sessions, reviews, stats, products, testimonials] = await Promise.all([
    safe("sessions.upcoming", () => listUpcomingSessions(12), []),
    safe("sessions.reviews", () => listPublicReviews(24), []),
    safe("sessions.stats", () => getMentorStats(), EMPTY_STATS),
    safe("sessions.products", () => listPublishedProducts({ limit: 8 }), []),
    safe("sessions.testimonials", () => listPublicTestimonials(12), []),
  ]);

  // Storefront: live sessions first, then study material, filterable by tab.
  const groups = [
    {
      id: "sessions",
      label: "Live sessions",
      jp: "講座",
      gridClassName: "grid grid-cols-1 gap-5 md:grid-cols-2",
      items: sessions.map((s) => ({ id: `s-${s.id}`, node: <SessionServiceCard session={s} compact rating={stats.reviewCount >= 3 ? stats.avgRating : undefined} /> })),
    },
    {
      id: "products",
      label: "Study material",
      jp: "教材",
      gridClassName: "grid grid-cols-1 gap-4 xl:grid-cols-2",
      items: products.map((p) => ({ id: `p-${p.id}`, node: <ProductServiceCard product={p} /> })),
    },
  ];
  const facts = [
    stats.reviewCount > 0 && { value: `${stats.avgRating.toFixed(1)}/5`, label: `${stats.reviewCount} rating${stats.reviewCount === 1 ? "" : "s"}` },
    stats.students >= 10 && { value: `${stats.students.toLocaleString("en-IN")}+`, label: "students guided" },
    stats.sessions > 0 && { value: String(stats.sessions), label: `session${stats.sessions === 1 ? "" : "s"} hosted` },
    { value: String(sessions.length), label: `upcoming session${sessions.length === 1 ? "" : "s"}` },
    testimonials.length > 0 && { value: String(testimonials.length), label: "testimonials" },
  ]
    .filter((f): f is { value: string; label: string } => Boolean(f))
    .slice(0, 3);

  return (
    <>
      <JsonLd
        data={[
          collectionLd({ name: "Live sessions on studying in Japan", description: "Upcoming live online sessions on MEXT, research internships and applying to Japanese universities.", path: "/sessions", items: sessions.map((s) => ({ name: s.title, path: `/sessions/${s.slug}` })) }),
          breadcrumbLd([["Sessions", "/sessions"]]),
        ]}
      />
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

      <div className="pt-[4.5rem] lg:grid lg:grid-cols-[minmax(20rem,25rem)_1fr]">
        {/* ------------------------------ Profile panel ------------------------------ */}
        <aside className="relative overflow-hidden bg-accent text-white lg:sticky lg:top-[4.5rem] lg:h-[calc(100dvh-4.5rem)] lg:self-start">
          <div aria-hidden className="seigaiha absolute inset-0 opacity-25 mix-blend-soft-light" />
          <div aria-hidden className="absolute -bottom-24 -right-24 size-72 rounded-full bg-white/10" />
          <div className="relative flex h-full flex-col px-5 py-8 sm:px-8 lg:overflow-y-auto lg:px-10 lg:py-10">
            <div className="flex items-center gap-5 lg:block">
              {profile.avatarUrl && (
                <span className="relative block size-20 shrink-0 overflow-hidden rounded-full bg-white/20 ring-4 ring-white/25 lg:size-28">
                  <Image src={profile.avatarUrl} alt={profile.name} referrerPolicy="no-referrer" fill sizes="112px" className="object-cover" priority />
                </span>
              )}
              <dl className="grid flex-1 grid-cols-3 gap-2 lg:hidden">
                {facts.map((f) => (
                  <div key={f.label}>
                    <dt className="sr-only">{f.label}</dt>
                    <dd className="text-lg font-semibold leading-tight">{f.value}</dd>
                    <dd className="text-[0.7rem] leading-tight text-white/80">{f.label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <p className="jp mt-6 text-sm text-white/80">講座 · Live sessions</p>
            <h1 className="display mt-1 text-[2.4rem] leading-[1] lg:text-5xl">{profile.name}</h1>
            <p className="mt-3 text-[0.98rem] leading-relaxed text-white/90">{mentorship.headline} {profile.tagline}</p>

            <dl className="mt-6 hidden flex-wrap gap-x-5 gap-y-2 text-sm lg:flex">
              {facts.map((f) => (
                <div key={f.label} className="flex items-baseline gap-1.5">
                  <dt className="sr-only">{f.label}</dt>
                  <dd className="font-semibold">{f.value}</dd>
                  <dd className="text-white/80">{f.label}</dd>
                </div>
              ))}
            </dl>

            <SocialLinks social={social} className="mt-6 text-white [&_a:hover]:border-white [&_a:hover]:bg-white [&_a:hover]:text-accent" />

            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/account/login" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-accent-deep transition-colors hover:bg-cream"><LogIn className="size-4" /> My bookings</Link>
              <Link href="/about" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10">About {firstName} <ArrowRight className="size-4" /></Link>
            </div>

            <p className="mt-auto hidden max-w-[10.5rem] pt-10 text-xs leading-relaxed text-white/80 lg:block">All times are in IST. Small live groups; the meeting link arrives by email right after booking.</p>
          </div>
          <span aria-hidden className="absolute -bottom-10 right-0 hidden size-48 rounded-full bg-[#fffdf9]/25 lg:block" />
          <Kittu pose="laptop" alt="" sizes="10rem" className="pointer-events-none absolute bottom-3 right-3 hidden w-40 lg:block" />
        </aside>

        {/* ------------------------------ Services ------------------------------ */}
        <div className="min-w-0 bg-paper-2/60">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            {testimonials.length > 0 && (
              <section aria-label="Testimonials">
                <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
                  {testimonials.slice(0, 8).map((t) => (
                    <div key={t.id} className="w-[17rem] shrink-0 snap-start sm:w-[19rem] [&_blockquote]:line-clamp-4 [&_blockquote]:text-[0.95rem]">
                      <TestimonialCard t={t} className="!p-5" />
                    </div>
                  ))}
                </div>
                <a href="#reviews" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:underline">
                  <Star className="size-3.5 fill-current text-[#c08a1e]" /> See all reviews <ArrowRight className="size-3.5" />
                </a>
              </section>
            )}

            <section id="upcoming" className="mt-8 scroll-mt-24">
              <ServiceTabs
                groups={groups}
                empty={<EmptyState title="New dates coming soon" description="There are no open sessions right now. Follow on YouTube or Instagram to hear when the next one opens." />}
              />
            </section>

            {mentorship.benefits.length > 0 && (
              <section className="mt-12">
                <h2 className="display text-3xl md:text-4xl">What you <em className="text-accent">get</em></h2>
                <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {mentorship.benefits.map((b) => (
                    <li key={b} className="flex gap-3 rounded-2xl border border-line bg-[#fffdf9] p-4 text-[0.95rem] text-ink-2">
                      <Check className="mt-0.5 size-5 shrink-0 text-accent" /> {b}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section id="reviews" className="mt-12 scroll-mt-24">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="display text-3xl md:text-4xl">What students <em className="text-accent">say</em></h2>
                {stats.reviewCount > 0 && <p className="text-sm text-ink-2"><strong className="text-ink">{stats.avgRating.toFixed(1)} / 5</strong> from {stats.reviewCount} session review{stats.reviewCount === 1 ? "" : "s"}</p>}
              </div>
              {reviews.length || testimonials.length ? (
                <div className="mt-5 columns-1 gap-4 sm:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
                  {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
                  {testimonials.map((t) => <TestimonialCard key={t.id} t={t} />)}
                </div>
              ) : (
                <div className="mt-5"><EmptyState title="Reviews appear after sessions" description="Every attendee gets a feedback link after their session. Their reviews show up here." /></div>
              )}
            </section>

            {mentorship.faqs.length > 0 && (
              <section className="mt-12">
                <h2 className="display text-3xl md:text-4xl">Good to <em className="text-accent">know</em></h2>
                <div className="mt-4 divide-y divide-line border-y border-line">
                  {mentorship.faqs.map((f) => (
                    <details key={f.q} className="group py-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
                        {f.q}
                        <span className="text-xl text-accent transition-transform group-open:rotate-45">+</span>
                      </summary>
                      <p className="mt-3 leading-relaxed text-ink-2">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
