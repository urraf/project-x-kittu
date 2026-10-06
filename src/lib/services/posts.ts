import "server-only";
import { Types } from "mongoose";

// Mongoose 9 query typings are very strict; these dynamic filters are built from validated input.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Filter = Record<string, any>;
import { connectDB } from "@/lib/db/connect";
import { Post, type PostDoc } from "@/lib/models";
import { conflict, notFound } from "@/lib/http";
import { logger } from "@/lib/logger";
import { contentStats, sanitizeContent, sanitizePlain } from "@/lib/content/html";
import { slugify, truncate } from "@/lib/utils/text";
import { getSettings } from "@/lib/services/settings";
import { deleteEngagementForPost } from "@/lib/services/engagement";
import { postInputSchema, postPatchSchema, type PostInput, type PostPatch } from "@/lib/validation/post";
import type { ImageDTO, PostFull, PostSummary } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Mapping                                                             */
/* ------------------------------------------------------------------ */

type Lean = PostDoc & { createdAt: Date; updatedAt: Date };

function toImage(img: Lean["coverImage"]): ImageDTO | undefined {
  if (!img?.url) return undefined;
  return {
    url: img.url,
    alt: img.alt ?? "",
    mediaId: img.mediaId ? String(img.mediaId) : undefined,
    width: img.width ?? undefined,
    height: img.height ?? undefined,
    blurDataURL: img.blurDataURL ?? undefined,
    credit: img.credit?.name ? { name: img.credit.name ?? undefined, url: img.credit.url ?? undefined } : undefined,
  };
}

export function toSummary(doc: Lean): PostSummary {
  return {
    id: String(doc._id),
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt ?? "",
    category: doc.category ?? "Stories",
    tags: doc.tags ?? [],
    coverImage: toImage(doc.coverImage),
    thumbnail: toImage(doc.thumbnail) ?? toImage(doc.coverImage),
    readingTime: doc.readingTime ?? 1,
    publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : undefined,
    updatedAt: new Date(doc.updatedAt).toISOString(),
    featured: Boolean(doc.featured),
    status: doc.status as PostSummary["status"],
    views: doc.views ?? 0,
    likes: doc.likes ?? 0,
    commentCount: doc.commentCount ?? 0,
    source: (doc.source ?? "manual") as PostSummary["source"],
    author: { name: doc.author?.name ?? "", avatar: doc.author?.avatar ?? undefined, bio: doc.author?.bio ?? undefined },
  };
}

export function toFull(doc: Lean): PostFull {
  return {
    ...toSummary(doc),
    content: doc.content ?? "",
    wordCount: doc.wordCount ?? 0,
    videoId: doc.videoId ?? undefined,
    createdAt: new Date(doc.createdAt).toISOString(),
    seo: {
      title: doc.seo?.title ?? undefined,
      description: doc.seo?.description ?? undefined,
      canonicalUrl: doc.seo?.canonicalUrl ?? undefined,
      ogImage: doc.seo?.ogImage ?? undefined,
      noIndex: doc.seo?.noIndex ?? false,
    },
    generation: doc.generation?.generatedAt
      ? {
          model: doc.generation.model ?? undefined,
          topic: doc.generation.topic ?? undefined,
          generatedAt: new Date(doc.generation.generatedAt).toISOString(),
          warnings: doc.generation.warnings ?? [],
        }
      : undefined,
  };
}

const SUMMARY_FIELDS = "-content";

function publishedFilter(extra: Filter = {}): Filter {
  return { status: "published", publishedAt: { $lte: new Date() }, ...extra };
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

export async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "post";
  let candidate = root;
  for (let i = 2; i < 200; i++) {
    const clash = await Post.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
    if (!clash) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

function normaliseImage(img: PostInput["coverImage"]) {
  if (img === null) return null;
  if (!img) return undefined;
  return { ...img, mediaId: img.mediaId ? new Types.ObjectId(img.mediaId) : undefined };
}

async function buildDocFields(input: PostPatch, existing?: Lean) {
  const fields: Record<string, unknown> = {};

  if (input.title !== undefined) fields.title = sanitizePlain(input.title);
  if (input.content !== undefined) {
    const html = sanitizeContent(input.content);
    const stats = contentStats(html);
    fields.content = html;
    fields.contentText = stats.text.slice(0, 100_000);
    fields.wordCount = stats.wordCount;
    fields.readingTime = stats.readingTime;
  }
  if (input.excerpt !== undefined) fields.excerpt = sanitizePlain(input.excerpt);
  // Auto-fill an excerpt from the body if the author left it blank.
  const excerpt = (fields.excerpt as string | undefined) ?? existing?.excerpt ?? "";
  const text = (fields.contentText as string | undefined) ?? "";
  if (!excerpt && text) fields.excerpt = truncate(text.replace(/\s+/g, " "), 220);

  if (input.category !== undefined) fields.category = sanitizePlain(input.category) || "Stories";
  if (input.tags !== undefined) fields.tags = input.tags.map(sanitizePlain).filter(Boolean);
  if (input.featured !== undefined) fields.featured = input.featured;
  if (input.videoId !== undefined) fields.videoId = input.videoId ?? undefined;

  if (input.coverImage !== undefined) fields.coverImage = normaliseImage(input.coverImage);
  if (input.thumbnail !== undefined) fields.thumbnail = normaliseImage(input.thumbnail);

  if (input.author !== undefined) {
    const settings = await getSettings();
    fields.author = {
      name: input.author.name || settings.profile.name,
      avatar: input.author.avatar || settings.profile.avatarUrl || undefined,
      bio: input.author.bio || settings.profile.shortBio,
    };
  }
  if (input.seo !== undefined) {
    fields.seo = {
      title: input.seo.title ? sanitizePlain(input.seo.title) : undefined,
      description: input.seo.description ? sanitizePlain(input.seo.description) : undefined,
      canonicalUrl: input.seo.canonicalUrl || undefined,
      ogImage: input.seo.ogImage || undefined,
      noIndex: Boolean(input.seo.noIndex),
    };
  }

  if (input.status !== undefined) fields.status = input.status;
  if (input.publishedAt !== undefined) fields.publishedAt = input.publishedAt ?? undefined;
  const status = (fields.status as string | undefined) ?? existing?.status;
  if (status === "published" && !fields.publishedAt && !existing?.publishedAt) fields.publishedAt = new Date();

  return fields;
}

export type CreateMeta = {
  source?: "manual" | "ai" | "automation";
  generation?: { model?: string; topic?: string; promptVersion?: string; runId?: Types.ObjectId; warnings?: string[] };
};

export async function createPost(raw: unknown, meta: CreateMeta = {}): Promise<PostFull> {
  const input = postInputSchema.parse(raw);
  await connectDB();
  const fields = await buildDocFields({ ...input, author: input.author ?? {} });
  const slug = await uniqueSlug(input.slug || sanitizePlain(input.title));
  try {
    const doc = await Post.create({
      ...fields,
      slug,
      source: meta.source ?? "manual",
      generation: meta.generation ? { ...meta.generation, generatedAt: new Date() } : undefined,
    });
    logger.info("post.created", { id: String(doc._id), slug, status: doc.status, source: doc.source });
    return toFull(doc.toObject() as Lean);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw conflict("A post with this URL already exists. Try a different slug.");
    throw err;
  }
}

export async function updatePost(id: string, raw: unknown): Promise<PostFull> {
  if (!Types.ObjectId.isValid(id)) throw notFound("Post not found");
  const input = postPatchSchema.parse(raw);
  await connectDB();
  const existing = await Post.findById(id).lean<Lean>();
  if (!existing) throw notFound("Post not found");

  const fields = await buildDocFields(input, existing);
  if (input.slug !== undefined && input.slug.trim() && slugify(input.slug) !== existing.slug) {
    fields.slug = await uniqueSlug(input.slug, id);
  }
  // Moving back to draft keeps publishedAt so the original date survives a re-publish.
  const unset: Record<string, 1> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) {
      unset[k] = 1;
      delete fields[k];
    }
  }

  try {
    const doc = await Post.findByIdAndUpdate(
      id,
      { $set: fields, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { returnDocument: "after", runValidators: true },
    ).lean<Lean>();
    if (!doc) throw notFound("Post not found");
    logger.info("post.updated", { id, status: doc.status });
    return toFull(doc);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw conflict("A post with this URL already exists. Try a different slug.");
    throw err;
  }
}

export async function setPostStatus(id: string, status: "draft" | "published") {
  return updatePost(id, { status });
}

export async function deletePost(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Post not found");
  await connectDB();
  const res = await Post.findByIdAndDelete(id).lean<Lean>();
  if (!res) throw notFound("Post not found");
  await deleteEngagementForPost(id);
  logger.info("post.deleted", { id, slug: res.slug });
  return { slug: res.slug };
}

/* ------------------------------------------------------------------ */
/* Admin reads                                                         */
/* ------------------------------------------------------------------ */

export async function getPostById(id: string): Promise<PostFull | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDB();
  const doc = await Post.findById(id).lean<Lean>();
  return doc ? toFull(doc) : null;
}

export async function listAdminPosts(opts: { q?: string; status?: string; page?: number; limit?: number }) {
  await connectDB();
  const { q, status = "all", page = 1, limit = 20 } = opts;
  const filter: Filter = {};
  const now = new Date();
  if (status === "draft") filter.status = "draft";
  if (status === "published") Object.assign(filter, { status: "published", publishedAt: { $lte: now } });
  if (status === "scheduled") Object.assign(filter, { status: "published", publishedAt: { $gt: now } });
  if (q) filter.title = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  const [items, total] = await Promise.all([
    Post.find(filter).select(SUMMARY_FIELDS).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean<Lean[]>(),
    Post.countDocuments(filter),
  ]);
  return { items: items.map(toSummary), total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getPostStats() {
  await connectDB();
  const now = new Date();
  const [published, drafts, scheduled, ai, total] = await Promise.all([
    Post.countDocuments({ status: "published", publishedAt: { $lte: now } }),
    Post.countDocuments({ status: "draft" }),
    Post.countDocuments({ status: "published", publishedAt: { $gt: now } }),
    Post.countDocuments({ source: { $in: ["ai", "automation"] } }),
    Post.countDocuments(),
  ]);
  return { published, drafts, scheduled, ai, total };
}

/* ------------------------------------------------------------------ */
/* Public reads                                                        */
/* ------------------------------------------------------------------ */

export async function listPublishedPosts(opts: {
  page?: number;
  pageSize?: number;
  category?: string;
  tag?: string;
  q?: string;
  excludeIds?: string[];
}) {
  await connectDB();
  const { page = 1, pageSize = 9, category, tag, q, excludeIds } = opts;
  const extra: Filter = {};
  if (category) extra.category = category;
  if (tag) extra.tags = tag;
  if (excludeIds?.length) extra._id = { $nin: excludeIds.filter(Types.ObjectId.isValid) };
  if (q) extra.$text = { $search: q };
  const filter = publishedFilter(extra);

  const query = Post.find(filter, q ? { score: { $meta: "textScore" } } : undefined).select(SUMMARY_FIELDS);
  query.sort(q ? { score: { $meta: "textScore" } } : { publishedAt: -1 });

  const [items, total] = await Promise.all([
    query.skip((page - 1) * pageSize).limit(pageSize).lean<Lean[]>(),
    Post.countDocuments(filter),
  ]);
  return { items: items.map(toSummary), total, page, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getPublishedPostBySlug(slug: string): Promise<PostFull | null> {
  await connectDB();
  const doc = await Post.findOne(publishedFilter({ slug: slug.toLowerCase() })).lean<Lean>();
  return doc ? toFull(doc) : null;
}

export async function getRelatedPosts(post: Pick<PostSummary, "id" | "category" | "tags">, limit = 3) {
  await connectDB();
  const candidates = await Post.find(
    publishedFilter({
      _id: { $ne: post.id },
      $or: [{ category: post.category }, { tags: { $in: post.tags } }],
    }),
  )
    .select(SUMMARY_FIELDS)
    .sort({ publishedAt: -1 })
    .limit(24)
    .lean<Lean[]>();

  const tagSet = new Set(post.tags);
  const scored = candidates
    .map((c) => ({
      c,
      score: (c.category === post.category ? 2 : 0) + (c.tags ?? []).filter((t) => tagSet.has(t)).length,
    }))
    .sort((a, b) => b.score - a.score);

  const related = scored.slice(0, limit).map((s) => toSummary(s.c));
  if (related.length < limit) {
    const fill = await Post.find(publishedFilter({ _id: { $nin: [post.id, ...related.map((r) => r.id)] } }))
      .select(SUMMARY_FIELDS)
      .sort({ publishedAt: -1 })
      .limit(limit - related.length)
      .lean<Lean[]>();
    related.push(...fill.map(toSummary));
  }
  return related;
}

export async function getPostsForVideo(videoId: string, limit = 3) {
  await connectDB();
  const docs = await Post.find(publishedFilter({ videoId })).select(SUMMARY_FIELDS).sort({ publishedAt: -1 }).limit(limit).lean<Lean[]>();
  return docs.map(toSummary);
}

export async function listCategories() {
  await connectDB();
  const rows = await Post.aggregate<{ _id: string; count: number }>([
    { $match: publishedFilter() },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);
  return rows.map((r) => ({ name: r._id, slug: slugify(r._id), count: r.count }));
}

export async function listTags(limit = 40) {
  await connectDB();
  const rows = await Post.aggregate<{ _id: string; count: number }>([
    { $match: publishedFilter() },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limit },
  ]);
  return rows.map((r) => ({ name: r._id, slug: slugify(r._id), count: r.count }));
}

export async function resolveCategorySlug(slug: string) {
  const cats = await listCategories();
  return cats.find((c) => c.slug === slug) ?? null;
}

export async function resolveTagSlug(slug: string) {
  const tags = await listTags(500);
  return tags.find((t) => t.slug === slug) ?? null;
}

export async function getSitemapPosts() {
  await connectDB();
  return Post.find(publishedFilter({ "seo.noIndex": { $ne: true } }))
    .select("slug updatedAt publishedAt")
    .sort({ publishedAt: -1 })
    .limit(5000)
    .lean<{ slug: string; updatedAt: Date; publishedAt: Date }[]>();
}

/** Titles + topics of recent posts, used to steer the AI away from repeats. */
export async function listRecentForAI(limit = 60) {
  await connectDB();
  return Post.find()
    .select("title slug generation.topic createdAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<{ title: string; slug: string; generation?: { topic?: string }; createdAt: Date }[]>();
}
