import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero } from "@/components/home/Hero";
import { JourneyRail } from "@/components/home/JourneyRail";
import { Routes } from "@/components/home/Routes";
import { SessionsTeaser } from "@/components/home/SessionsTeaser";
import { getMentorStats, listPublicReviews, listUpcomingSessions } from "@/lib/services/mentorship";
import { PostCard } from "@/components/blog/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { JsonLd } from "@/components/ui/JsonLd";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { YouTubeIcon } from "@/components/ui/icons";
import { LiteYouTube } from "@/components/video/LiteYouTube";
import { VideoCard } from "@/components/video/VideoCard";
import { safe } from "@/lib/safe";
import { listMilestones } from "@/lib/services/milestones";
import { listPublishedPosts } from "@/lib/services/posts";
import { getSettings } from "@/lib/services/settings";
import { getFeaturedVideos, listPublicVideos, seriesCounts } from "@/lib/services/videos";
import { SITE_URL, seriesLabel } from "@/lib/site";
import { cleanTitle, formatCompact, formatDate, truncate } from "@/lib/utils/text";
import { youtubeWatchUrl } from "@/lib/utils/youtube";

export const revalidate = 300;

export default async function HomePage() {
  const settings = await getSettings();
  const [videos, featured, posts, milestones, counts, upcomingSessions, sessionReviews, mentorStats] = await Promise.all([
    safe("home.videos", () => listPublicVideos({ limit: 9 }), []),
    safe("home.featured", () => getFeaturedVideos(1), []),
    safe("home.posts", () => listPublishedPosts({ pageSize: 4 }), { items: [], total: 0, page: 1, pages: 1 }),
    safe("home.milestones", () => listMilestones(), []),
    safe("home.counts", () => seriesCounts(), {} as Record<string, number>),
    safe("home.sessions", () => listUpcomingSessions(3), []),
    safe("home.reviews", () => listPublicReviews(3), []),
    safe("home.mentorStats", () => getMentorStats(), { sessions: 0, students: 0, avgRating: 0, reviewCount: 0 }),
  ]);

  const { profile, social } = settings;
  const latest = videos[0];
  const spotlight = featured[0] ?? latest;
  const moreVideos = videos.filter((v) => v.youtubeId !== spotlight?.youtubeId).slice(0, 4);
  const [leadPost, ...otherPosts] = posts.items;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          url: SITE_URL,
          mainEntity: {
            "@type": "Person",
            name: profile.name,
            alternateName: profile.channelName,
            description: profile.shortBio,
            image: profile.avatarUrl || undefined,
            jobTitle: profile.currentRole,
            sameAs: [social.youtube, social.instagram, social.linkedin, social.x].filter(Boolean),
          },
        }}
      />

      <Hero profile={profile} latest={latest} />

      {/* Introduction */}
      <section className="py-24 md:py-36">
        <div className="container-x grid gap-12 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-7" data-reveal>
            <p className="kicker flex items-center gap-3 text-muted">
              <span className="h-px w-8 bg-accent" /> Hello there
            </p>
            <p className="display mt-6 text-[2.5rem] leading-[1.04] md:text-[4.1rem]">{profile.introTitle}</p>
          </div>
          <div className="md:col-span-5 md:pt-14" data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
            <p className="text-lg leading-relaxed text-ink-2">{profile.shortBio}</p>
            <dl className="mt-8 divide-y divide-line border-y border-line">
              {profile.quickFacts.slice(0, 4).map((f) => (
                <div key={f.label} className="flex items-baseline justify-between gap-6 py-3.5">
                  <dt className="kicker text-muted">{f.label}</dt>
                  <dd className="text-right text-[0.95rem] text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-8 flex items-center justify-between">
              <p className="display text-3xl italic text-ink">— {profile.name.split(" ")[0]}</p>
              <Link href="/journey" className="group inline-flex items-center gap-2 text-[0.95rem] font-medium">
                <span className="link-underline">The full story</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Video spotlight */}
      {spotlight && (
        <section className="grain relative overflow-hidden bg-night py-24 text-cream md:py-32">
          <div className="container-x relative z-[2]">
            <SectionHeader tone="dark" kicker="Now playing" title={<>Fresh from <em className="text-accent">the channel</em></>} href="/videos" linkLabel="All videos" />
            <div className="mt-14 grid gap-10 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-8" data-reveal>
                <LiteYouTube id={spotlight.youtubeId} title={cleanTitle(spotlight.title)} />
              </div>
              <div className="lg:col-span-4" data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
                <p className="kicker text-accent">{seriesLabel(spotlight.series)}</p>
                <h3 className="display mt-4 text-[2.2rem] leading-[1.05] md:text-[2.6rem]">{cleanTitle(spotlight.title)}</h3>
                <p className="mt-4 text-sm text-cream-muted">
                  {[formatDate(spotlight.publishedAt), spotlight.views ? `${formatCompact(spotlight.views)} views` : null].filter(Boolean).join(" · ")}
                </p>
                {spotlight.description && (
                  <p className="mt-5 leading-relaxed text-cream/70">{truncate(cleanTitle(spotlight.description.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ")).trim(), 220)}</p>
                )}
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={`/videos/${spotlight.youtubeId}`} className="btn btn-accent">Watch here</Link>
                  <a href={youtubeWatchUrl(spotlight.youtubeId)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-cream">
                    <YouTubeIcon className="size-4" /> On YouTube
                  </a>
                </div>
              </div>
            </div>
            {moreVideos.length > 0 && (
              <div className="mt-20 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                {moreVideos.map((v, i) => (
                  <div key={v.youtubeId} data-reveal style={{ "--reveal-delay": `${i * 70}ms` } as React.CSSProperties}>
                    <VideoCard video={v} tone="dark" sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 100vw" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Journey */}
      {milestones.length > 0 && (
        <section className="overflow-hidden bg-paper-2 py-24 md:py-32">
          <div className="container-x">
            <SectionHeader
              kicker="The journey"
              title={<>Every chapter, <em className="text-accent">so far.</em></>}
              description="From an engineering campus in Delhi to research labs in Japan and a first job in Lucknow. The road, as it actually happened."
              href="/journey"
              linkLabel="Read the full journey"
            />
            <div className="mt-16">
              <JourneyRail milestones={milestones} />
            </div>
          </div>
        </section>
      )}

      {/* Routes */}
      <section className="py-24 md:py-32">
        <div className="container-x">
          <SectionHeader
            kicker="Find your route"
            title={<>Where do you want <em className="text-accent">to go?</em></>}
            description="Pick a destination. Every route collects the guides, deadlines-to-watch and honest experiences for that part of the world."
          />
          <div className="mt-14">
            <Routes counts={counts} />
          </div>
        </div>
      </section>

      {/* Sessions */}
      {settings.mentorship.enabled && (
        <SessionsTeaser headline={settings.mentorship.headline} intro={settings.mentorship.intro} sessions={upcomingSessions} reviews={sessionReviews} stats={mentorStats} />
      )}

      {/* Blog */}
      <section className="border-t border-line py-24 md:py-32">
        <div className="container-x">
          <SectionHeader kicker="From the blog" title={<>Field notes &amp; <em className="text-accent">guides</em></>} href="/blog" linkLabel="All articles" />
          <div className="mt-14">
            {leadPost ? (
              <div className="grid gap-12 lg:grid-cols-12">
                <div className="lg:col-span-7" data-reveal>
                  <PostCard post={leadPost} size="lg" />
                </div>
                <div className="divide-y divide-line border-y border-line lg:col-span-5 lg:self-start" data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
                  {otherPosts.map((p) => (
                    <PostCard key={p.id} post={p} variant="compact" />
                  ))}
                  {otherPosts.length === 0 && <p className="py-6 text-ink-2">More stories are on the way.</p>}
                </div>
              </div>
            ) : (
              <EmptyState title="The first stories are on their way" description="Guides, behind-the-scenes notes and long-form stories will appear here soon." />
            )}
          </div>
        </div>
      </section>

      {/* Principles */}
      {profile.principles.length > 0 && (
        <section className="bg-paper-2 py-24 md:py-28">
          <div className="container-x">
            <div className="grid gap-12 md:grid-cols-12">
              <div className="md:col-span-4" data-reveal>
                <p className="kicker flex items-center gap-3 text-muted">
                  <span className="h-px w-8 bg-accent" /> What I believe
                </p>
                <h2 className="display mt-5 text-5xl">The rules I make videos by.</h2>
                {profile.avatarUrl && (
                  <div className="relative mt-8 size-16 overflow-hidden rounded-full ring-4 ring-paper">
                    <Image src={profile.avatarUrl} alt="" fill sizes="64px" className="object-cover" />
                  </div>
                )}
              </div>
              <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:col-span-8 md:grid-cols-3">
                {profile.principles.map((p, i) => (
                  <li key={p.title} className="bg-paper-2 p-7" data-reveal style={{ "--reveal-delay": `${i * 80}ms` } as React.CSSProperties}>
                    <span className="font-mono text-sm text-accent">0{i + 1}</span>
                    <h3 className="display mt-8 text-[1.9rem] leading-[1.05]">{p.title}</h3>
                    <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-2">{p.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
