import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ShoppingBag, Users } from "lucide-react";
import { PostCard } from "@/components/blog/PostCard";
import { ReviewCard } from "@/components/mentorship/ReviewCard";
import { TestimonialCard } from "@/components/mentorship/TestimonialCard";
import { SessionCard } from "@/components/mentorship/SessionCard";
import { Stars } from "@/components/mentorship/Stars";
import { LiveClassLaptop } from "@/components/home/LiveClassLaptop";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import { OpportunitySearch } from "@/components/opportunities/OpportunitySearch";
import { ProductCard } from "@/components/store/ProductCard";
import { SocialLinks } from "@/components/site/Footer";
import { JsonLd } from "@/components/ui/JsonLd";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { YouTubeIcon } from "@/components/ui/icons";
import { VideoCard } from "@/components/video/VideoCard";
import { safe } from "@/lib/safe";
import { getMentorStats, listPublicReviews, listUpcomingSessions } from "@/lib/services/mentorship";
import { closingSoon } from "@/lib/services/opportunities";
import { listPublishedPosts } from "@/lib/services/posts";
import { getSettings } from "@/lib/services/settings";
import { listPublishedProducts } from "@/lib/services/store";
import { listPublicVideos } from "@/lib/services/videos";
import { listPublicTestimonials } from "@/lib/services/testimonials";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { formatPrice, formatSessionDate, formatSessionTime } from "@/lib/utils/session-time";

export const revalidate = 300;

/** 3D art: Microsoft Fluent Emoji (MIT licence), in /public/images/3d. */
const art = (name: string) => `/images/3d/${name}.webp`;

/* Learning pathways: like a course catalogue, by goal. */
const PATHWAYS = [
  { img: "scientist", small: "microscope", jp: "研究", title: "Research internships", text: "Fully funded summer and semester internships in Japanese labs, from finding a professor to the interview.", href: "/opportunities?type=internship#results", tint: "bg-indigo-soft" },
  { img: "student-man", small: "trophy", jp: "奨学金", title: "Scholarships & MEXT", text: "MEXT and other fully funded scholarships: eligibility, documents, timelines and the research proposal.", href: "/opportunities?type=scholarship#results", tint: "bg-accent-soft" },
  { img: "school", small: "books", jp: "大学院", title: "Master's & PhD in Japan", text: "English-taught programs, choosing labs and supervisors, and planning your application year.", href: "/universities", tint: "bg-matcha-soft" },
  { img: "briefcase", small: "tokyo-tower", jp: "仕事", title: "Careers in Japan", text: "Internships that lead to jobs, the skills companies look for, and life after you land.", href: "/blog", tint: "bg-sakura" },
];

const STEPS = [
  { img: "laptop", small: "headphone", step: "01", title: "Learn the basics, free", text: "Start with free guides and videos: which programs exist, when to apply and what makes a strong profile.", tint: "bg-indigo-soft" },
  { img: "clipboard", small: "check", step: "02", title: "Prepare with real material", text: "Use templates and checklists from the store, and join a live session to get your questions answered.", tint: "bg-accent-soft" },
  { img: "airplane", small: "japan-map", step: "03", title: "Apply with confidence", text: "Pick an opportunity or university, follow the deadline, and send an application you're proud of.", tint: "bg-matcha-soft" },
];

const QUICK = [
  { href: "/sessions", label: "Live sessions", img: "video-camera" },
  { href: "/store", label: "Study store", img: "books" },
  { href: "/blog", label: "Blog", img: "open-book" },
  { href: "/opportunities", label: "Opportunities", img: "globe" },
  { href: "/universities", label: "Universities", img: "school" },
];

const WHY = [
  { img: "handshake", title: "Learn from someone who did it", text: "Every session and guide comes from real applications, real labs and real interviews in Japan." },
  { img: "speech", title: "Small live groups", text: "Sessions are kept small, so there's time for your questions, your profile and your doubts." },
  { img: "inbox", title: "Material you keep", text: "Templates, checklists and guides download instantly and stay in your library forever." },
  { img: "bell", title: "Never miss a session", text: "Join links, calendar invites and a reminder one hour before, straight to your inbox." },
  { img: "star", title: "Honest student reviews", text: "Every attendee can rate their session. What you read here is what students actually said." },
  { img: "open-book", title: "Free guides to start", text: "Step-by-step articles and videos, free for everyone, before you spend a rupee." },
];

const PLATFORM_FAQS = [
  { q: "What can I do on this platform?", a: "Join live group sessions, download guides and templates from the store, read free step-by-step guides, and find internships, scholarships and universities in Japan." },
  { q: "Do I need an account?", a: "Guides, videos, opportunities and the university directory are free and open. An account is created automatically when you book a session or buy something, or you can sign up any time." },
  { q: "How do I get what I buy?", a: "Right after payment it appears in My library in your account, ready to download as many times as you need. You also get a receipt by email." },
];

export default async function HomePage() {
  const settings = await getSettings();
  const [sessions, reviews, stats, posts, videos, products, opportunities, testimonials] = await Promise.all([
    safe("home.sessions", () => listUpcomingSessions(3), []),
    safe("home.reviews", () => listPublicReviews(10), []),
    safe("home.stats", () => getMentorStats(), { sessions: 0, students: 0, avgRating: 0, reviewCount: 0 }),
    safe("home.posts", () => listPublishedPosts({ pageSize: 3 }), { items: [], total: 0, page: 1, pages: 1 }),
    safe("home.videos", () => listPublicVideos({ limit: 4 }), []),
    safe("home.products", () => listPublishedProducts({ limit: 4 }), []),
    safe("home.opportunities", () => closingSoon(6), []),
    safe("home.testimonials", () => listPublicTestimonials(12), []),
  ]);
  const { profile, social, mentorship } = settings;
  const firstName = profile.name.split(" ")[0];
  const next = sessions[0];
  const faqs = [...PLATFORM_FAQS, ...mentorship.faqs].slice(0, 7);
  // Session reviews first (verified attendees), then kind words from YouTube.
  const stories = [
    ...reviews.filter((r) => r.text).map((r) => ({ key: `r-${r.id}`, node: <ReviewCard review={r} /> })),
    ...testimonials.map((t) => ({ key: `t-${t.id}`, node: <TestimonialCard t={t} /> })),
  ];
  const liveCard = (
    <div className="rounded-2xl border border-line bg-[#fffdf9] p-4 shadow-[0_24px_50px_-30px_rgba(29,43,69,0.6)]">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-cream">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" /> Live
        </span>
        {next && <span className="text-[0.7rem] font-medium text-accent-deep">{next.seatsLeft} seats left</span>}
      </div>
      <p className="mt-2 line-clamp-2 text-[0.95rem] font-medium leading-snug text-ink">{next ? next.title : "New live sessions every month"}</p>
      {next && <p className="mt-1 text-xs text-ink-2">{formatSessionDate(next.startsAt)} · {formatSessionTime(next.startsAt)} IST · {next.price ? formatPrice(next.price) : "Free"}</p>}
      <Link href={next ? `/sessions/${next.slug}` : "/sessions"} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent-deep hover:underline">
        {next ? "Book your seat" : "See sessions"} <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "EducationalOrganization",
          name: SITE_NAME,
          url: SITE_URL,
          description: "Live sessions, study material and guides for students heading to Japan.",
          founder: { "@type": "Person", name: profile.name },
          sameAs: [social.youtube, social.instagram, social.linkedin, social.x].filter(Boolean),
        }}
      />

      {/* ------------------------------ Hero ------------------------------ */}
      <section className="seigaiha relative overflow-hidden border-b border-line bg-paper-2">
        <div className="container-x relative grid grid-cols-1 items-center gap-12 pb-16 pt-28 sm:pb-32 md:pt-32 lg:grid-cols-12 lg:gap-10 lg:pb-36">
          <div className="lg:col-span-6">
            <p className="kicker flex items-center gap-3 text-muted" data-reveal>
              <span className="h-px w-8 bg-accent" /> <span className="jp text-accent">学ぶ</span> Learn · Apply · Go
            </p>
            <h1 className="display mt-5 text-[3rem] leading-[0.95] sm:text-6xl lg:text-[5rem]" data-reveal>
              Learn your way <em className="text-accent">to Japan.</em>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2 md:text-xl" data-reveal>
              Live sessions, study material and step-by-step guides for internships, scholarships and study in Japan, from {firstName}, who has done it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3" data-reveal>
              <Link href="/sessions" className="btn btn-accent !px-6 !py-3.5 text-base">Start learning <ArrowRight className="size-4" /></Link>
              <Link href="/store" className="btn btn-ghost !px-6 !py-3.5 text-base text-ink"><ShoppingBag className="size-4" /> Study store</Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-2" data-reveal>
              {stats.reviewCount > 0 && (
                <span className="flex items-center gap-2"><Stars value={stats.avgRating} /> <strong className="text-ink">{stats.avgRating.toFixed(1)}</strong> from {stats.reviewCount} reviews</span>
              )}
              {stats.students > 0 && <span className="flex items-center gap-2"><Users className="size-4 text-accent" /> <strong className="text-ink">{stats.students.toLocaleString("en-IN")}+</strong> students guided</span>}
              <span className="flex items-center gap-2"><Check className="size-4 text-moss" /> Free guides, no sign-up needed</span>
            </div>
          </div>

          {/* Live class on a laptop, with the real next session floating on top */}
          <div className="relative mx-auto w-full max-w-lg lg:col-span-6 lg:max-w-none" data-reveal>
            <LiveClassLaptop hostName={firstName} topic={next ? next.title : "Live class: research proposals"} />
            <div className="absolute -bottom-24 left-6 hidden w-[19rem] sm:block lg:-left-8">{liveCard}</div>
            <div className="relative z-10 mx-1 mt-6 sm:hidden">{liveCard}</div>
            <div className="absolute -top-2 right-0 flex items-center gap-2.5 rounded-full border border-line bg-[#fffdf9] py-1.5 pl-1.5 pr-4 shadow-[0_20px_40px_-28px_rgba(29,43,69,0.6)] sm:right-6">
              {profile.avatarUrl && (
                <span className="relative size-9 overflow-hidden rounded-full bg-paper-3 ring-2 ring-accent">
                  <Image src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" fill sizes="36px" className="object-cover" priority />
                </span>
              )}
              <span className="leading-tight">
                <span className="block text-[0.65rem] text-muted">Your mentor</span>
                <span className="block text-sm font-medium text-ink">{profile.name}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ Quick access ------------------------------ */}
      <section className="border-b border-line bg-[#fffdf9]">
        <div className="container-x">
          <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-4 sm:mx-0 sm:grid sm:grid-cols-5 sm:px-0">
            {QUICK.map(({ href, label, img }) => (
              <li key={href} className="shrink-0">
                <Link href={href} className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-[0.95rem] font-medium text-ink transition-colors hover:bg-paper-2">
                  <span className="grid size-10 place-items-center rounded-xl bg-paper-2"><Image src={art(img)} alt="" width={64} height={64} className="size-7" /></span>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------ Watch & learn ------------------------------ */}
      {videos.length > 0 && (
        <section className="py-20 md:py-24">
          <div className="container-x">
            <SectionHeader kicker="Watch & learn" title={<>Start with a free <em className="text-accent">video lesson</em></>} description={`Step-by-step guides from ${firstName}'s YouTube channel: scholarships, internships and life in Japan.`} href="/videos" linkLabel="All videos" />
            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {videos.map((v) => <VideoCard key={v.youtubeId} video={v} sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 100vw" />)}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------ Student stories ------------------------------ */}
      {stories.length > 0 && (
        <section className="overflow-hidden border-t border-line bg-indigo-soft/40 py-20 md:py-24">
          <div className="container-x">
            <SectionHeader
              kicker="Student love"
              title={<>What students <em className="text-accent">say</em></>}
              description={stats.reviewCount > 0 ? `${stats.avgRating.toFixed(1)} / 5 from ${stats.reviewCount} session review${stats.reviewCount === 1 ? "" : "s"}, plus kind words from the YouTube community.` : "Kind words from students and viewers on YouTube."}
              href="/sessions"
              linkLabel="Book a session"
            />
          </div>
          {stories.length >= 4 ? (
            // Gentle auto-scrolling row (pauses on hover, off for reduced motion).
            <div className="mt-10 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
              <div className="animate-marquee flex w-max items-stretch gap-5 hover:[animation-play-state:paused]">
                {[...stories, ...stories].map((st, i) => (
                  <div key={`${st.key}-${i}`} className="w-[20rem] shrink-0 md:w-[24rem]" aria-hidden={i >= stories.length}>
                    {st.node}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="container-x mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
              {stories.map((st) => <div key={st.key}>{st.node}</div>)}
            </div>
          )}
        </section>
      )}

      {/* ------------------------------ Live sessions ------------------------------ */}
      {mentorship.enabled && (
        <section className="border-t border-line py-20 md:py-24">
          <div className="container-x">
            <SectionHeader kicker="Live sessions" title={<>Popular <em className="text-accent">live sessions</em></>} description={mentorship.intro} href="/sessions" linkLabel="All sessions" />
            {sessions.length > 0 ? (
              <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {sessions.map((s) => <SessionCard key={s.id} session={s} />)}
              </div>
            ) : (
              <p className="mt-8 text-ink-2">New dates are announced soon. <Link href="/sessions" className="underline underline-offset-4">See how sessions work</Link></p>
            )}
          </div>
        </section>
      )}

      {/* ------------------------------ Opportunity finder ------------------------------ */}
      <section className="relative overflow-hidden bg-[#f8eed6]/70 py-16 md:py-20">
        <Image src={art("globe")} alt="" width={160} height={160} loading="eager" className="float-slow pointer-events-none absolute -right-6 top-8 hidden w-28 opacity-90 md:block lg:right-10" />
        <Image src={art("airplane")} alt="" width={120} height={120} className="pointer-events-none absolute left-[46%] top-6 hidden w-14 md:block" />
        <div className="container-x relative">
          <SectionHeader kicker="Opportunity finder" title={<>Find internships, scholarships &amp; <em className="text-accent">fellowships</em></>} description="Hand-picked programs for students heading to Japan, with official links and deadlines. Filter by type, country, funding and how soon it closes." />
          <OpportunitySearch className="mt-8 !bg-[#fffdf9]/90" />
          {opportunities.length > 0 && (
            <>
              <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {opportunities.map((o) => <OpportunityCard key={o.id} o={o} />)}
              </div>
              <div className="mt-8 text-center">
                <Link href="/opportunities" className="btn btn-ghost text-ink">See all opportunities <ArrowRight className="size-4" /></Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ------------------------------ Pathways ------------------------------ */}
      <section className="py-20 md:py-24">
        <div className="container-x">
          <SectionHeader kicker="Learning pathways" title={<>Choose your <em className="text-accent">path</em></>} description="Pick your goal. Each path brings together the sessions, guides, material and opportunities for it." />
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PATHWAYS.map(({ img, small, jp, title, text, href, tint }, i) => (
              <Link
                key={title}
                href={href}
                data-reveal
                style={{ "--reveal-delay": `${i * 70}ms` } as React.CSSProperties}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-[#fffdf9] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-ink/20 hover:shadow-[0_24px_50px_-35px_rgba(29,43,69,0.55)]"
              >
                <div className={`seigaiha relative grid aspect-[12/7] place-items-center overflow-hidden rounded-2xl ${tint}`}>
                  <span className="absolute -right-8 -top-8 size-28 rounded-full bg-[#fffdf9]/50" />
                  <Image src={art(img)} alt="" width={160} height={160} className="relative size-28 drop-shadow-[0_14px_18px_rgba(29,43,69,0.22)] transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-110" />
                  <Image src={art(small)} alt="" width={80} height={80} className="float-slow absolute bottom-3 left-4 size-11 drop-shadow-md" />
                </div>
                <span className="jp mt-4 px-2 text-sm text-accent">{jp}</span>
                <h3 className="display mt-1 px-2 text-[1.6rem] leading-tight">{title}</h3>
                <p className="mt-2 flex-1 px-2 text-[0.95rem] leading-relaxed text-ink-2">{text}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 px-2 pb-2 text-sm font-medium text-ink">Explore <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ Study material ------------------------------ */}
      {products.length > 0 && (
        <section className="border-t border-line bg-sakura/40 py-20 md:py-24">
          <div className="container-x">
            <SectionHeader kicker="Study material" title={<>Guides &amp; templates, <em className="text-accent">ready to use</em></>} href="/store" linkLabel="Open the store" />
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------ How it works ------------------------------ */}
      <section className="border-t border-line bg-paper-2 py-20 md:py-24">
        <div className="container-x">
          <SectionHeader kicker="How it works" title={<>Learn. Prepare. <em className="text-accent">Apply.</em></>} />
          <ol className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {STEPS.map(({ img, small, step, title, text, tint }, i) => (
              <li key={step} className="rounded-3xl border border-line bg-[#fffdf9] p-4" data-reveal style={{ "--reveal-delay": `${i * 80}ms` } as React.CSSProperties}>
                <div className={`relative grid aspect-[12/7] place-items-center overflow-hidden rounded-2xl ${tint}`}>
                  <span className="absolute -left-6 -bottom-10 size-32 rounded-full bg-[#fffdf9]/50" />
                  <Image src={art(img)} alt="" width={160} height={160} className="relative size-28 drop-shadow-[0_14px_18px_rgba(29,43,69,0.22)]" />
                  <Image src={art(small)} alt="" width={80} height={80} className="float-slow absolute right-5 top-4 size-11 drop-shadow-md" />
                </div>
                <div className="px-2 pb-2 pt-4">
                  <span className="font-mono text-xs text-accent">{step}</span>
                  <h3 className="display mt-1 text-[1.6rem] leading-tight">{title}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-2">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------ Blog ------------------------------ */}
      {posts.items.length > 0 && (
        <section className="border-t border-line py-20 md:py-24">
          <div className="container-x">
            <SectionHeader kicker="From the blog" title={<>Latest from <em className="text-accent">the blog</em></>} description="Free, step-by-step articles on internships, scholarships, cold emails and life in Japan." href="/blog" linkLabel="All articles" />
            <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {posts.items.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------ Why learn here ------------------------------ */}
      <section className="border-t border-line bg-paper-2 py-20 md:py-24">
        <div className="container-x grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeader kicker="Why learn here" title={<>Practical, honest, <em className="text-accent">yours.</em></>} />
            <p className="mt-5 text-ink-2" data-reveal>{profile.shortBio}</p>
            <Link href="/about" className="group mt-6 inline-flex items-center gap-2 font-medium text-ink" data-reveal>
              <span className="link-underline">Meet {firstName}</span> <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-8">
            {WHY.map(({ img, title, text }, i) => (
              <li key={title} className="rounded-3xl border border-line bg-[#fffdf9] p-6" data-reveal style={{ "--reveal-delay": `${i * 60}ms` } as React.CSSProperties}>
                <span className="grid size-14 place-items-center rounded-2xl bg-paper-2"><Image src={art(img)} alt="" width={80} height={80} className="size-10" /></span>
                <h3 className="mt-4 font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-2">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------ Community ------------------------------ */}
      <section className="border-t border-line bg-indigo-soft/60 py-20 md:py-24">
        <div className="container-x grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <div data-reveal>
            <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> <span className="jp text-accent">仲間</span> Community</p>
            <h2 className="display mt-4 text-4xl md:text-5xl">Join students on the <em className="text-accent">same journey.</em></h2>
            <p className="mt-4 max-w-lg text-ink-2">Weekly videos, deadline reminders and honest stories from Japan. Follow along, ask questions, and learn with others.</p>
          </div>
          <div className="flex flex-col gap-4 md:items-end" data-reveal>
            <SocialLinks social={social} className="flex-wrap text-ink" />
            <div className="flex flex-wrap gap-3">
              {social.youtube && (
                <a href={`${social.youtube}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" className="btn btn-accent"><YouTubeIcon className="size-4" /> Subscribe on YouTube</a>
              )}
              <Link href="/account/login?mode=signup" className="btn btn-ink">Create free account</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ FAQ ------------------------------ */}
      {faqs.length > 0 && (
        <section className="border-t border-line py-20 md:py-24">
          <div className="container-x grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-4">
              <SectionHeader kicker="FAQ" title={<>Good to <em className="text-accent">know</em></>} />
            </div>
            <div className="divide-y divide-line border-y border-line md:col-span-8">
              {faqs.map((f) => (
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

      {/* ------------------------------ Final CTA ------------------------------ */}
      <section className="pb-24">
        <div className="container-x">
          <div className="grid overflow-hidden rounded-[2rem] border border-line bg-sakura md:grid-cols-2">
            <div className="seigaiha relative px-6 py-14 text-center md:px-12 md:py-20 md:text-left">
              <p className="jp relative text-sm text-accent">はじめよう</p>
              <h2 className="display relative mt-3 text-4xl md:text-6xl">Start learning <em className="text-accent">today.</em></h2>
              <p className="relative mx-auto mt-3 max-w-md text-ink-2 md:mx-0">Book a live session, grab a study pack, or start with a free guide. Your road to Japan begins with one step.</p>
              <div className="relative mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
                <Link href="/sessions" className="btn btn-accent !px-6 !py-3.5">Browse sessions</Link>
                <Link href="/blog" className="btn btn-ghost !px-6 !py-3.5 text-ink">Read the blog</Link>
              </div>
            </div>
            <div className="relative grid min-h-64 place-items-center overflow-hidden bg-indigo-soft md:min-h-full" aria-hidden>
              <span className="absolute size-64 rounded-full bg-[#fffdf9]/60 md:size-80" />
              <Image src={art("mount-fuji")} alt="" width={320} height={320} className="relative w-44 drop-shadow-[0_20px_24px_rgba(29,43,69,0.25)] md:w-56" />
              <Image src={art("torii")} alt="" width={160} height={160} className="absolute bottom-8 left-[18%] w-16 drop-shadow-lg md:w-20" />
              <Image src={art("cherry-blossom")} alt="" width={120} height={120} className="float-slow absolute right-[20%] top-8 w-12 drop-shadow-md md:w-14" />
              <Image src={art("graduation-cap")} alt="" width={140} height={140} className="float-slow absolute bottom-10 right-[16%] w-16 drop-shadow-lg [animation-delay:-3s] md:w-20" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
