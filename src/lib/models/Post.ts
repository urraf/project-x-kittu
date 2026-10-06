import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ImageSchema = new Schema(
  {
    url: { type: String, trim: true, maxlength: 2048 },
    alt: { type: String, trim: true, maxlength: 300, default: "" },
    mediaId: { type: Schema.Types.ObjectId, ref: "Media" },
    width: Number,
    height: Number,
    blurDataURL: { type: String, maxlength: 4000 },
    credit: {
      name: { type: String, maxlength: 120 },
      url: { type: String, maxlength: 2048 },
    },
  },
  { _id: false },
);

const PostSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    excerpt: { type: String, trim: true, maxlength: 400, default: "" },
    /** Sanitised HTML. Always written through the content sanitiser. */
    content: { type: String, default: "" },
    /** Plain text derived from content, used for search and reading time. */
    contentText: { type: String, default: "", select: false },
    wordCount: { type: Number, default: 0, min: 0 },
    readingTime: { type: Number, default: 1, min: 1 },

    coverImage: { type: ImageSchema, default: undefined },
    thumbnail: { type: ImageSchema, default: undefined },

    category: { type: String, trim: true, maxlength: 60, default: "Stories", index: true },
    tags: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
      default: [],
      validate: [(v: string[]) => v.length <= 15, "A post can have at most 15 tags"],
    },

    author: {
      name: { type: String, trim: true, maxlength: 80 },
      avatar: { type: String, trim: true, maxlength: 2048 },
      bio: { type: String, trim: true, maxlength: 400 },
    },

    seo: {
      title: { type: String, trim: true, maxlength: 90 },
      description: { type: String, trim: true, maxlength: 200 },
      canonicalUrl: { type: String, trim: true, maxlength: 2048 },
      ogImage: { type: String, trim: true, maxlength: 2048 },
      noIndex: { type: Boolean, default: false },
    },

    status: { type: String, enum: ["draft", "published"], default: "draft", required: true },
    /** For published posts. A future date means "scheduled". */
    publishedAt: { type: Date },
    featured: { type: Boolean, default: false },
    /** Engagement counters (denormalised for fast listing). */
    views: { type: Number, default: 0, min: 0 },
    likes: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
    /** Optional related YouTube video embedded at the top of the article. */
    videoId: { type: String, trim: true, match: /^[\w-]{11}$/ },

    source: { type: String, enum: ["manual", "ai", "automation"], default: "manual" },
    generation: {
      model: String,
      topic: String,
      promptVersion: String,
      runId: { type: Schema.Types.ObjectId, ref: "AutomationRun" },
      generatedAt: Date,
      warnings: [String],
    },
  },
  { timestamps: true },
);

PostSchema.index({ status: 1, publishedAt: -1 });
PostSchema.index({ tags: 1, status: 1 });
PostSchema.index({ featured: 1, status: 1, publishedAt: -1 });
PostSchema.index(
  { title: "text", excerpt: "text", contentText: "text", tags: "text", category: "text" },
  { weights: { title: 10, tags: 6, excerpt: 4, category: 3, contentText: 1 }, name: "post_text" },
);

PostSchema.pre("validate", function () {
  if (this.status === "published" && !this.publishedAt) this.publishedAt = new Date();
});

export type PostDoc = InferSchemaType<typeof PostSchema> & { _id: import("mongoose").Types.ObjectId };

export const Post: Model<InferSchemaType<typeof PostSchema>> = models.Post || model("Post", PostSchema);
