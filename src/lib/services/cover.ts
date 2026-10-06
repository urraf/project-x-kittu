import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { renderArtBuffer } from "@/lib/og/art";
import { ingestImage, ingestRemoteImage, mediaToImage } from "@/lib/services/media";
import type { ImageDTO } from "@/lib/types";

/**
 * Prepares a cover image for AI-generated posts according to the configured
 * strategy. Every path stores an optimised copy in the media library, and the
 * pipeline always falls back to a generated branded cover, so it never fails.
 */

export type CoverStrategy = "auto" | "generated" | "video" | "unsplash";

type CoverInput = {
  title: string;
  category: string;
  imageQuery: string;
  imageAlt: string;
  relatedVideoId: string | null;
  strategy: CoverStrategy;
};

async function fromYouTube(videoId: string, alt: string) {
  for (const q of ["maxresdefault", "sddefault", "hqdefault"]) {
    try {
      const media = await ingestRemoteImage(`https://i.ytimg.com/vi/${videoId}/${q}.jpg`, {
        originalName: `youtube-${videoId}`,
        alt,
        source: "youtube",
        credit: { name: "Life of KittuKun on YouTube", url: `https://www.youtube.com/watch?v=${videoId}` },
      });
      // maxresdefault returns a tiny grey placeholder when missing.
      if (media.width >= 640) return mediaToImage(media);
    } catch {
      /* try the next quality */
    }
  }
  throw new Error("No usable YouTube thumbnail");
}

async function fromUnsplash(query: string, alt: string) {
  const key = env.unsplashAccessKey;
  if (!key) throw new Error("UNSPLASH_ACCESS_KEY not configured");
  const url = new URL("https://api.unsplash.com/search/photos");
  url.search = new URLSearchParams({ query, orientation: "landscape", per_page: "10", content_filter: "high" }).toString();
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Unsplash search failed (${res.status})`);
  const json = (await res.json()) as {
    results: { urls: { raw: string }; links: { download_location: string; html: string }; user: { name: string; links: { html: string } }; alt_description?: string }[];
  };
  const photo = json.results[Math.floor(Math.random() * Math.min(5, json.results.length))];
  if (!photo) throw new Error("No Unsplash results");
  // Unsplash API guidelines: trigger the download endpoint when a photo is used.
  fetch(photo.links.download_location, { headers: { Authorization: `Client-ID ${key}` } }).catch(() => {});
  const media = await ingestRemoteImage(`${photo.urls.raw}&w=2000&fm=jpg&q=80&fit=max`, {
    originalName: `unsplash-${query}`,
    alt: alt || photo.alt_description || query,
    source: "unsplash",
    credit: { name: `${photo.user.name} on Unsplash`, url: `${photo.user.links.html}?utm_source=lifeofkittukun&utm_medium=referral` },
  });
  return mediaToImage(media);
}

async function generated(title: string, category: string, alt: string) {
  const png = await renderArtBuffer({ title, category });
  const media = await ingestImage(png, { originalName: `cover-${title.slice(0, 40)}`, alt, source: "generated" });
  return mediaToImage(media);
}

export async function prepareCoverImage(input: CoverInput): Promise<{ image?: ImageDTO; warnings: string[] }> {
  const warnings: string[] = [];
  const order: ("unsplash" | "video" | "generated")[] =
    input.strategy === "generated"
      ? ["generated"]
      : input.strategy === "video"
        ? ["video", "generated"]
        : input.strategy === "unsplash"
          ? ["unsplash", "generated"]
          : ["unsplash", "video", "generated"];

  for (const step of order) {
    try {
      if (step === "unsplash") {
        if (!env.unsplashAccessKey) continue;
        return { image: await fromUnsplash(input.imageQuery, input.imageAlt), warnings };
      }
      if (step === "video") {
        if (!input.relatedVideoId) continue;
        return { image: await fromYouTube(input.relatedVideoId, input.imageAlt), warnings };
      }
      return { image: await generated(input.title, input.category, input.imageAlt), warnings };
    } catch (error) {
      logger.warn("cover.step_failed", { step, error });
      warnings.push(`Cover via ${step} failed: ${(error as Error).message}`);
    }
  }
  warnings.push("No cover image could be prepared; the post will use its typographic fallback.");
  return { warnings };
}
