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

const ANDROID_UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip";

/**
 * Best-effort caption text for a public video (English, or auto-translated to
 * English). Uses YouTube's app API, which needs no key but is unofficial and
 * may be blocked from some servers, so callers must cope with `null`.
 */
export async function fetchTranscript(youtubeId: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": ANDROID_UA },
      body: JSON.stringify({ context: { client: { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 30, hl: "en", gl: "IN" } }, videoId: youtubeId }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: { baseUrl: string; languageCode?: string; kind?: string }[] } } };
    const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    if (!tracks.length) return null;
    const english = (t: { languageCode?: string }) => (t.languageCode ?? "").startsWith("en");
    // Prefer hand-made English captions, then auto English, then any track translated to English.
    const track = tracks.find((t) => english(t) && t.kind !== "asr") ?? tracks.find(english);
    const url = track ? track.baseUrl : `${tracks[0]!.baseUrl}&tlang=en`;
    const cap = await fetch(url, { headers: { "User-Agent": ANDROID_UA }, signal: AbortSignal.timeout(15_000) });
    if (!cap.ok) return null;
    const xml = await cap.text();
    const text = decodeXml(xml.replace(/<[^>]+>/g, " ")).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, " ").trim();
    return text.length >= 200 ? text.slice(0, 60000) : null;
  } catch (error) {
    logger.warn("youtube.transcript_failed", { youtubeId, error });
    return null;
  }
}

export type RemoteComment = { commentId: string; author: string; text: string; likes: number };

function findAll(node: unknown, test: (o: Record<string, unknown>) => boolean, out: Record<string, unknown>[] = []) {
  if (Array.isArray(node)) for (const v of node) findAll(v, test, out);
  else if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (test(o)) out.push(o);
    for (const v of Object.values(o)) findAll(v, test, out);
  }
  return out;
}

const parseLikes = (s: unknown) => {
  const m = String(s ?? "").trim().match(/^([\d.]+)\s*([KM]?)/i);
  if (!m) return 0;
  return Math.round(Number(m[1]) * (m[2]?.toUpperCase() === "K" ? 1000 : m[2]?.toUpperCase() === "M" ? 1_000_000 : 1));
};

/**
 * Best-effort first page of a video's top comments (YouTube's web API, no key).
 * Unofficial, so it returns [] whenever the response shape isn't what we expect.
 */
export async function fetchTopComments(youtubeId: string): Promise<RemoteComment[]> {
  const call = async (body: Record<string, unknown>) => {
    const res = await fetch("https://www.youtube.com/youtubei/v1/next?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify({ context: { client: { clientName: "WEB", clientVersion: "2.20251001.00.00", hl: "en", gl: "IN" } }, ...body }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`YouTube responded ${res.status}`);
    return res.json() as Promise<unknown>;
  };
  try {
    const page = await call({ videoId: youtubeId });
    const section = findAll(page, (o) => o.sectionIdentifier === "comment-item-section")[0];
    const token = section && (JSON.stringify(section).match(/"token":"([^"]+)"/)?.[1] ?? null);
    if (!token) return [];
    const data = await call({ continuation: token });
    return findAll(data, (o) => "commentEntityPayload" in o).flatMap((o) => {
      const p = o.commentEntityPayload as { author?: { displayName?: string }; properties?: { commentId?: string; content?: { content?: string } }; toolbar?: { likeCountNotliked?: string } };
      const text = p.properties?.content?.content?.trim();
      const commentId = p.properties?.commentId;
      if (!text || !commentId) return [];
      return [{ commentId, author: (p.author?.displayName ?? "").replace(/^@/, "") || "YouTube viewer", text, likes: parseLikes(p.toolbar?.likeCountNotliked) }];
    });
  } catch (error) {
    logger.warn("youtube.comments_failed", { youtubeId, error });
    return [];
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
