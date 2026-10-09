import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock, Hourglass, MailCheck, MessagesSquare, ShieldCheck, Ticket, Users, Video } from "lucide-react";
import { BookingForm } from "@/components/mentorship/BookingForm";
import { Countdown } from "@/components/mentorship/Countdown";
import { MobileBookBar } from "@/components/mentorship/MobileBookBar";
import { ReviewCard } from "@/components/mentorship/ReviewCard";
import { Stars } from "@/components/mentorship/Stars";
import { JsonLd } from "@/components/ui/JsonLd";
import { getStudent } from "@/lib/auth/student";
import { safe } from "@/lib/safe";
import { getMentorStats, getPublicSessionBySlug, listPublicReviews } from "@/lib/services/mentorship";
import { paymentMode } from "@/lib/services/razorpay";
import { getSettings } from "@/lib/services/settings";
import { absoluteUrl } from "@/lib/site";
import { formatDuration, formatPrice, formatSessionDate, formatSessionTime, sessionEnd } from "@/lib/utils/session-time";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const AVATAR_COLORS = ["bg-[#d9482b]", "bg-[#24365a]", "bg-[#3f5a46]", "bg-[#a8741a]"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await safe("session.meta", () => getPublicSessionBySlug(slug), null);
  if (!s) return { title: "Session not found", robots: { index: false } };
  return {
    title: s.title,
    description: s.summary || `Live session on ${formatSessionDate(s.startsAt)}.`,
    alternates: { canonical: `/sessions/${s.slug}` },
    openGraph: { title: s.title, description: s.summary, url: absoluteUrl(`/sessions/${s.slug}`) },
  };
}

function SectionTitle({ kicker, children }: { kicker: string; children: React.ReactNode }) {
  return (
    <>
      <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> {kicker}</p>
      <h2 className="display mt-3 text-3xl md:text-4xl">{children}</h2>
    </>
  );
}

export default async function SessionPage({ params }: Props) {
  const { slug } = await params;
  const session = await safe("session.detail", () => getPublicSessionBySlug(slug), null);
  if (!session) notFound();
  const [settings, reviews, stats, student] = await Promise.all([
    getSettings(),
    safe("session.reviews", () => listPublicReviews(6), []),
    safe("session.stats", () => getMentorStats(), { sessions: 0, students: 0, avgRating: 0, reviewCount: 0 }),
    safe("session.student", () => getStudent(), null),
  ]);
  const { profile, mentorship } = settings;
  const closed = session.status === "cancelled" || session.started;
  const full = session.seatsLeft === 0;
  const bookable = !closed && !full;
  const tight = session.seatsLeft <= Math.max(3, Math.ceil(session.capacity * 0.3));
  const takeaways = session.highlights.length ? session.highlights : mentorship.benefits;
  const firstName = profile.name.split(" ")[0];

  const facts = [
    { Icon: CalendarDays, label: "Date", value: formatSessionDate(session.startsAt) },
    { Icon: Clock, label: "Time (IST)", value: `${formatSessionTime(session.startsAt)} – ${formatSessionTime(sessionEnd(session.startsAt, session.durationMin))}` },
    { Icon: Hourglass, label: "Duration", value: formatDuration(session.durationMin) },
    { Icon: Users, label: "Group size", value: `Up to ${session.capacity} students` },
  ];
  const steps = [
    { Icon: Ticket, title: "Book your seat", text: session.price ? "Fill in your details and pay securely. Takes under a minute." : "Fill in your details. Takes under a minute." },
    { Icon: MailCheck, title: "Get the link", text: "The meeting link arrives by email right away, plus your account login. A reminder comes 1 hour before." },
    { Icon: MessagesSquare, title: "Join live & ask", text: `Join ${firstName} on a live video call with a small group. Bring your questions and your profile.` },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: session.title,
          description: session.summary,
          startDate: session.startsAt,
          endDate: sessionEnd(session.startsAt, session.durationMin).toISOString(),
          eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
          eventStatus: session.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
          location: { "@type": "VirtualLocation", url: absoluteUrl(`/sessions/${session.slug}`) },
          organizer: { "@type": "Person", name: profile.name, url: absoluteUrl("/journey") },
          offers: { "@type": "Offer", price: session.price, priceCurrency: "INR", availability: full || closed ? "https://schema.org/SoldOut" : "https://schema.org/InStock", url: absoluteUrl(`/sessions/${session.slug}`) },
        }}
      />

      <div className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[32rem] rounded-full bg-accent/10 blur-3xl" />
        <div className="container-x relative grid grid-cols-1 gap-12 pb-24 pt-28 md:pt-32 lg:grid-cols-12 lg:gap-14">
          {/* ------------------------------ Left: the pitch ------------------------------ */}
          <div className="min-w-0 lg:col-span-7">
            <Link href="/sessions" className="group inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /> All sessions
            </Link>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1 text-xs font-medium uppercase tracking-wider text-cream">
                <span className="relative flex size-2">
                  {bookable && <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />}
                  <span className="relative inline-flex size-2 rounded-full bg-accent" />
                </span>
                Live group session
              </span>
              {session.status === "cancelled" ? (
                <span className="rounded-full bg-paper-3 px-3 py-1 text-xs font-medium text-ink-2">Cancelled</span>
              ) : full ? (
                <span className="rounded-full bg-paper-3 px-3 py-1 text-xs font-medium text-ink-2">Fully booked</span>
              ) : bookable && tight ? (
                <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-deep">Only {session.seatsLeft} seat{session.seatsLeft === 1 ? "" : "s"} left</span>
              ) : bookable ? (
                <span className="rounded-full bg-[#dde8de] px-3 py-1 text-xs font-medium text-moss">{session.seatsLeft} seats open</span>
              ) : null}
            </div>

            <h1 className="display mt-5 text-[2.6rem] leading-[1] md:text-[3.8rem]">{session.title}</h1>
            {session.summary && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2 md:text-xl">{session.summary}</p>}

            {/* Social proof */}
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
              {reviews.length > 0 && (
                <span className="flex -space-x-2" aria-hidden>
                  {reviews.slice(0, 4).map((r, i) => (
                    <span key={r.id} className={`grid size-8 place-items-center rounded-full text-xs font-medium text-white ring-2 ring-paper ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                      {r.name.trim().charAt(0).toUpperCase()}
                    </span>
                  ))}
                </span>
              )}
              {stats.reviewCount > 0 && (
                <span className="flex items-center gap-2 text-sm text-ink-2">
                  <Stars value={stats.avgRating} /> <strong className="text-ink">{stats.avgRating.toFixed(1)}</strong> from {stats.reviewCount} review{stats.reviewCount === 1 ? "" : "s"}
                </span>
              )}
              {stats.students > 0 && <span className="text-sm text-ink-2"><strong className="text-ink">{stats.students.toLocaleString("en-IN")}+</strong> students guided</span>}
            </div>

            {/* Key facts */}
            <dl className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {facts.map(({ Icon, label, value }) => (
                <div key={label} className="rounded-2xl border border-line bg-[#fffdf9] p-4">
                  <Icon className="size-5 text-accent" />
                  <dt className="mt-3 text-xs uppercase tracking-wider text-muted">{label}</dt>
                  <dd className="mt-1 text-[0.95rem] font-medium leading-snug text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            {bookable && (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-night p-5 text-cream sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Starts in</p>
                  <p className="text-xs text-cream-muted">Booking closes when the session begins.</p>
                </div>
                <Countdown to={session.startsAt} tone="dark" />
              </div>
            )}

            {/* Takeaways */}
            {takeaways.length > 0 && (
              <section className="mt-14">
                <SectionTitle kicker="What you get">What you&apos;ll <em className="text-accent">walk away with</em></SectionTitle>
                <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {takeaways.map((h) => (
                    <li key={h} className="flex gap-3 rounded-2xl border border-line bg-[#fffdf9] p-4 text-[0.98rem] text-ink-2">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-white"><Check className="size-3.5" /></span>
                      {h}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {session.description && (
              <section className="mt-14">
                <SectionTitle kicker="About">About this <em className="text-accent">session</em></SectionTitle>
                <div className="mt-5 space-y-4 font-[family-name:var(--font-prose)] text-[1.1rem] leading-relaxed text-ink-2">
                  {session.description.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
                </div>
              </section>
            )}

            {/* How it works */}
            <section className="mt-14">
              <SectionTitle kicker="How it works">Three simple <em className="text-accent">steps</em></SectionTitle>
              <ol className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                {steps.map(({ Icon, title, text }, i) => (
                  <li key={title} className="relative rounded-2xl border border-line bg-[#fffdf9] p-5">
                    <span className="font-mono text-xs text-muted">0{i + 1}</span>
                    <Icon className="mt-3 size-6 text-accent" />
                    <p className="mt-3 font-medium text-ink">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-2">{text}</p>
                  </li>
                ))}
              </ol>
            </section>

            {/* Host */}
            <section className="mt-14">
              <div className="grain relative overflow-hidden rounded-3xl bg-night p-6 text-cream md:p-8">
                <span aria-hidden className="absolute -bottom-20 -right-20 size-56 rounded-full bg-accent/80" />
                <div className="relative z-[2] flex flex-col gap-6 sm:flex-row sm:items-start">
                  {profile.avatarUrl && (
                    <span className="relative size-24 shrink-0 overflow-hidden rounded-full bg-night-2 ring-4 ring-accent">
                      <Image src={profile.avatarUrl} alt="" fill sizes="96px" className="object-cover" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="kicker text-cream-muted">Your host</p>
                    <p className="display mt-2 text-3xl">{profile.name}</p>
                    {profile.currentRole && <p className="mt-1 text-sm text-cream/70">{profile.currentRole}</p>}
                    {profile.shortBio && <p className="mt-4 line-clamp-4 text-[0.95rem] leading-relaxed text-cream/80">{profile.shortBio}</p>}
                    <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
                      {stats.sessions > 0 && <div><dt className="text-xs text-cream-muted">Sessions</dt><dd className="display text-2xl">{stats.sessions}</dd></div>}
                      {stats.students > 0 && <div><dt className="text-xs text-cream-muted">Students</dt><dd className="display text-2xl">{stats.students.toLocaleString("en-IN")}+</dd></div>}
                      {stats.reviewCount > 0 && <div><dt className="text-xs text-cream-muted">Rating</dt><dd className="display text-2xl">{stats.avgRating.toFixed(1)}★</dd></div>}
                    </dl>
                    <Link href="/journey" className="group mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-cream">
                      <span className="link-underline">Read my story</span> <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* Reviews */}
            {reviews.length > 0 && (
              <section className="mt-14">
                <SectionTitle kicker="Reviews">Students <em className="text-accent">love it</em></SectionTitle>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {reviews.slice(0, 4).map((r) => <ReviewCard key={r.id} review={r} />)}
                </div>
              </section>
            )}

            {/* FAQ */}
            {mentorship.faqs.length > 0 && (
              <section className="mt-14">
                <SectionTitle kicker="FAQ">Good to <em className="text-accent">know</em></SectionTitle>
                <div className="mt-5 divide-y divide-line border-y border-line">
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

            <div className="mt-10 flex items-start gap-3 rounded-2xl border border-line bg-paper-2 p-5 text-sm text-ink-2">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-moss" />
              <p>
                <strong className="text-ink">Book with confidence.</strong> {session.price ? "Payments are processed securely, and if the session is cancelled you get a full refund automatically." : "It's free: book your seat and just show up."} Questions? Reply to your confirmation email.
              </p>
            </div>
          </div>

          {/* ------------------------------ Right: the booking card ------------------------------ */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              {closed ? (
                <div className="rounded-3xl border border-line bg-[#fffdf9] p-6 md:p-8">
                  <Video className="size-8 text-accent" />
                  <h2 className="display mt-4 text-3xl">{session.status === "cancelled" ? "This session was cancelled" : "Booking has closed"}</h2>
                  <p className="mt-2 text-ink-2">Have a look at the other upcoming dates.</p>
                  <Link href="/sessions" className="btn btn-ink mt-5">See upcoming sessions</Link>
                </div>
              ) : full ? (
                <div className="rounded-3xl border border-line bg-[#fffdf9] p-6 md:p-8">
                  <Users className="size-8 text-accent" />
                  <h2 className="display mt-4 text-3xl">Fully booked</h2>
                  <p className="mt-2 text-ink-2">All seats are taken. New dates open regularly, so grab the next one early.</p>
                  <Link href="/sessions" className="btn btn-ink mt-5">See other sessions</Link>
                </div>
              ) : (
                <BookingForm
                  session={session}
                  paymentMode={paymentMode()}
                  student={student ? { name: student.name, email: student.email, phone: student.phone ?? "" } : null}
                />
              )}
            </div>
          </aside>
        </div>
      </div>

      {bookable && <MobileBookBar price={session.price ? formatPrice(session.price) : "Free"} seatsLeft={session.seatsLeft} />}
    </>
  );
}
