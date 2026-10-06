import "server-only";
import { Types } from "mongoose";

// Mongoose 9 query typings are very strict; these dynamic filters are built from validated input.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Filter = Record<string, any>;
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Video, type VideoDoc } from "@/lib/models";
import { badRequest, conflict, notFound } from "@/lib/http";
import { logger } from "@/lib/logger";
import { VIDEO_SERIES_IDS, type VideoSeries } from "@/lib/site";
import { parseYouTubeId } from "@/lib/utils/youtube";
import { classifySeries, fetchChannelFeed, fetchChannelVideos, fetchOEmbed } from "@/lib/services/youtube";
import type { VideoDTO } from "@/lib/types";

type Lean = VideoDoc;

export function toVideoDTO(v: Lean): VideoDTO {
  return {
    id: String(v._id),
    youtubeId: v.youtubeId,
    title: v.title,
    description: v.description ?? "",
    publishedAt: v.publishedAt ? new Date(v.publishedAt).toISOString() : undefined,
    durationSec: v.durationSec ?? undefined,
    views: v.views ?? undefined,
    isShort: Boolean(v.isShort),
    series: v.series ?? "global",
    featured: Boolean(v.featured),
    hidden: Boolean(v.hidden),
    source: v.source ?? "sync",
  };
}

/* ------------------------------------------------------------------ */
/* Public reads (with live-feed fallback when the DB is empty)         */
/* ------------------------------------------------------------------ */

async function feedFallback(): Promise<VideoDTO[]> {
  try {
    const feed = await fetchChannelFeed();
    return feed
      .filter((v) => !v.isShort)
      .map((v) => ({
        id: v.youtubeId,
        youtubeId: v.youtubeId,
        title: v.title,
        description: v.description,
        publishedAt: v.publishedAt?.toISOString(),
        views: v.views,
        isShort: false,
        series: classifySeries(v.title),
        featured: false,
        hidden: false,
        source: "rss",
      }));
  } catch (error) {
    logger.warn("videos.feed_fallback_failed", { error });
    return [];
  }
}

export async function listPublicVideos(opts: { series?: string; limit?: number; includeShorts?: boolean } = {}): Promise<VideoDTO[]> {
  const { series, limit = 60, includeShorts = false } = opts;
  await connectDB();
  const filter: Filter = { hidden: { $ne: true } };
  if (!includeShorts) filter.isShort = { $ne: true };
  if (series) filter.series = series;
  const docs = await Video.find(filter).sort({ publishedAt: -1 }).limit(limit).lean<Lean[]>();
  if (docs.length || series) return docs.map(toVideoDTO);
  if ((await Video.estimatedDocumentCount()) > 0) return [];
  return (await feedFallback()).slice(0, limit);
}

export async function pagePublicVideos(opts: { series?: string; page?: number; pageSize?: number }) {
  const { series, page = 1, pageSize = 24 } = opts;
  await connectDB();
  const filter: Filter = { hidden: { $ne: true }, isShort: { $ne: true } };
  if (series) filter.series = series;
  const [docs, total] = await Promise.all([
    Video.find(filter).sort({ publishedAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean<Lean[]>(),
    Video.countDocuments(filter),
  ]);
  if (total === 0 && !series && (await Video.estimatedDocumentCount()) === 0) {
    const items = await feedFallback();
    return { items, total: items.length, page: 1, pages: 1 };
  }
  return { items: docs.map(toVideoDTO), total, page, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getUpNext(video: VideoDTO, limit = 8) {
  await connectDB();
  const sameSeries = await Video.find({ youtubeId: { $ne: video.youtubeId }, series: video.series as VideoSeries, hidden: { $ne: true }, isShort: { $ne: true } })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean<Lean[]>();
  if (sameSeries.length >= limit) return sameSeries.map(toVideoDTO);
  const fill = await Video.find({ youtubeId: { $nin: [video.youtubeId, ...sameSeries.map((v) => v.youtubeId)] }, hidden: { $ne: true }, isShort: { $ne: true } })
    .sort({ publishedAt: -1 })
    .limit(limit - sameSeries.length)
    .lean<Lean[]>();
  return [...sameSeries, ...fill].map(toVideoDTO);
}

export async function getFeaturedVideos(limit = 6) {
  await connectDB();
  const featured = await Video.find({ featured: true, hidden: { $ne: true } }).sort({ publishedAt: -1 }).limit(limit).lean<Lean[]>();
  return featured.map(toVideoDTO);
}

export async function getPopularVideos(limit = 8) {
  await connectDB();
  const docs = await Video.find({ hidden: { $ne: true }, isShort: { $ne: true }, views: { $gt: 0 } })
    .sort({ views: -1 })
    .limit(limit)
    .lean<Lean[]>();
  return docs.map(toVideoDTO);
}

export async function getVideoByYoutubeId(youtubeId: string): Promise<VideoDTO | null> {
  if (!/^[\w-]{11}$/.test(youtubeId)) return null;
  await connectDB();
  const doc = await Video.findOne({ youtubeId, hidden: { $ne: true } }).lean<Lean>();
  if (doc) return toVideoDTO(doc);
  const fallback = await feedFallback();
  return fallback.find((v) => v.youtubeId === youtubeId) ?? null;
}

export async function getVideosByIds(ids: string[]) {
  if (!ids.length) return [];
  await connectDB();
  const docs = await Video.find({ youtubeId: { $in: ids } }).lean<Lean[]>();
  return docs.map(toVideoDTO);
}

export async function seriesCounts() {
  await connectDB();
  const rows = await Video.aggregate<{ _id: string; count: number }>([
    { $match: { hidden: { $ne: true }, isShort: { $ne: true } } },
    { $group: { _id: "$series", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.count])) as Record<string, number>;
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export const videoPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  series: z.enum(VIDEO_SERIES_IDS).optional(),
  featured: z.boolean().optional(),
  hidden: z.boolean().optional(),
  description: z.string().max(6000).optional(),
});

export async function listAdminVideos(opts: { q?: string; series?: string } = {}) {
  await connectDB();
  const filter: Filter = {};
  if (opts.series) filter.series = opts.series;
  if (opts.q) filter.title = { $regex: opts.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  const docs = await Video.find(filter).sort({ publishedAt: -1 }).limit(500).lean<Lean[]>();
  return docs.map(toVideoDTO);
}

export async function addVideoByUrl(input: string, series?: string) {
  const youtubeId = parseYouTubeId(input);
  if (!youtubeId) throw badRequest("That doesn't look like a YouTube link or video ID.");
  await connectDB();
  if (await Video.exists({ youtubeId })) throw conflict("This video is already in your library.");
  const meta = await fetchOEmbed(youtubeId);
  if (!meta) throw badRequest("Couldn't find that video on YouTube. Is it public?");
  const doc = await Video.create({
    youtubeId,
    title: meta.title,
    series: (series && (VIDEO_SERIES_IDS as readonly string[]).includes(series) ? series : classifySeries(meta.title)) as VideoSeries,
    source: "manual" as const,
    publishedAt: new Date(),
  });
  return toVideoDTO(doc.toObject() as Lean);
}

export async function updateVideo(id: string, raw: unknown) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Video not found");
  const patch = videoPatchSchema.parse(raw);
  await connectDB();
  const doc = await Video.findByIdAndUpdate(id, { $set: patch }, { returnDocument: "after", runValidators: true }).lean<Lean>();
  if (!doc) throw notFound("Video not found");
  return toVideoDTO(doc);
}

export async function deleteVideo(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Video not found");
  await connectDB();
  const res = await Video.findByIdAndDelete(id);
  if (!res) throw notFound("Video not found");
}

/** Upserts channel videos. Admin choices (series, featured, hidden) are preserved. */
export async function syncChannelVideos() {
  const { videos, source } = await fetchChannelVideos();
  await connectDB();
  const now = new Date();
  const ops = videos.map((v) => ({
    updateOne: {
      filter: { youtubeId: v.youtubeId },
      update: {
        $set: {
          title: v.title,
          description: v.description.slice(0, 6000),
          ...(v.publishedAt ? { publishedAt: v.publishedAt } : {}),
          ...(v.views != null ? { views: v.views } : {}),
          ...(v.durationSec ? { durationSec: v.durationSec } : {}),
          isShort: v.isShort,
          syncedAt: now,
        },
        $setOnInsert: { series: classifySeries(v.title), featured: false, hidden: false, source: "sync" as const },
      },
      upsert: true,
    },
  }));
  const res = ops.length ? await Video.bulkWrite(ops, { ordered: false }) : null;
  const summary = { source, fetched: videos.length, added: res?.upsertedCount ?? 0, updated: res?.modifiedCount ?? 0 };
  logger.info("videos.synced", summary);
  return summary;
}
