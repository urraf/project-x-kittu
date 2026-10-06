import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PostCard } from "@/components/blog/PostCard";
import { JsonLd } from "@/components/ui/JsonLd";
import { ShareButton } from "@/components/ui/ShareButton";
import { YouTubeIcon } from "@/components/ui/icons";
import { LiteYouTube } from "@/components/video/LiteYouTube";
import { Linkified } from "@/components/video/Linkified";
import { YouTubeThumb } from "@/components/video/YouTubeThumb";
import { safe } from "@/lib/safe";
import { getPostsForVideo, listPublishedPosts } from "@/lib/services/posts";
import { getUpNext, getVideoByYoutubeId } from "@/lib/services/videos";
import { absoluteUrl, seriesLabel } from "@/lib/site";
import { cleanTitle, formatCompact, formatDate, formatDuration, timeAgo, truncate } from "@/lib/utils/text";
import { youtubeEmbedUrl, youtubeThumb, youtubeWatchUrl } from "@/lib/utils/youtube";

export const revalidate = 600;

/** Render each page on first visit, then cache it (ISR) and refresh via revalidation. */
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  return safe("video.detail", () => getVideoByYoutubeId(id), null);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const video = await load(id);
  if (!video) return { title: "Video not found", robots: { index: false } };
  const title = cleanTitle(video.title);
  const description = truncate(video.description.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim() || title, 160);
  return {
    title,
    description,
    alternates: { canonical: `/videos/${id}` },
    openGraph: {
      type: "video.other",
      title,
      description,
      url: absoluteUrl(`/videos/${id}`),
      images: [{ url: youtubeThumb(id, "max"), width: 1280, height: 720, alt: title }],
      videos: [{ url: youtubeWatchUrl(id) }],
    },
    twitter: { card: "summary_large_image", title, description, images: [youtubeThumb(id, "max")] },
  };
}

function isoDuration(sec?: number) {
  if (!sec) return undefined;
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s}S`;
}

export default async function VideoPage({ params }: Props) {
  const { id } = await params;
  const video = await load(id);
  if (!video) notFound();

  const title = cleanTitle(video.title);
  const [upNext, linkedPosts] = await Promise.all([
    safe("video.upnext", () => getUpNext(video, 8), []),
    safe("video.posts", () => getPostsForVideo(video.youtubeId, 3), []),
  ]);
  const morePosts = linkedPosts.length >= 3 ? [] : await safe("video.moreposts", () => listPublishedPosts({ pageSize: 3 - linkedPosts.length, excludeIds: linkedPosts.map((p) => p.id) }), { items: [], total: 0, page: 1, pages: 1 }).then((r) => r.items);
  const related = [...linkedPosts, ...morePosts];
  const url = absoluteUrl(`/videos/${video.youtubeId}`);
  const description = video.description.trim();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: title,
          description: truncate(description || title, 500),
          thumbnailUrl: [youtubeThumb(video.youtubeId, "max"), youtubeThumb(video.youtubeId, "hq")],
          uploadDate: video.publishedAt,
          duration: isoDuration(video.durationSec),
          embedUrl: youtubeEmbedUrl(video.youtubeId),
          contentUrl: youtubeWatchUrl(video.youtubeId),
          ...(video.views ? { interactionStatistic: { "@type": "InteractionCounter", interactionType: { "@type": "WatchAction" }, userInteractionCount: video.views } } : {}),
        }}
      />
      <section className="grain relative overflow-hidden bg-night text-cream">
        <div className="container-x relative z-[2] pb-20 pt-28 md:pt-32">
          <Link href="/videos" className="group mb-8 inline-flex items-center gap-2 text-sm text-cream-muted hover:text-cream">
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /> All videos
          </Link>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <LiteYouTube id={video.youtubeId} title={title} priority />
              <p className="kicker mt-8 text-accent">{seriesLabel(video.series)}</p>
              <h1 className="display mt-3 text-[2.4rem] leading-[1.02] md:text-[3.4rem]">{title}</h1>
              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-cream-muted">
                {video.publishedAt && <time dateTime={video.publishedAt}>{formatDate(video.publishedAt)}</time>}
                {video.views ? <><span aria-hidden>·</span><span>{formatCompact(video.views)} views</span></> : null}
                {video.durationSec ? <><span aria-hidden>·</span><span>{formatDuration(video.durationSec)}</span></> : null}
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href={youtubeWatchUrl(video.youtubeId)} target="_blank" rel="noopener noreferrer" className="btn btn-accent">
                  <YouTubeIcon className="size-4" /> Watch on YouTube
                </a>
                <ShareButton url={url} title={title} className="text-cream" />
              </div>
              {description && (
                <details className="group mt-10 rounded-2xl border border-cream/10 bg-night-2/60 p-6 open:bg-night-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-cream [&::-webkit-details-marker]:hidden">
                    About this video
                    <span className="text-cream-muted group-open:hidden">Show more</span>
                    <span className="hidden text-cream-muted group-open:inline">Show less</span>
                  </summary>
                  <p className="mt-5 whitespace-pre-line text-[0.95rem] leading-relaxed text-cream/75">
                    <Linkified text={description} />
                  </p>
                </details>
              )}
            </div>

            <aside className="lg:col-span-4" aria-label="Up next">
              <h2 className="kicker flex items-center gap-3 text-cream-muted">
                <span className="h-px w-8 bg-accent" /> Up next
              </h2>
              <ul className="mt-6 space-y-5">
                {upNext.map((v) => (
                  <li key={v.youtubeId}>
                    <Link href={`/videos/${v.youtubeId}`} className="group flex gap-4">
                      <span className="img-zoom relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-night-3">
                        <YouTubeThumb id={v.youtubeId} alt="" sizes="160px" />
                        {v.durationSec ? <span className="absolute bottom-1.5 right-1.5 rounded bg-night/85 px-1 font-mono text-[0.65rem]">{formatDuration(v.durationSec)}</span> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-3 text-[0.9rem] leading-snug text-cream group-hover:text-accent">{cleanTitle(v.title)}</span>
                        <span className="mt-1.5 block text-xs text-cream-muted">{[v.views ? `${formatCompact(v.views)} views` : null, timeAgo(v.publishedAt)].filter(Boolean).join(" · ")}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="py-20 md:py-28">
          <div className="container-x">
            <h2 className="display text-4xl md:text-5xl">{linkedPosts.length ? <>Read the <em className="text-accent">companion article</em></> : <>Keep reading</>}</h2>
            <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
