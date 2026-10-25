import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

/** Same shape as blog cover images, so the admin image picker works everywhere. */
export const CoverImageSchema = new Schema(
  {
    url: { type: String, trim: true, maxlength: 2048 },
    alt: { type: String, trim: true, maxlength: 300, default: "" },
    mediaId: { type: Schema.Types.ObjectId, ref: "Media" },
    width: Number,
    height: Number,
    blurDataURL: { type: String, maxlength: 4000 },
    /** Photo credit, e.g. for Wikimedia Commons images that require attribution. */
    credit: { name: { type: String, trim: true, maxlength: 160 }, url: { type: String, trim: true, maxlength: 2048 } },
  },
  { _id: false },
);

/* ------------------------------------------------------------------ */
/* Product: a digital product sold in the store                        */
/* ------------------------------------------------------------------ */

const ProductSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    category: { type: String, trim: true, maxlength: 60, default: "Guide" },
    summary: { type: String, trim: true, maxlength: 300, default: "" },
    description: { type: String, trim: true, maxlength: 8000, default: "" },
    highlights: { type: [{ type: String, trim: true, maxlength: 160 }], default: [] },
    coverImage: { type: CoverImageSchema, default: undefined },
    /** Whole rupees. 0 = free (still needs an account to download). */
    price: { type: Number, required: true, min: 0, max: 1_000_000, default: 0 },
    /** Optional "was" price shown struck through. */
    compareAtPrice: { type: Number, min: 0, max: 1_000_000 },
    /** How buyers receive it: a private file we store, or a link (Drive, Notion…) revealed after purchase. */
    delivery: {
      type: { type: String, enum: ["file", "link"], default: "file" },
      fileId: { type: Schema.Types.ObjectId },
      fileName: { type: String, maxlength: 255 },
      fileSize: Number,
      contentType: { type: String, maxlength: 120 },
      url: { type: String, trim: true, maxlength: 2048 },
    },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    featured: { type: Boolean, default: false },
    salesCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
ProductSchema.index({ status: 1, featured: -1, createdAt: -1 });
export type ProductDoc = InferSchemaType<typeof ProductSchema> & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };
export const Product: Model<InferSchemaType<typeof ProductSchema>> = models.Product || model("Product", ProductSchema);

/* ------------------------------------------------------------------ */
/* Order: one student buying one product                               */
/* ------------------------------------------------------------------ */

const OrderSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["pending", "paid", "cancelled", "expired"], default: "pending" },
    payment: {
      provider: { type: String, enum: ["razorpay", "demo", "free"] },
      orderId: { type: String, index: true, sparse: true },
      paymentId: String,
      paidAt: Date,
      refundedAt: Date,
    },
    downloadCount: { type: Number, default: 0 },
    lastDownloadAt: Date,
    /** When the buyer ticked "I agree to the study material terms" at checkout. */
    termsAcceptedAt: Date,
    /** Unique, unguessable token for the one-time feedback link (created when first needed). */
    feedbackToken: { type: String, unique: true, sparse: true, select: false },
    feedbackSentAt: Date,
    ipHash: { type: String, select: false },
  },
  { timestamps: true },
);
OrderSchema.index({ student: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: 1 });
// A student owns each product at most once.
OrderSchema.index({ product: 1, student: 1 }, { unique: true, partialFilterExpression: { status: "paid" }, name: "one_paid_order_per_product" });
export type OrderDoc = InferSchemaType<typeof OrderSchema> & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };
export const Order: Model<InferSchemaType<typeof OrderSchema>> = models.Order || model("Order", OrderSchema);

/* ------------------------------------------------------------------ */
/* ProductReview: one rating + text per purchase, via its feedback link */
/* ------------------------------------------------------------------ */

const ProductReviewSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    student: { type: Schema.Types.ObjectId, ref: "Student" },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, trim: true, maxlength: 2000, default: "" },
    status: { type: String, enum: ["visible", "hidden"], default: "visible" },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);
ProductReviewSchema.index({ product: 1, status: 1, createdAt: -1 });
export type ProductReviewDoc = InferSchemaType<typeof ProductReviewSchema> & { _id: Types.ObjectId; createdAt: Date };
export const ProductReview: Model<InferSchemaType<typeof ProductReviewSchema>> = models.ProductReview || model("ProductReview", ProductReviewSchema);
