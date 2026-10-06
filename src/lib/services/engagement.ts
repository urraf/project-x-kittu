import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Types } from "mongoose";
import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Comment, Post, PostLike, PostView, type CommentDoc } from "@/lib/models";
import { env } from "@/lib/env";
import { notFound } from "@/lib/http";
import { sanitizePlain } from "@/lib/content/html";
import type { AdminCommentDTO, CommentDTO, EngagementDTO } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Anonymous visitor identity                                          */
/* ------------------------------------------------------------------ */

const VISITOR_COOKIE = "kk_vid";

/** Returns the visitor id from the cookie, minting one if missing (no login needed). */
export function visitorFrom(req: NextRequest) {
  const existing = req.cookies.get(VISITOR_COOKIE)?.value;
  if (existing && /^[\w-]{16,64}$/.test(existing)) return { id: existing, isNew: false };
  return { id: randomBytes(18).toString("base64url"), isNew: true };
}

export function persistVisitor(res: NextResponse, visitor: { id: string; isNew: boolean }) {
  if (!visitor.isNew) return;
  res.cookies.set(VISITOR_COOKIE, visitor.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function hashIp(ip: string) {
  return createHash("sha256").update(`${ip}:${process.env.AUTH_SECRET ?? ""}`).digest("hex").slice(0, 32);
}

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|curl|wget|python|axios|node-fetch/i;
export const isBot = (ua: string | null) => !ua || BOT_RE.test(ua);

/* ------------------------------------------------------------------ */
/* Posts: only published posts accept engagement                       */
/* ------------------------------------------------------------------ */

async function publishedPost(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Post not found");
  await connectDB();
  const post = await Post.findOne({ _id: id, status: "published", publishedAt: { $lte: new Date() } })
    .select("views likes commentCount slug")
    .lean<{ _id: Types.ObjectId; views?: number; likes?: number; commentCount?: number; slug: string }>();
  if (!post) throw notFound("Post not found");
  return post;
}

/* ------------------------------------------------------------------ */
/* Views & likes                                                       */
/* ------------------------------------------------------------------ */

/** Counts a view at most once per visitor per 24 hours, then returns fresh counts. */
export async function recordView(postId: string, visitorId: string, countIt: boolean): Promise<EngagementDTO> {
  const post = await publishedPost(postId);
  let views = post.views ?? 0;
  if (countIt) {
    try {
      await PostView.create({ _id: `${postId}:${visitorId}`, expiresAt: new Date(Date.now() + 24 * 3600_000) });
      const updated = await Post.findByIdAndUpdate(postId, { $inc: { views: 1 } }, { returnDocument: "after" }).select("views").lean<{ views: number }>();
      views = updated?.views ?? views + 1;
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err; // already counted today
    }
  }
  const liked = Boolean(await PostLike.exists({ _id: `${postId}:${visitorId}` }));
  return { views, likes: post.likes ?? 0, liked, commentCount: post.commentCount ?? 0 };
}

/** Toggles a like for this visitor. Idempotent per visitor. */
export async function toggleLike(postId: string, visitorId: string): Promise<{ likes: number; liked: boolean }> {
  await publishedPost(postId);
  const key = `${postId}:${visitorId}`;
  const removed = await PostLike.deleteOne({ _id: key });
  if (removed.deletedCount) {
    const p = await Post.findOneAndUpdate({ _id: postId, likes: { $gt: 0 } }, { $inc: { likes: -1 } }, { returnDocument: "after" }).select("likes").lean<{ likes: number }>();
    return { likes: p?.likes ?? 0, liked: false };
  }
  try {
    await PostLike.create({ _id: key, post: postId });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      const p = await Post.findById(postId).select("likes").lean<{ likes: number }>();
      return { likes: p?.likes ?? 0, liked: true };
    }
    throw err;
  }
  const p = await Post.findByIdAndUpdate(postId, { $inc: { likes: 1 } }, { returnDocument: "after" }).select("likes").lean<{ likes: number }>();
  return { likes: p?.likes ?? 1, liked: true };
}

/* ------------------------------------------------------------------ */
/* Comments                                                            */
/* ------------------------------------------------------------------ */

export const commentInputSchema = z.object({
  name: z.string().trim().min(2, "Please add your name (2+ characters)").max(60, "Name is too long"),
  message: z.string().trim().min(2, "Write a comment first").max(2000, "Comments can be up to 2,000 characters"),
  captchaToken: z.string().min(10, "Please answer the math question").max(2000),
  captchaAnswer: z.union([z.string(), z.number()]).refine((v) => String(v).trim() !== "", "Please answer the math question"),
  /** Honeypot: hidden from people, tempting for bots. */
  website: z.string().max(500).optional(),
});

function toCommentDTO(c: CommentDoc): CommentDTO {
  return {
    id: String(c._id),
    name: c.name,
    message: c.message,
    createdAt: new Date(c.createdAt).toISOString(),
    reply: c.reply?.text ? { text: c.reply.text, at: c.reply.at ? new Date(c.reply.at).toISOString() : undefined } : undefined,
  };
}

/** Keeps the denormalised counter on the post in sync with visible comments. */
export async function recountComments(postId: Types.ObjectId | string) {
  const count = await Comment.countDocuments({ post: postId, status: "visible" });
  await Post.updateOne({ _id: postId }, { $set: { commentCount: count } });
  return count;
}

export async function listVisibleComments(postId: string) {
  await publishedPost(postId);
  const docs = await Comment.find({ post: postId, status: "visible" }).sort({ createdAt: 1 }).limit(500).lean<CommentDoc[]>();
  return docs.map(toCommentDTO);
}

const LINK_RE = /(https?:\/\/|www\.)\S+/gi;

export async function createComment(postId: string, input: z.infer<typeof commentInputSchema>, meta: { ip: string; requireApproval: boolean }) {
  await publishedPost(postId);
  const message = sanitizePlain(input.message);
  const name = sanitizePlain(input.name);
  // Link-heavy comments are held for review: the classic spam signature.
  const links = (message.match(LINK_RE) ?? []).length;
  const status = meta.requireApproval || links > 2 ? "pending" : "visible";
  const doc = await Comment.create({ post: postId, name, message, status, ipHash: hashIp(meta.ip) });
  if (status === "visible") await recountComments(postId);
  return { comment: status === "visible" ? toCommentDTO(doc.toObject() as CommentDoc) : null, pending: status === "pending" };
}

/* ------------------------------------------------------------------ */
/* Admin moderation                                                    */
/* ------------------------------------------------------------------ */

export async function listAdminComments(opts: { status?: string; page?: number; limit?: number }) {
  await connectDB();
  const { status = "all", page = 1, limit = 30 } = opts;
  const filter: { status?: "visible" | "pending" | "hidden" } = status === "visible" || status === "pending" || status === "hidden" ? { status } : {};
  const [docs, total] = await Promise.all([
    Comment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("post", "title slug").lean(),
    Comment.countDocuments(filter),
  ]);
  const items: AdminCommentDTO[] = (docs as unknown as (CommentDoc & { post: { _id: Types.ObjectId; title: string; slug: string } | null })[]).map((c) => ({
    ...toCommentDTO(c),
    status: (c.status ?? "visible") as AdminCommentDTO["status"],
    read: Boolean(c.read),
    post: c.post ? { id: String(c.post._id), title: c.post.title, slug: c.post.slug } : undefined,
  }));
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function countUnreadComments() {
  await connectDB();
  return Comment.countDocuments({ read: false });
}

export async function countPendingComments() {
  await connectDB();
  return Comment.countDocuments({ status: "pending" });
}

export async function markAllCommentsRead() {
  await connectDB();
  await Comment.updateMany({ read: false }, { $set: { read: true } });
}

export const commentPatchSchema = z.object({
  status: z.enum(["visible", "pending", "hidden"]).optional(),
  reply: z.string().trim().max(2000).optional(),
});

export async function updateComment(id: string, raw: unknown) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Comment not found");
  const patch = commentPatchSchema.parse(raw);
  await connectDB();
  const set: Record<string, unknown> = { read: true };
  const unset: Record<string, 1> = {};
  if (patch.status) set.status = patch.status;
  if (patch.reply !== undefined) {
    if (patch.reply) set.reply = { text: sanitizePlain(patch.reply), at: new Date() };
    else unset.reply = 1;
  }
  const doc = await Comment.findByIdAndUpdate(id, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { returnDocument: "after" }).lean<CommentDoc>();
  if (!doc) throw notFound("Comment not found");
  await recountComments(doc.post);
  return toCommentDTO(doc);
}

export async function deleteComment(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Comment not found");
  await connectDB();
  const doc = await Comment.findByIdAndDelete(id).lean<CommentDoc>();
  if (!doc) throw notFound("Comment not found");
  await recountComments(doc.post);
}

/** Removes engagement data when a post is deleted. */
export async function deleteEngagementForPost(postId: string) {
  await connectDB();
  await Promise.all([Comment.deleteMany({ post: postId }), PostLike.deleteMany({ post: postId })]);
}

export async function engagementTotals() {
  await connectDB();
  const [row] = await Post.aggregate<{ views: number; likes: number }>([{ $group: { _id: null, views: { $sum: "$views" }, likes: { $sum: "$likes" } } }]);
  return { views: row?.views ?? 0, likes: row?.likes ?? 0 };
}

export async function recentComments(limit = 4) {
  return (await listAdminComments({ limit })).items;
}
