import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { YouTubeIcon } from "@/components/ui/icons";
import { LiteYouTube } from "@/components/video/LiteYouTube";
import { VideoCard } from "@/components/video/VideoCard";
import { YouTubeThumb } from "@/components/video/YouTubeThumb";
import { safe } from "@/lib/safe";
import { getSettings } from "@/lib/services/settings";
import { getFeaturedVideos, getPopularVideos, pagePublicVideos, seriesCounts } from "@/lib/services/videos";
import { VIDEO_SERIES, absoluteUrl, seriesLabel } from "@/lib/site";
import { cleanTitle, formatCompact, formatDate, truncate } from "@/lib/utils/text";
import { youtubeWatchUrl } from "@/lib/utils/youtube";
import { cn } from "@/lib/utils/cn";

export const revalidate = 300;

type Props = { searchParams: Promise<{ series?: string; page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { series } = await searchParams;
  const valid = VIDEO_SERIES.some((s) => s.id === series);
  const title = valid ? `${seriesLabel(series!)} videos` : "Videos";
  const description = valid
    ? `Every ${seriesLabel(series!)} video from Life of KittuKun: guides, application tips and honest experiences.`
    : "Guides to fully funded internships and scholarships in Japan, Korea and Europe, plus vlogs from the journey.";
  return {
    title,
    description,
    alternates: { canonical: valid ? `/videos?series=${series}` : "/videos" },
    openGraph: { title: `${title} · Life of KittuKun`, description, url: absoluteUrl("/videos") },
  };
}

export default async function VideosPage({ searchParams }: Props) {
  const sp = await searchParams;
  const series = VIDEO_SERIES.some((s) => s.id === sp.series) ? sp.series : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const settings = await getSettings();

  const [list, featured, popular, counts] = await Promise.all([
    safe("videos.list", () => pagePublicVideos({ series, page, pageSize: 24 }), { items: [], total: 0, page: 1, pages: 1 }),
    safe("videos.featured", () => getFeaturedVideos(1), []),
    safe("videos.popular", () => getPopularVideos(8), []),
    safe("videos.counts", () => seriesCounts(), {} as Record<string, number>),
  ]);
  const spotlight = featured[0] ?? list.items[0];
  const totalVideos = Object.values(counts).reduce((a, b) => a + b, 0);
  const showIntro = !series && page === 1;
  const qs = (p: number) => `/videos?${new URLSearchParams({ ...(series ? { series } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <>
      <section className="seigaiha relative overflow-hidden border-b border-line bg-paper-2 text-ink">
        <div className="container-x relative z-[2] pb-16 pt-28 md:pb-20 md:pt-32">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="kicker flex items-center gap-3 text-muted" data-reveal>
                <span className="h-px w-8 bg-accent" /> The channel
              </p>
              <h1 className="display mt-5 text-[2.9rem] leading-[0.95] sm:text-6xl lg:text-[4.75rem]" data-reveal>
                {series ? (
                  <>
                    {seriesLabel(series)} <em className="text-accent">videos</em>
                  </>
                ) : (
                  <>
                    Watch the <em className="text-accent">journey</em>
                  </>
                )}
              </h1>
              <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-ink-2" data-reveal>
                Step-by-step guides to fully funded internships and scholarships, and the vlogs from everything in between.
              </p>
            </div>
            <div className="flex items-center gap-4" data-reveal>
              {settings.profile.avatarUrl && (
                <span className="relative size-14 overflow-hidden rounded-full ring-2 ring-accent">
                  <Image src={settings.profile.avatarUrl} alt="" referrerPolicy="no-referrer" fill sizes="56px" className="object-cover" />
                </span>
              )}
              <div>
                <p className="font-medium">{settings.profile.channelName}</p>
                <p className="text-sm text-muted">
                  {settings.profile.handle}
                  {totalVideos ? ` · ${totalVideos}+ videos here` : ""}
                </p>
              </div>
              {settings.social.youtube && (
                <a href={`${settings.social.youtube}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" className="btn btn-accent ml-2">
                  <YouTubeIcon className="size-4" /> Subscribe
                </a>
              )}
            </div>
          </div>

          {showIntro && spotlight && (
            <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center lg:gap-12" data-reveal>
              <LiteYouTube id={spotlight.youtubeId} title={cleanTitle(spotlight.title)} priority className="lg:col-span-8" sizes="(min-width: 1024px) 60vw, 100vw" />
              <div className="lg:col-span-4">
                <p className="kicker text-accent">{featured[0] ? "Featured" : "Latest upload"} · {seriesLabel(spotlight.series)}</p>
                <h2 className="display mt-3 text-[2rem] leading-[1.05] md:text-[2.3rem]">
                  <Link href={`/videos/${spotlight.youtubeId}`} className="link-underline">{cleanTitle(spotlight.title)}</Link>
                </h2>
                <p className="mt-3 text-sm text-muted">
                  {[formatDate(spotlight.publishedAt), spotlight.views ? `${formatCompact(spotlight.views)} views` : null].filter(Boolean).join(" · ")}
                </p>
                {spotlight.description && (
                  <p className="mt-4 leading-relaxed text-ink-2">
                    {truncate(cleanTitle(spotlight.description.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ")).trim(), 180)}
                  </p>
                )}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`/videos/${spotlight.youtubeId}`} className="btn btn-accent">Watch here</Link>
                  <a href={youtubeWatchUrl(spotlight.youtubeId)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-ink">
                    <YouTubeIcon className="size-4" /> On YouTube
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {showIntro && popular.length > 0 && (
          <div className="relative z-[2] border-t border-line pb-20 pt-14">
            <div className="container-x">
              <h2 className="kicker flex items-center gap-3 text-muted">
                <span className="h-px w-8 bg-accent" /> Most watched
              </h2>
            </div>
            <div className="container-x">
              <ol className="no-scrollbar -mx-4 mt-8 flex snap-x snap-mandatory scroll-pl-4 gap-6 overflow-x-auto px-4 sm:-mx-7 sm:scroll-pl-7 sm:px-7 lg:-mx-10 lg:scroll-pl-10 lg:px-10">
                {popular.map((v, i) => (
                  <li key={v.youtubeId} className="w-[80vw] shrink-0 snap-start sm:w-[24rem]">
                    <Link href={`/videos/${v.youtubeId}`} className="group grid grid-cols-[3.75rem_1fr] gap-x-3">
                      <span
                        className="display self-end select-none text-[6.5rem] leading-[0.72] text-transparent [-webkit-text-stroke:1.5px_var(--color-sakura-deep)] transition-colors group-hover:[-webkit-text-stroke-color:var(--color-accent)]"
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                      <span className="img-zoom relative block aspect-video overflow-hidden rounded-xl bg-paper-3">
                        <YouTubeThumb id={v.youtubeId} alt="" sizes="(min-width: 640px) 19rem, 65vw" />
                      </span>
                      <span className="col-start-2 mt-3 line-clamp-2 text-[0.92rem] leading-snug text-ink">{cleanTitle(v.title)}</span>
                      <span className="col-start-2 mt-1 text-xs text-muted">{formatCompact(v.views)} views</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </section>

      <section className="pb-28">
        <div className="sticky top-[4.5rem] z-30 border-b border-line bg-paper/90 backdrop-blur-xl">
          <nav aria-label="Filter by series" className="no-scrollbar container-x flex gap-2 overflow-x-auto py-4">
            <Link href="/videos" className="chip" data-active={!series}>
              All
            </Link>
            {VIDEO_SERIES.map((s) =>
              counts[s.id] ? (
                <Link key={s.id} href={`/videos?series=${s.id}`} className="chip" data-active={series === s.id}>
                  {s.label}
                  <span className={cn("font-mono text-[0.7rem]", series === s.id ? "text-cream-muted" : "text-muted")}>{counts[s.id]}</span>
                </Link>
              ) : null,
            )}
          </nav>
        </div>

        <div className="container-x pt-14">
          {list.items.length ? (
            <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {list.items.map((v, i) => (
                <div key={v.youtubeId} data-reveal style={{ "--reveal-delay": `${(i % 3) * 70}ms` } as React.CSSProperties}>
                  <VideoCard video={v} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No videos here yet" description="Try another series, or check back soon." action={<Link href="/videos" className="btn btn-ink">See all videos</Link>} />
          )}

          {list.pages > 1 && (
            <nav aria-label="Pagination" className="mt-20 flex items-center justify-between border-t border-line pt-8">
              {page > 1 ? (
                <Link href={qs(page - 1)} className="btn btn-ghost"><ArrowLeft className="size-4" /> Newer</Link>
              ) : <span />}
              <span className="font-mono text-sm text-muted">{page} / {list.pages}</span>
              {page < list.pages ? (
                <Link href={qs(page + 1)} className="btn btn-ghost">Older <ArrowRight className="size-4" /></Link>
              ) : <span />}
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
