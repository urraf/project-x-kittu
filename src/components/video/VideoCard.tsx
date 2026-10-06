import Link from "next/link";
import { PlayGlyph } from "@/components/ui/icons";
import { YouTubeThumb } from "@/components/video/YouTubeThumb";
import { seriesLabel } from "@/lib/site";
import { cleanTitle, formatCompact, formatDuration, timeAgo } from "@/lib/utils/text";
import { cn } from "@/lib/utils/cn";
import type { VideoDTO } from "@/lib/types";

export function VideoCard({
  video,
  tone = "light",
  size = "md",
  sizes,
}: {
  video: VideoDTO;
  tone?: "light" | "dark";
  size?: "md" | "lg";
  sizes?: string;
}) {
  const title = cleanTitle(video.title);
  const meta = [video.views ? `${formatCompact(video.views)} views` : null, timeAgo(video.publishedAt)].filter(Boolean).join(" · ");
  return (
    <Link href={`/videos/${video.youtubeId}`} className="group block focus-visible:outline-none">
      <div className="img-zoom relative aspect-video overflow-hidden rounded-xl bg-night-3 ring-1 ring-black/5 transition-shadow duration-500 group-focus-visible:ring-2 group-focus-visible:ring-accent">
        <YouTubeThumb id={video.youtubeId} alt={title} sizes={sizes} />
        <span className="absolute inset-0 bg-night/0 transition-colors duration-500 group-hover:bg-night/25" />
        <span className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 scale-75 place-items-center rounded-full bg-accent text-white opacity-0 transition-all duration-500 ease-[var(--ease-out-expo)] group-hover:scale-100 group-hover:opacity-100">
          <PlayGlyph className="ml-0.5 size-6" />
        </span>
        {video.durationSec ? (
          <span className="absolute bottom-2 right-2 rounded-md bg-night/85 px-1.5 py-0.5 font-mono text-[0.7rem] text-cream backdrop-blur">
            {formatDuration(video.durationSec)}
          </span>
        ) : null}
      </div>
      <div className="mt-4">
        <p className={cn("kicker", tone === "dark" ? "text-accent" : "text-accent-deep")}>{seriesLabel(video.series)}</p>
        <h3
          className={cn(
            "mt-2 font-medium leading-snug tracking-[-0.01em]",
            size === "lg" ? "text-xl" : "text-[1.02rem]",
            tone === "dark" ? "text-cream" : "text-ink",
          )}
        >
          <span className="link-underline">{title}</span>
        </h3>
        {meta && <p className={cn("mt-1.5 text-[0.82rem]", tone === "dark" ? "text-cream-muted" : "text-muted")}>{meta}</p>}
      </div>
    </Link>
  );
}
