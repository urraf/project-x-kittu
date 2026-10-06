"use client";

import { useState } from "react";
import { PlayGlyph } from "@/components/ui/icons";
import { YouTubeThumb } from "@/components/video/YouTubeThumb";
import { youtubeEmbedUrl } from "@/lib/utils/youtube";
import { cn } from "@/lib/utils/cn";

/**
 * Click-to-load YouTube player. Shows a lightweight poster until the visitor
 * presses play, then swaps in the privacy-enhanced (nocookie) iframe. Saves
 * ~1MB of third-party JS per embed on first load.
 */
export function LiteYouTube({
  id,
  title,
  className,
  priority = false,
  sizes = "(min-width: 1024px) 66vw, 100vw",
}: {
  id: string;
  title: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden rounded-2xl bg-night", className)}>
      {playing ? (
        <iframe
          src={youtubeEmbedUrl(id, true)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 size-full cursor-pointer"
        >
          <YouTubeThumb id={id} alt="" priority={priority} sizes={sizes} className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.03]" />
          <span className="absolute inset-0 bg-gradient-to-t from-night/70 via-night/10 to-transparent" />
          <span className="absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent text-white shadow-[0_20px_60px_-10px_rgba(217,72,43,0.7)] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-110 md:size-24">
            <PlayGlyph className="ml-1 size-8 md:size-9" />
          </span>
        </button>
      )}
    </div>
  );
}
