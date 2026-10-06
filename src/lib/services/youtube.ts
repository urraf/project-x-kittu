import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { VideoSeries } from "@/lib/site";

/**
 * Fetches channel videos. Uses the YouTube Data API when YOUTUBE_API_KEY is
 * set (full history, durations), otherwise the public RSS feed (latest 15,
 * no key required).
 */

export type RemoteVideo = {
  youtubeId: string;
  title: string;
  description: string;
  publishedAt?: Date;
  views?: number;
  durationSec?: number;
  isShort: boolean;
};

function decodeXml(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

export async function fetchChannelFeed(channelId = env.youtubeChannelId): Promise<RemoteVideo[]> {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`, {
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`YouTube feed request failed (${res.status})`);
  const xml = await res.text();
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  return entries
    .map((e) => {
      const pick = (re: RegExp) => e.match(re)?.[1];
      const id = pick(/<yt:videoId>([\w-]{11})<\/yt:videoId>/);
      if (!id) return null;
      const link = pick(/<link rel="alternate" href="([^"]+)"/) ?? "";
      return {
        youtubeId: id,
        title: decodeXml(pick(/<title>([\s\S]*?)<\/title>/) ?? ""),
        description: decodeXml(pick(/<media:description>([\s\S]*?)<\/media:description>/) ?? ""),
        publishedAt: pick(/<published>([^<]+)<\/published>/) ? new Date(pick(/<published>([^<]+)<\/published>/)!) : undefined,
        views: Number(pick(/<media:statistics views="(\d+)"/) ?? NaN) || undefined,
        isShort: link.includes("/shorts/"),
      } satisfies RemoteVideo;
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);
}

function parseIsoDuration(iso: string): number {
  const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  return (d ?? 0) * 86400 + (h ?? 0) * 3600 + (min ?? 0) * 60 + (s ?? 0);
}

async function isShortUrl(id: string) {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${id}`, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(5000) });
    return res.status === 200;
  } catch {
    return false;
  }
}

export async function fetchViaDataApi(maxVideos = 200): Promise<RemoteVideo[]> {
  const key = env.youtubeApiKey;
  if (!key) throw new Error("YOUTUBE_API_KEY is not configured");
  const uploads = `UU${env.youtubeChannelId.slice(2)}`;
  const ids: string[] = [];
  let pageToken = "";
  while (ids.length < maxVideos) {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.search = new URLSearchParams({ part: "contentDetails", playlistId: uploads, maxResults: "50", key, ...(pageToken ? { pageToken } : {}) }).toString();
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`YouTube Data API error (${res.status})`);
    const json = (await res.json()) as { items: { contentDetails: { videoId: string } }[]; nextPageToken?: string };
    ids.push(...json.items.map((i) => i.contentDetails.videoId));
    if (!json.nextPageToken) break;
    pageToken = json.nextPageToken;
  }

  const out: RemoteVideo[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.search = new URLSearchParams({ part: "snippet,contentDetails,statistics", id: ids.slice(i, i + 50).join(","), key }).toString();
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`YouTube Data API error (${res.status})`);
    const json = (await res.json()) as {
      items: {
        id: string;
        snippet: { title: string; description: string; publishedAt: string; liveBroadcastContent?: string };
        contentDetails: { duration: string };
        statistics?: { viewCount?: string };
      }[];
    };
    for (const v of json.items) {
      if (v.snippet.liveBroadcastContent === "upcoming") continue;
      const durationSec = parseIsoDuration(v.contentDetails.duration);
      out.push({
        youtubeId: v.id,
        title: v.snippet.title,
        description: v.snippet.description,
        publishedAt: new Date(v.snippet.publishedAt),
        views: v.statistics?.viewCount ? Number(v.statistics.viewCount) : undefined,
        durationSec,
        isShort: durationSec > 0 && durationSec <= 180 ? await isShortUrl(v.id) : false,
      });
    }
  }
  return out;
}

export async function fetchChannelVideos(): Promise<{ videos: RemoteVideo[]; source: "api" | "rss" }> {
  if (env.youtubeApiKey) {
    try {
      return { videos: await fetchViaDataApi(), source: "api" };
    } catch (error) {
      logger.warn("youtube.api_failed_fallback_rss", { error });
    }
  }
  return { videos: await fetchChannelFeed(), source: "rss" };
}

export async function fetchOEmbed(youtubeId: string): Promise<{ title: string; author?: string } | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${youtubeId}`)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { title: string; author_name?: string };
    return { title: json.title, author: json.author_name };
  } catch {
    return null;
  }
}

/** Heuristic series classification from a video title. Admin can override. */
export function classifySeries(title: string): VideoSeries {
  const t = title.toLowerCase();
  if (/\b(vlog|trip|day in|food|ate|rafting|rishikesh|haridwar|lucknow|cricket|tour|last day|first day|leaving|orientation|didn't expect)\b/.test(t)) {
    if (/\b(japan|tokyo|kyoto)\b/.test(t) && !/\b(lucknow|delhi|hcl)\b/.test(t)) return "japan";
    return "vlog";
  }
  if (/\b(placement|placed|job|lpa|cgpa to|career|hackathon|hcl\w*|engineer)\b/.test(t)) return "career";
  if (/\b(japan|japanese|mext|meti|oist|tokyo|kyoto|nagoya|hennge|toyota|woven|mitsui|asia bridge)\b/.test(t)) return "japan";
  if (/\b(korea|korean|gks|kaist|gist|seoul)\b/.test(t)) return "korea";
  if (/\b(germany|max planck|cern|switzerland|epfl|eth|ista|italy|maeci|europe|european|wipo|erasmus|unil|daad)\b/.test(t)) return "europe";
  return "global";
}
