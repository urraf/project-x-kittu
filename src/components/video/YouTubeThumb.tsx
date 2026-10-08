"use client";

import Image from "next/image";
import { useState } from "react";
import { youtubeThumb } from "@/lib/utils/youtube";

/**
 * YouTube thumbnail served straight from YouTube's image CDN (fast, cached
 * worldwide). "hq" (480×360, letterbox bars cropped away by object-cover) is
 * used for cards; "max" (1280×720) for large players, falling back to "hq" for
 * videos that don't have a max-resolution thumbnail.
 */
export function YouTubeThumb({
  id,
  alt,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
  quality = "hq",
  className = "object-cover",
}: {
  id: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  quality?: "max" | "hq";
  className?: string;
}) {
  const [src, setSrc] = useState(youtubeThumb(id, quality));
  const fallback = () => setSrc((s) => (s.includes("maxres") ? youtubeThumb(id, "hq") : s));
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={fallback}
      // YouTube answers a missing maxres thumbnail with a tiny 120×90 placeholder.
      onLoad={(e) => e.currentTarget.naturalWidth <= 120 && fallback()}
    />
  );
}
