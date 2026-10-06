"use client";

import Image from "next/image";
import { useState } from "react";
import { youtubeThumb } from "@/lib/utils/youtube";

/** YouTube thumbnail that falls back from maxres → hq when maxres doesn't exist. */
export function YouTubeThumb({
  id,
  alt,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
  className = "object-cover",
}: {
  id: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const [src, setSrc] = useState(youtubeThumb(id, "max"));
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setSrc((s) => (s.includes("maxres") ? youtubeThumb(id, "hq") : s))}
    />
  );
}
