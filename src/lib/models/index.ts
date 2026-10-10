import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { MILESTONE_KINDS, VIDEO_SERIES_IDS } from "@/lib/site";

export { Post, type PostDoc } from "./Post";
export * from "./mentorship";

/* ------------------------------------------------------------------ */
/* Media: metadata for optimised images stored in GridFS               */
/* ------------------------------------------------------------------ */

const MediaSchema = new Schema(
  {
    originalName: { type: String, trim: true, maxlength: 255 },
    alt: { type: String, trim: true, maxlength: 300, default: "" },
    mime: { type: String, default: "image/webp" },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    size: { type: Number, required: true },
    blurDataURL: { type: String, maxlength: 4000 },
    variants: {
      full: { type: Schema.Types.ObjectId, required: true },
      thumb: { type: Schema.Types.ObjectId, required: true },
    },
    source: { type: String, enum: ["upload", "youtube", "unsplash", "generated"], default: "upload" },
    credit: { name: String, url: String },
  },
  { timestamps: true },
);
MediaSchema.index({ createdAt: -1 });

export type MediaDoc = InferSchemaType<typeof MediaSchema> & { _id: Types.ObjectId };
export const Media: Model<InferSchemaType<typeof MediaSchema>> = models.Media || model("Media", MediaSchema);

/* ------------------------------------------------------------------ */
/* Video: YouTube videos synced from the channel or added manually     */
/* ------------------------------------------------------------------ */

const VideoSchema = new Schema(
  {
    youtubeId: { type: String, required: true, unique: true, match: /^[\w-]{11}$/ },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 6000 },
    publishedAt: { type: Date },
    durationSec: { type: Number, min: 0 },
    views: { type: Number, min: 0 },
    isShort: { type: Boolean, default: false },
    series: { type: String, enum: VIDEO_SERIES_IDS, default: "global" },
    featured: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    source: { type: String, enum: ["sync", "manual", "seed"], default: "sync" },
    syncedAt: Date,
    /** Caption text, cached for writing the video's companion blog post. */
    transcript: { type: String, maxlength: 60000, select: false },
    transcriptFetchedAt: Date,
  },
  { timestamps: true },
);
VideoSchema.index({ hidden: 1, isShort: 1, publishedAt: -1 });
VideoSchema.index({ series: 1, hidden: 1, publishedAt: -1 });

export type VideoDoc = InferSchemaType<typeof VideoSchema> & { _id: Types.ObjectId };
export const Video: Model<InferSchemaType<typeof VideoSchema>> = models.Video || model("Video", VideoSchema);

/* ------------------------------------------------------------------ */
/* Milestone: the Journey timeline                                     */
/* ------------------------------------------------------------------ */

const MilestoneSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    period: { type: String, required: true, trim: true, maxlength: 60 },
    sortDate: { type: Date, required: true },
    chapter: { type: String, trim: true, maxlength: 60, default: "" },
    location: { type: String, trim: true, maxlength: 100, default: "" },
    description: { type: String, trim: true, maxlength: 3000, default: "" },
    highlights: { type: [{ type: String, trim: true, maxlength: 160 }], default: [] },
    kind: { type: String, enum: MILESTONE_KINDS, default: "life" },
    image: { url: { type: String, maxlength: 2048 }, alt: { type: String, maxlength: 300 } },
    videoId: { type: String, trim: true, match: /^[\w-]{11}$/ },
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
);
MilestoneSchema.index({ published: 1, sortDate: 1 });

export type MilestoneDoc = InferSchemaType<typeof MilestoneSchema> & { _id: Types.ObjectId };
export const Milestone: Model<InferSchemaType<typeof MilestoneSchema>> =
  models.Milestone || model("Milestone", MilestoneSchema);

/* ------------------------------------------------------------------ */
/* Settings: singleton document holding editable site + AI config      */
/* ------------------------------------------------------------------ */

const SettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "site" },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false },
);
export const Settings: Model<InferSchemaType<typeof SettingsSchema>> =
  models.Settings || model("Settings", SettingsSchema);

/* ------------------------------------------------------------------ */
/* Message: collaboration / contact enquiries                          */
/* ------------------------------------------------------------------ */

const MessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    topic: { type: String, enum: ["collaboration", "question", "speaking", "other"], default: "other" },
    organisation: { type: String, trim: true, maxlength: 120, default: "" },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    status: { type: String, enum: ["new", "read", "archived"], default: "new" },
    ip: { type: String, select: false },
  },
  { timestamps: true },
);
MessageSchema.index({ status: 1, createdAt: -1 });
export type MessageDoc = InferSchemaType<typeof MessageSchema> & { _id: Types.ObjectId };
export const Message: Model<InferSchemaType<typeof MessageSchema>> = models.Message || model("Message", MessageSchema);

/* ------------------------------------------------------------------ */
/* Security: sessions, rate limits, single-use captcha nonces          */
/* ------------------------------------------------------------------ */

const SessionSchema = new Schema({
  _id: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  ip: String,
  userAgent: { type: String, maxlength: 400 },
});
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Session: Model<InferSchemaType<typeof SessionSchema>> = models.Session || model("Session", SessionSchema);

const RateLimitSchema = new Schema({
  _id: { type: String, required: true },
  count: { type: Number, default: 0 },
  resetAt: { type: Date, required: true },
  lockedUntil: { type: Date },
  expiresAt: { type: Date, required: true },
});
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RateLimit: Model<InferSchemaType<typeof RateLimitSchema>> =
  models.RateLimit || model("RateLimit", RateLimitSchema);

const CaptchaNonceSchema = new Schema({
  _id: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});
CaptchaNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const CaptchaNonce: Model<InferSchemaType<typeof CaptchaNonceSchema>> =
  models.CaptchaNonce || model("CaptchaNonce", CaptchaNonceSchema);

/* ------------------------------------------------------------------ */
/* AdminAccount: singleton holding the admin password hash             */
/* ------------------------------------------------------------------ */

const AdminAccountSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "admin" },
    /** Login email (lowercase). */
    email: { type: String, trim: true, lowercase: true, maxlength: 200 },
    emailChangedAt: Date,
    /** scrypt hash (never the plain password). */
    passwordHash: { type: String, select: false },
    passwordChangedAt: Date,
  },
  { timestamps: true },
);
export const AdminAccount: Model<InferSchemaType<typeof AdminAccountSchema>> =
  models.AdminAccount || model("AdminAccount", AdminAccountSchema);

/* ------------------------------------------------------------------ */
/* Engagement: comments, likes and de-duplicated views                 */
/* ------------------------------------------------------------------ */

const CommentSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ["visible", "pending", "hidden"], default: "visible" },
    read: { type: Boolean, default: false },
    reply: { text: { type: String, maxlength: 2000 }, at: Date },
    ipHash: { type: String, select: false },
  },
  { timestamps: true },
);
CommentSchema.index({ post: 1, status: 1, createdAt: 1 });
CommentSchema.index({ status: 1, createdAt: -1 });
CommentSchema.index({ read: 1, createdAt: -1 });
export type CommentDoc = InferSchemaType<typeof CommentSchema> & { _id: Types.ObjectId; createdAt: Date };
export const Comment: Model<InferSchemaType<typeof CommentSchema>> = models.Comment || model("Comment", CommentSchema);

/** One document per (post, visitor): makes likes idempotent. */
const PostLikeSchema = new Schema({
  _id: { type: String, required: true },
  post: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});
export const PostLike: Model<InferSchemaType<typeof PostLikeSchema>> = models.PostLike || model("PostLike", PostLikeSchema);

/** One document per (post, visitor) per 24h: a view counts once a day. */
const PostViewSchema = new Schema({
  _id: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});
PostViewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const PostView: Model<InferSchemaType<typeof PostViewSchema>> = models.PostView || model("PostView", PostViewSchema);

/* ------------------------------------------------------------------ */
/* AutomationRun: log + idempotency ledger for AI generation runs      */
/* ------------------------------------------------------------------ */

const AutomationRunSchema = new Schema(
  {
    idempotencyKey: { type: String, required: true, unique: true, maxlength: 200 },
    trigger: { type: String, enum: ["cron", "manual"], default: "cron" },
    status: { type: String, enum: ["running", "succeeded", "failed", "skipped"], default: "running" },
    startedAt: { type: Date, default: Date.now },
    finishedAt: Date,
    durationMs: Number,
    topic: String,
    postId: { type: Schema.Types.ObjectId, ref: "Post" },
    postSlug: String,
    postStatus: String,
    model: String,
    message: { type: String, maxlength: 2000 },
    warnings: [String],
    ip: String,
  },
  { timestamps: true },
);
AutomationRunSchema.index({ status: 1, startedAt: -1 });
// Atomic run lock: at most one document may be in the "running" state.
AutomationRunSchema.index({ status: 1 }, { unique: true, partialFilterExpression: { status: "running" }, name: "single_running_lock" });
AutomationRunSchema.index({ startedAt: -1 });
export type AutomationRunDoc = InferSchemaType<typeof AutomationRunSchema> & { _id: Types.ObjectId };
export const AutomationRun: Model<InferSchemaType<typeof AutomationRunSchema>> =
  models.AutomationRun || model("AutomationRun", AutomationRunSchema);
export * from "./store";
export * from "./opportunity";
export * from "./university";
export * from "./testimonial";
