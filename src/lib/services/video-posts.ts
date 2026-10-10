import "server-only";
import { connectDB } from "@/lib/db/connect";
import { isGroqConfigured } from "@/lib/env";
import { GroqError } from "@/lib/ai/groq";
import { AutomationRun, Post, Video } from "@/lib/models";
import { logger } from "@/lib/logger";
import { runAutomation, type AutomationResult } from "@/lib/services/automation";
import { getSettingsStrict } from "@/lib/services/settings";
import { fetchTranscript } from "@/lib/services/youtube";

/**
 * Companion blog posts for YouTube videos: every public, full-length video gets
 * one article written from its title and description, with the video embedded.
 * Each attempt is an automation run keyed "video:<id>:<time>": runs never overlap
 * (one at a time), a video with an article is never picked again, and every
 * attempt shows in the AI writer history. Delete the article to have it rewritten.
 */

type VideoLean = { youtubeId: string; title: string; description?: string; publishedAt?: Date };

/** A failed video is retried after this long (e.g. after a rate limit or a bad draft). */
const RETRY_AFTER_MS = 6 * 3600_000;
/** Shorts and very short clips don't carry enough to write an article from. */
const MIN_DURATION_SEC = 120;

function eligibleFilter() {
  return {
    hidden: { $ne: true },
    isShort: { $ne: true },
    $or: [{ durationSec: { $exists: false } }, { durationSec: null }, { durationSec: { $gte: MIN_DURATION_SEC } }],
  };
}

/** youtubeId → post for every video that already has an article (any status). */
export async function postsByVideo() {
  await connectDB();
  const posts = await Post.find({ videoId: { $exists: true, $ne: null } }, { videoId: 1, slug: 1, status: 1, title: 1 })
    .sort({ createdAt: 1 })
    .lean<{ _id: unknown; videoId: string; slug: string; status: string; title: string }[]>();
  const map = new Map<string, { id: string; slug: string; status: string; title: string }>();
  for (const p of posts) if (!map.has(p.videoId)) map.set(p.videoId, { id: String(p._id), slug: p.slug, status: p.status, title: p.title });
  return map;
}

/** Videos still waiting for an article, newest first. Recently failed ones are skipped for a while. */
export async function videosNeedingPosts(limit = 500): Promise<VideoLean[]> {
  await connectDB();
  const [written, failed] = await Promise.all([
    Post.distinct("videoId", { videoId: { $exists: true, $ne: null } }),
    AutomationRun.find({ idempotencyKey: /^video:/, status: "failed", finishedAt: { $gt: new Date(Date.now() - RETRY_AFTER_MS) } }, { idempotencyKey: 1 }).lean<{ idempotencyKey: string }[]>(),
  ]);
  const skip = new Set<string>([...written.map(String), ...failed.map((r) => r.idempotencyKey.split(":")[1] ?? "")]);
  const videos = await Video.find(eligibleFilter(), { youtubeId: 1, title: 1, description: 1, publishedAt: 1 })
    .sort({ publishedAt: -1 })
    .lean<VideoLean[]>();
  return videos.filter((v) => !skip.has(v.youtubeId)).slice(0, limit);
}

export async function videoPostStats() {
  await connectDB();
  const [eligible, pending] = await Promise.all([Video.countDocuments(eligibleFilter()), videosNeedingPosts()]);
  return { eligible, pending: pending.length };
}

/** Cached captions for a video, fetching them once if we haven't tried recently. */
async function transcriptFor(youtubeId: string) {
  const doc = await Video.findOne({ youtubeId }, { transcript: 1, transcriptFetchedAt: 1 }).select("+transcript").lean<{ transcript?: string; transcriptFetchedAt?: Date }>();
  if (doc?.transcript) return doc.transcript;
  if (doc?.transcriptFetchedAt && Date.now() - new Date(doc.transcriptFetchedAt).getTime() < 7 * 24 * 3600_000) return null;
  const transcript = await fetchTranscript(youtubeId);
  await Video.updateOne({ youtubeId }, { $set: { transcriptFetchedAt: new Date(), ...(transcript ? { transcript } : {}) } });
  return transcript;
}

/** Writes the companion article for one video, from its captions when available. */
export async function writePostForVideo(video: VideoLean, opts: { trigger: "cron" | "manual"; ip?: string; publish?: boolean }): Promise<AutomationResult> {
  const transcript = await transcriptFor(video.youtubeId);
  return runAutomation({
    trigger: opts.trigger,
    idempotencyKey: `video:${video.youtubeId}:${Date.now()}`,
    ip: opts.ip,
    force: true, // video posts have their own switch and don't use the daily topic limits
    publish: opts.publish,
    generate: { video: { youtubeId: video.youtubeId, title: video.title, description: video.description ?? "", transcript } },
  });
}

export type VideoPostBatch = {
  written: { youtubeId: string; title: string; slug: string; status: string }[];
  failed: { youtubeId: string; title: string; error: string }[];
  stoppedBecause?: string;
  remaining: number;
};

/**
 * Writes articles for the newest videos that don't have one yet, one at a time,
 * until `max` are done or the time budget is used up. Stops early on a rate
 * limit or when another run holds the lock, so it is safe to call often.
 */
export async function processPendingVideoPosts(opts: { trigger: "cron" | "manual"; max?: number; budgetMs?: number; ip?: string; youtubeId?: string }): Promise<VideoPostBatch> {
  const batch: VideoPostBatch = { written: [], failed: [], remaining: 0 };
  if (!isGroqConfigured()) {
    batch.stoppedBecause = "The AI writer isn't set up (GROQ_API_KEY is missing).";
    return batch;
  }
  const settings = await getSettingsStrict();
  if (opts.trigger === "cron" && !settings.automation.videoPosts) {
    batch.stoppedBecause = "Video blog posts are turned off in Settings → Automation.";
    return batch;
  }

  const started = Date.now();
  const max = Math.max(1, Math.min(opts.max ?? 1, 10));
  const budget = opts.budgetMs ?? 200_000;
  let queue = await videosNeedingPosts();
  if (opts.youtubeId) queue = queue.filter((v) => v.youtubeId === opts.youtubeId);

  for (const video of queue) {
    if (batch.written.length + batch.failed.length >= max) break;
    // Don't start a new article if there's not enough time left to finish one.
    if (Date.now() - started > budget) {
      batch.stoppedBecause = "Time budget used up; the rest will be written on the next run.";
      break;
    }
    try {
      const res = await writePostForVideo(video, { trigger: opts.trigger, ip: opts.ip });
      if ("post" in res && res.post?.slug && (res.status === "published" || res.status === "drafted")) {
        batch.written.push({ youtubeId: video.youtubeId, title: res.post.title, slug: res.post.slug, status: res.post.status });
      } else if (res.status === "locked") {
        batch.stoppedBecause = "Another article is being written right now.";
        break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      batch.failed.push({ youtubeId: video.youtubeId, title: video.title, error: message });
      logger.warn("video_posts.failed", { youtubeId: video.youtubeId, error: message });
      if (err instanceof GroqError && err.status === 429) {
        batch.stoppedBecause = "The AI provider's rate limit was reached; the rest will be written on the next run.";
        break;
      }
    }
  }
  batch.remaining = (await videosNeedingPosts()).length;
  logger.info("video_posts.batch", { trigger: opts.trigger, written: batch.written.length, failed: batch.failed.length, remaining: batch.remaining });
  return batch;
}
