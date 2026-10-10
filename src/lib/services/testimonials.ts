import "server-only";
import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Testimonial, Video, type TestimonialDoc } from "@/lib/models";
import { notFound } from "@/lib/http";
import { logger } from "@/lib/logger";
import { sanitizePlain } from "@/lib/content/html";
import { fetchTopComments, type RemoteComment } from "@/lib/services/youtube";
import { cleanTitle } from "@/lib/utils/text";

export type TestimonialDTO = {
  id: string;
  source: "youtube" | "manual";
  name: string;
  via: string;
  text: string;
  rating?: number;
  videoId?: string;
  videoTitle?: string;
  likes: number;
  status: "visible" | "hidden";
  featured: boolean;
  createdAt: string;
};

export function toTestimonialDTO(d: TestimonialDoc): TestimonialDTO {
  return {
    id: String(d._id),
    source: d.source,
    name: d.name,
    via: d.via ?? "",
    text: d.text,
    rating: d.rating ?? undefined,
    videoId: d.videoId ?? undefined,
    videoTitle: d.videoTitle ?? undefined,
    likes: d.likes ?? 0,
    status: d.status ?? "visible",
    featured: Boolean(d.featured),
    createdAt: new Date(d.createdAt).toISOString(),
  };
}

export async function listPublicTestimonials(limit = 12) {
  await connectDB();
  const docs = await Testimonial.find({ status: "visible" }).sort({ featured: -1, likes: -1, createdAt: -1 }).limit(limit).lean<TestimonialDoc[]>();
  return docs.map(toTestimonialDTO);
}

export async function listAdminTestimonials() {
  await connectDB();
  const docs = await Testimonial.find().sort({ featured: -1, status: 1, likes: -1, createdAt: -1 }).limit(500).lean<TestimonialDoc[]>();
  return docs.map(toTestimonialDTO);
}

export const testimonialInputSchema = z.object({
  name: z.string().trim().min(1, "Add a name").max(100),
  via: z.string().trim().max(60).default(""),
  text: z.string().trim().min(5, "Add what they said").max(1200),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  status: z.enum(["visible", "hidden"]).default("visible"),
  featured: z.boolean().default(false),
});

export async function createTestimonial(raw: unknown) {
  const input = testimonialInputSchema.parse(raw);
  await connectDB();
  const doc = await Testimonial.create({
    source: "manual",
    name: sanitizePlain(input.name),
    via: sanitizePlain(input.via),
    text: sanitizePlain(input.text),
    rating: input.rating ?? undefined,
    status: input.status,
    featured: input.featured,
  });
  return toTestimonialDTO(doc.toObject() as TestimonialDoc);
}

export const testimonialPatchSchema = z.object({
  status: z.enum(["visible", "hidden"]).optional(),
  featured: z.boolean().optional(),
  name: z.string().trim().min(1).max(100).optional(),
  text: z.string().trim().min(5).max(1200).optional(),
});

export async function updateTestimonial(id: string, raw: unknown) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Testimonial not found");
  const input = testimonialPatchSchema.parse(raw);
  await connectDB();
  const set: Record<string, unknown> = { ...input };
  if (input.name) set.name = sanitizePlain(input.name);
  if (input.text) set.text = sanitizePlain(input.text);
  const doc = await Testimonial.findByIdAndUpdate(id, { $set: set }, { returnDocument: "after" }).lean<TestimonialDoc>();
  if (!doc) throw notFound("Testimonial not found");
  return toTestimonialDTO(doc);
}

export async function deleteTestimonial(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Testimonial not found");
  await connectDB();
  const res = await Testimonial.findByIdAndDelete(id);
  if (!res) throw notFound("Testimonial not found");
}

/* ------------------------------------------------------------------ */
/* Import kind words from YouTube comments                             */
/* ------------------------------------------------------------------ */

const PRAISE =
  /\b(thank|thanks|thx|tysm|helpful|helped|informative|useful|valuable|great|amazing|awesome|excellent|superb|best|love|loved|inspir\w*|motivat\w*|keep (it )?up|keep going|well explained|clearly explained|selected|got selected|cleared|nice (video|info|information|explanation)|bahut (accha|acha|badhiya)|bohot (accha|acha)|badhiya|mast|god level|life ?saver|gem|underrated)\b/i;
const SPAM = /\b(loan|whatsapp|telegram|t\.me|dm me|contact me|reach out|earn|crypto|invest|forex|bitcoin|promotion|promote|sub4sub|check my channel|crush)\b|https?:\/\//i;
/** Requests and questions read badly as testimonials. */
const REQUEST = /\b(please|plz|pls|kindly|make a (video|vdo)|upload|batao|bataye|bata do|suggest|can you|could you|tell me|help me|share your|guide me|next video)\b/i;
const NEGATIVE = /\b(kaam ka nhi|kaam ka nahi|dumb|wrong|worst|bad|fake|waste|boring)\b/i;
/** Brand-style accounts (shops, agencies, other channels) aren't viewer testimonials. */
const BRANDY = /(loan|finance|official|media|studio|academy|agency|consult|services|marketing|news|channel|shop|store|tv)$/i;

/** "RajeevKumar-ic4zt" → "Rajeev Kumar"; keeps real names readable and drops handle noise. */
export function displayNameFromHandle(handle: string) {
  const base = handle.replace(/^@/, "").replace(/-[a-z0-9]{3,6}$/i, "").replace(/[_.]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\d{3,}$/, "").trim();
  return (base || "YouTube viewer").slice(0, 60);
}

/** Scores a comment as a testimonial: praise, not a question, not spam, not too short. */
export function testimonialScore(c: RemoteComment, channelName = "") {
  const text = c.text.trim();
  if (text.length < 40 || text.length > 500) return 0;
  if (text.includes("?") || SPAM.test(text) || REQUEST.test(text) || NEGATIVE.test(text)) return 0;
  const author = c.author.toLowerCase().replace(/-[a-z0-9]{3,6}$/i, "");
  if ((channelName && author.includes(channelName.toLowerCase())) || BRANDY.test(author)) return 0;
  const letters = text.replace(/[^\p{L}]/gu, "").length;
  if (letters < 12) return 0;
  const hits = (text.match(new RegExp(PRAISE.source, "gi")) ?? []).length;
  if (!hits) return 0;
  return hits * 2 + Math.log2(c.likes + 1) + Math.min(text.length, 220) / 110;
}

/**
 * Pulls the top comments of recent videos and keeps the warmest few per video
 * as testimonials (marked as YouTube comments, linked to their video). Existing
 * ones are never duplicated, and the admin's hide/feature choices are kept.
 */
export async function importYouTubeTestimonials(opts: { maxVideos?: number; perVideo?: number } = {}) {
  await connectDB();
  const videos = await Video.find({ hidden: { $ne: true }, isShort: { $ne: true } }, { youtubeId: 1, title: 1 })
    .sort({ publishedAt: -1 })
    .limit(opts.maxVideos ?? 30)
    .lean<{ youtubeId: string; title: string }[]>();
  // First pass: collect, so accounts that leave the same praise everywhere can be skipped.
  const perVideo: { v: { youtubeId: string; title: string }; comments: RemoteComment[] }[] = [];
  const authorCount = new Map<string, number>();
  for (const v of videos) {
    const comments = await fetchTopComments(v.youtubeId);
    perVideo.push({ v, comments });
    for (const c of comments) authorCount.set(c.author, (authorCount.get(c.author) ?? 0) + 1);
  }
  let checked = 0;
  let added = 0;
  for (const { v, comments } of perVideo) {
    checked += comments.length;
    const best = comments
      .filter((c) => (authorCount.get(c.author) ?? 0) <= 2)
      .map((c) => ({ c, score: testimonialScore(c, "kittukun") }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.perVideo ?? 2);
    for (const { c } of best) {
      const res = await Testimonial.updateOne(
        { commentId: c.commentId },
        {
          $setOnInsert: {
            source: "youtube",
            name: displayNameFromHandle(c.author),
            via: "YouTube comment",
            text: sanitizePlain(c.text).slice(0, 1200),
            videoId: v.youtubeId,
            videoTitle: cleanTitle(v.title).slice(0, 200),
            commentId: c.commentId,
            status: "visible",
            featured: false,
          },
          $set: { likes: c.likes },
        },
        { upsert: true },
      );
      added += res.upsertedCount ?? 0;
    }
  }
  logger.info("testimonials.imported", { videos: videos.length, checked, added });
  return { videos: videos.length, checked, added };
}
