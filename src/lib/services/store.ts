import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import mongoose, { Types } from "mongoose";
import { z } from "zod";
import { connectDB, getDb } from "@/lib/db/connect";
import { Order, Product, ProductReview, Student, type OrderDoc, type ProductDoc } from "@/lib/models";
import { env } from "@/lib/env";
import { ApiError, badRequest, conflict, notFound } from "@/lib/http";
import { logger } from "@/lib/logger";
import { absoluteUrl } from "@/lib/site";
import { sanitizePlain } from "@/lib/content/html";
import { slugify } from "@/lib/utils/text";
import { imageSchema } from "@/lib/validation/post";
import { sendEmail } from "@/lib/services/email";
import { adminNewOrderEmail, orderConfirmedEmail } from "@/lib/email/templates";
import { adminNotifyEmail } from "@/lib/services/mentorship";
import { ensureOrderFeedbackToken, feedbackUrl } from "@/lib/services/feedback";
import { createRazorpayOrder, paymentMode, refundPayment } from "@/lib/services/razorpay";
import { ensureAccountPassword } from "@/lib/services/student-account";
import type { ImageDTO } from "@/lib/types";

/**
 * Digital store: products with a cover image, bought once per student and
 * delivered either as a private file (kept in its own GridFS bucket, never
 * served publicly) or as a link revealed after purchase.
 */

/* ------------------------------------------------------------------ */
/* DTOs                                                                */
/* ------------------------------------------------------------------ */

export type ProductDTO = {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  description: string;
  highlights: string[];
  coverImage?: ImageDTO;
  price: number;
  compareAtPrice?: number;
  deliveryType: "file" | "link";
  /** e.g. "PDF · 2.4 MB" for files */
  deliveryNote?: string;
  status: "draft" | "published";
  featured: boolean;
  salesCount: number;
};

export type AdminProductDTO = ProductDTO & {
  delivery: { type: "file" | "link"; fileName?: string; fileSize?: number; url?: string; hasFile: boolean };
  revenue: number;
  createdAt: string;
};

export type LibraryItemDTO = {
  orderId: string;
  status: "paid" | "cancelled";
  amount: number;
  provider: "razorpay" | "demo" | "free";
  paymentId?: string;
  paidAt?: string;
  refundedAt?: string;
  downloadCount: number;
  product?: { id: string; title: string; slug: string; category: string; coverImage?: ImageDTO; deliveryType: "file" | "link"; deliveryNote?: string };
  /** One-time feedback link (owned, not refunded) and the rating once given. */
  feedbackUrl?: string;
  rating?: number;
};

const formatBytes = (n?: number | null) => (!n ? "" : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
const fileKind = (name?: string | null) => (name?.split(".").pop() ?? "").toUpperCase().slice(0, 6);

function toImage(img?: ProductDoc["coverImage"] | null): ImageDTO | undefined {
  if (!img?.url) return undefined;
  return { url: img.url, alt: img.alt ?? "", mediaId: img.mediaId ? String(img.mediaId) : undefined, width: img.width ?? undefined, height: img.height ?? undefined, blurDataURL: img.blurDataURL ?? undefined };
}

function deliveryNote(p: ProductDoc) {
  if (p.delivery?.type === "link") return "Online access link";
  const kind = fileKind(p.delivery?.fileName);
  const size = formatBytes(p.delivery?.fileSize);
  return [kind ? `${kind} file` : "Download", size].filter(Boolean).join(" · ");
}

function toProductDTO(p: ProductDoc): ProductDTO {
  return {
    id: String(p._id),
    title: p.title,
    slug: p.slug,
    category: p.category ?? "Guide",
    summary: p.summary ?? "",
    description: p.description ?? "",
    highlights: p.highlights ?? [],
    coverImage: toImage(p.coverImage),
    price: p.price,
    compareAtPrice: p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice : undefined,
    deliveryType: (p.delivery?.type ?? "file") as "file" | "link",
    deliveryNote: deliveryNote(p),
    status: p.status as ProductDTO["status"],
    featured: Boolean(p.featured),
    salesCount: p.salesCount ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/* Public reads                                                        */
/* ------------------------------------------------------------------ */

export async function listPublishedProducts({ category, limit = 60 }: { category?: string; limit?: number } = {}) {
  await connectDB();
  const filter: Record<string, unknown> = { status: "published" };
  if (category) filter.category = category;
  const docs = await Product.find(filter).sort({ featured: -1, createdAt: -1 }).limit(limit).lean<ProductDoc[]>();
  return docs.map(toProductDTO);
}

export async function productCategories() {
  await connectDB();
  const rows = await Product.aggregate<{ _id: string; n: number }>([{ $match: { status: "published" } }, { $group: { _id: "$category", n: { $sum: 1 } } }, { $sort: { n: -1 } }]);
  return rows.filter((r) => r._id).map((r) => ({ name: r._id, count: r.n }));
}

export async function getPublicProductBySlug(slug: string) {
  await connectDB();
  const doc = await Product.findOne({ slug, status: "published" }).lean<ProductDoc>();
  return doc ? toProductDTO(doc) : null;
}

/* ------------------------------------------------------------------ */
/* Admin: products                                                     */
/* ------------------------------------------------------------------ */

export const productInputSchema = z
  .object({
    title: z.string().trim().min(3, "Add a title").max(140),
    category: z.string().trim().min(1, "Pick a category").max(60).default("Guide"),
    summary: z.string().trim().max(300).default(""),
    description: z.string().trim().max(8000).default(""),
    highlights: z.array(z.string().trim().min(1).max(160)).max(12).default([]),
    coverImage: imageSchema.nullable().optional(),
    price: z.coerce.number().int().min(0, "Price can't be negative").max(1_000_000),
    compareAtPrice: z.coerce.number().int().min(0).max(1_000_000).nullable().optional(),
    deliveryType: z.enum(["file", "link"]).default("file"),
    deliveryUrl: z
      .string()
      .trim()
      .max(2048)
      .refine((v) => v === "" || /^https:\/\//.test(v), "The link must start with https://")
      .default(""),
    status: z.enum(["draft", "published"]).default("draft"),
    featured: z.boolean().default(false),
  })
  .refine((v) => v.deliveryType !== "link" || v.deliveryUrl, { path: ["deliveryUrl"], message: "Paste the link buyers should get" });

async function uniqueProductSlug(base: string, excludeId?: string) {
  const root = slugify(base, 80) || "product";
  let candidate = root;
  for (let i = 2; await Product.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); i++) candidate = `${root}-${i}`;
  return candidate;
}

async function toAdminProductDTO(p: ProductDoc): Promise<AdminProductDTO> {
  const agg = await Order.aggregate<{ revenue: number }>([
    { $match: { product: p._id, status: "paid", "payment.provider": "razorpay", "payment.refundedAt": null } },
    { $group: { _id: null, revenue: { $sum: "$amount" } } },
  ]);
  return {
    ...toProductDTO(p),
    delivery: {
      type: (p.delivery?.type ?? "file") as "file" | "link",
      fileName: p.delivery?.fileName ?? undefined,
      fileSize: p.delivery?.fileSize ?? undefined,
      url: p.delivery?.url ?? undefined,
      hasFile: Boolean(p.delivery?.fileId),
    },
    revenue: agg[0]?.revenue ?? 0,
    createdAt: new Date(p.createdAt).toISOString(),
  };
}

export async function listAdminProducts() {
  await connectDB();
  const docs = await Product.find().sort({ createdAt: -1 }).limit(300).lean<ProductDoc[]>();
  return Promise.all(docs.map(toAdminProductDTO));
}

export async function getAdminProduct(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDB();
  const doc = await Product.findById(id).lean<ProductDoc>();
  return doc ? toAdminProductDTO(doc) : null;
}

function productFields(input: z.infer<typeof productInputSchema>) {
  return {
    title: sanitizePlain(input.title),
    category: sanitizePlain(input.category),
    summary: sanitizePlain(input.summary),
    description: sanitizePlain(input.description),
    highlights: input.highlights.map(sanitizePlain),
    coverImage: input.coverImage ?? undefined,
    price: input.price,
    compareAtPrice: input.compareAtPrice ?? undefined,
    status: input.status,
    featured: input.featured,
  };
}

export async function createProduct(raw: unknown) {
  const input = productInputSchema.parse(raw);
  await connectDB();
  const doc = await Product.create({
    ...productFields(input),
    slug: await uniqueProductSlug(input.title),
    delivery: { type: input.deliveryType, url: input.deliveryType === "link" ? input.deliveryUrl : undefined },
  });
  return toAdminProductDTO(doc.toObject() as ProductDoc);
}

export async function updateProduct(id: string, raw: unknown) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Product not found");
  const input = productInputSchema.parse(raw);
  await connectDB();
  const existing = await Product.findById(id).lean<ProductDoc>();
  if (!existing) throw notFound("Product not found");
  if (input.status === "published" && input.deliveryType === "file" && !existing.delivery?.fileId) {
    throw badRequest("Upload the file buyers will download before publishing (or choose “Link” delivery).", [{ path: "deliveryType", message: "No file uploaded yet" }]);
  }
  const doc = await Product.findByIdAndUpdate(
    id,
    {
      $set: {
        ...productFields(input),
        ...(input.coverImage ? {} : { coverImage: undefined }),
        "delivery.type": input.deliveryType,
        "delivery.url": input.deliveryType === "link" ? input.deliveryUrl : existing.delivery?.url,
      },
      ...(input.coverImage ? {} : { $unset: { coverImage: 1 } }),
    },
    { returnDocument: "after", runValidators: true },
  ).lean<ProductDoc>();
  return toAdminProductDTO(doc!);
}

export async function deleteProduct(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Product not found");
  await connectDB();
  if (await Order.exists({ product: id, status: "paid" })) {
    throw new ApiError(409, "Students have bought this product, so it can't be deleted (they need their downloads). Unpublish it instead.", "has_orders");
  }
  const doc = await Product.findByIdAndDelete(id).lean<ProductDoc>();
  if (!doc) throw notFound("Product not found");
  if (doc.delivery?.fileId) await fileBucket().delete(doc.delivery.fileId).catch(() => {});
  await Order.deleteMany({ product: id });
}

/* ------------------------------------------------------------------ */
/* Private product files (separate bucket, never served by /api/media) */
/* ------------------------------------------------------------------ */

const FILE_BUCKET = "product_files";
export const MAX_PRODUCT_FILE_BYTES = 50 * 1024 * 1024;
const fileBucket = () => new mongoose.mongo.GridFSBucket(getDb(), { bucketName: FILE_BUCKET });

export async function attachProductFile(productId: string, file: File) {
  if (!Types.ObjectId.isValid(productId)) throw notFound("Product not found");
  if (!file.size) throw badRequest("The file is empty.");
  if (file.size > MAX_PRODUCT_FILE_BYTES) throw new ApiError(413, "The file is too large. The maximum is 50 MB; for bigger files use “Link” delivery (e.g. Google Drive).", "file_too_large");
  await connectDB();
  const product = await Product.findById(productId).lean<ProductDoc>();
  if (!product) throw notFound("Product not found");
  const name = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 200) || "download";
  const contentType = (file.type || "application/octet-stream").slice(0, 120);
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileId = await new Promise<Types.ObjectId>((resolve, reject) => {
    const up = fileBucket().openUploadStream(name, { metadata: { productId, contentType } });
    up.once("error", reject);
    up.once("finish", () => resolve(up.id as Types.ObjectId));
    up.end(buffer);
  });
  await Product.updateOne({ _id: productId }, { $set: { "delivery.type": "file", "delivery.fileId": fileId, "delivery.fileName": name, "delivery.fileSize": file.size, "delivery.contentType": contentType } });
  if (product.delivery?.fileId) await fileBucket().delete(product.delivery.fileId).catch(() => {});
  logger.info("store.file_attached", { product: productId, bytes: file.size });
  return getAdminProduct(productId);
}

/* ------------------------------------------------------------------ */
/* Buying                                                              */
/* ------------------------------------------------------------------ */

export const buyInputSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().toLowerCase().max(200).pipe(z.email("Enter a valid email address")),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((p) => /^[+\d][\d\s-]{6,}$/.test(p), "Enter a valid phone number"),
  captchaToken: z.string().max(2000).optional(),
  captchaAnswer: z.union([z.string(), z.number()]).optional(),
  website: z.string().max(500).optional(),
});

export type OrderStart =
  | { orderId: string; status: "paid"; newAccount: boolean }
  | {
      orderId: string;
      status: "payment_required";
      demo: boolean;
      razorpay: { keyId: string; orderId: string; amount: number; currency: "INR"; name: string; description: string; prefill: { name: string; email: string; contact: string } };
    };

export async function startOrder(productId: string, input: z.infer<typeof buyInputSchema>, meta: { ip: string }): Promise<OrderStart> {
  if (!Types.ObjectId.isValid(productId)) throw notFound("Product not found");
  await connectDB();
  const product = await Product.findById(productId).lean<ProductDoc>();
  if (!product || product.status !== "published") throw notFound("This product isn't available.");

  const email = input.email;
  const student = await Student.findOneAndUpdate(
    { email },
    { $setOnInsert: { email, name: sanitizePlain(input.name), phone: input.phone } },
    { upsert: true, returnDocument: "after" },
  ).lean<{ _id: Types.ObjectId }>();
  if (await Order.exists({ product: productId, student: student!._id, status: "paid" })) {
    throw conflict("You already own this. Log in and open “My library” to download it.");
  }

  const order = await Order.create({
    product: productId,
    student: student!._id,
    name: sanitizePlain(input.name),
    email,
    phone: input.phone,
    amount: product.price,
    status: "pending",
    ipHash: createHash("sha256").update(meta.ip).digest("hex").slice(0, 32),
  });

  if (!product.price) {
    const outcome = await confirmOrder(String(order._id), { provider: "free" });
    return { orderId: String(order._id), status: "paid", newAccount: outcome.result === "paid" && Boolean(outcome.newAccount) };
  }

  try {
    const demo = paymentMode() === "demo";
    const rp = demo
      ? { orderId: `order_demo_${randomBytes(8).toString("hex")}`, amountPaise: product.price * 100 }
      : await createRazorpayOrder({ amountRupees: product.price, receipt: `od_${order._id}`, notes: { orderId: String(order._id), product: product.title.slice(0, 200) } });
    await Order.updateOne({ _id: order._id }, { $set: { payment: { provider: demo ? "demo" : "razorpay", orderId: rp.orderId } } });
    return {
      orderId: String(order._id),
      status: "payment_required",
      demo,
      razorpay: {
        keyId: demo ? "demo" : env.razorpayKeyId!,
        orderId: rp.orderId,
        amount: rp.amountPaise,
        currency: "INR",
        name: "Life of KittuKun",
        description: product.title.slice(0, 250),
        prefill: { name: input.name, email, contact: input.phone },
      },
    };
  } catch (err) {
    await Order.updateOne({ _id: order._id }, { $set: { status: "expired" } });
    throw err;
  }
}

export type OrderOutcome = { result: "paid"; newAccount?: boolean } | { result: "already_paid" } | { result: "refunded" | "rejected"; reason: "duplicate" };

/** Marks an order paid exactly once (browser callback, webhook, or free). Sends the emails. */
export async function confirmOrder(orderId: string, payment: { provider: "razorpay" | "demo" | "free"; paymentId?: string }): Promise<OrderOutcome> {
  await connectDB();
  const set = {
    status: "paid",
    "payment.provider": payment.provider,
    "payment.paidAt": new Date(),
    ...(payment.paymentId ? { "payment.paymentId": payment.paymentId } : {}),
  };
  let before: OrderDoc | null;
  try {
    before = await Order.findOneAndUpdate({ _id: orderId, status: { $in: ["pending", "expired"] } }, { $set: set }, { returnDocument: "before" }).lean<OrderDoc>();
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    // Already owns it (e.g. paid twice in two tabs): refund this one.
    const claimed = await Order.findOneAndUpdate(
      { _id: orderId, status: { $in: ["pending", "expired"] } },
      { $set: { status: "cancelled", ...(payment.paymentId ? { "payment.paymentId": payment.paymentId, "payment.paidAt": new Date() } : {}) } },
    ).lean<OrderDoc>();
    if (!claimed) return { result: "already_paid" };
    const refunded = await refundOrderPayment(claimed._id, payment.paymentId);
    logger.warn("store.duplicate_payment", { order: orderId, refunded });
    return { result: refunded ? "refunded" : "rejected", reason: "duplicate" };
  }
  if (!before) return { result: "already_paid" };

  const product = await Product.findByIdAndUpdate(before.product, { $inc: { salesCount: 1 } }, { returnDocument: "after" }).lean<ProductDoc>();
  logger.info("store.order_paid", { order: orderId, provider: payment.provider });
  const newPassword = await ensureAccountPassword(before.student);
  if (product) {
    const mail = orderConfirmedEmail({ name: before.name, email: before.email, product: { title: product.title, price: before.amount }, libraryUrl: absoluteUrl("/account?tab=library"), loginUrl: absoluteUrl("/account/login?next=/account?tab=library"), newPassword });
    await sendEmail({ to: before.email, toName: before.name, kind: "order_confirmed", ...mail });
    const adminEmail = await adminNotifyEmail();
    if (adminEmail) {
      await sendEmail({ to: adminEmail, kind: "admin_new_order", replyTo: before.email, ...adminNewOrderEmail({ name: before.name, email: before.email, phone: before.phone ?? "", product: product.title, amount: payment.provider === "free" ? 0 : before.amount, adminUrl: absoluteUrl("/admin/payments") }) });
    }
  }
  return { result: "paid", newAccount: Boolean(newPassword) };
}

async function refundOrderPayment(orderId: Types.ObjectId | string, paymentId?: string) {
  if (!paymentId) return false;
  const ok = paymentId.startsWith("pay_demo_") ? true : await refundPayment(paymentId);
  if (ok) await Order.updateOne({ _id: orderId }, { $set: { "payment.refundedAt": new Date() } });
  return ok;
}

export function orderConfirmationError(outcome: OrderOutcome) {
  if (outcome.result !== "refunded" && outcome.result !== "rejected") return null;
  const money = outcome.result === "refunded" ? "This extra payment has been refunded and will reach you in 5–7 days." : "This extra payment will be refunded. We'll be in touch by email.";
  return new ApiError(409, `You already own this product, so it wasn't needed. ${money}`, "duplicate");
}

export async function findOrderByPaymentOrderId(paymentOrderId: string) {
  await connectDB();
  return Order.findOne({ "payment.orderId": paymentOrderId }).lean<OrderDoc>();
}

/** Checkout closed without paying. A payment that still arrives is confirmed normally. */
export async function abandonOrder(orderId: string, paymentOrderId: string) {
  if (!Types.ObjectId.isValid(orderId)) return false;
  await connectDB();
  const r = await Order.updateOne({ _id: orderId, status: "pending", "payment.orderId": paymentOrderId }, { $set: { status: "expired" } });
  return r.modifiedCount > 0;
}

/** Admin: cancel a paid order and refund it (the buyer loses access). */
export async function cancelOrder(orderId: string, opts: { refund: boolean }) {
  if (!Types.ObjectId.isValid(orderId)) throw notFound("Order not found");
  await connectDB();
  const o = await Order.findOneAndUpdate({ _id: orderId, status: "paid" }, { $set: { status: "cancelled" } }, { returnDocument: "before" }).lean<OrderDoc>();
  if (!o) throw badRequest("This order is not active.");
  await Product.updateOne({ _id: o.product, salesCount: { $gt: 0 } }, { $inc: { salesCount: -1 } });
  const paid = (o.payment?.provider === "razorpay" || o.payment?.provider === "demo") && o.payment.paymentId;
  return { refunded: opts.refund && paid ? await refundOrderPayment(o._id, o.payment!.paymentId!) : false };
}

/** Admin: refund a cancelled order that still holds the money. */
export async function refundCancelledOrder(orderId: string) {
  if (!Types.ObjectId.isValid(orderId)) throw notFound("Order not found");
  await connectDB();
  const o = await Order.findById(orderId).lean<OrderDoc>();
  if (!o) throw notFound("Order not found");
  if (o.status !== "cancelled") throw badRequest("Only cancelled orders can be refunded here. Cancel the order first.");
  if (o.payment?.refundedAt) throw badRequest("This payment was already refunded.");
  if (!o.payment?.paymentId || o.payment.provider === "free") throw badRequest("There's no payment to refund on this order.");
  return { refunded: await refundOrderPayment(o._id, o.payment.paymentId) };
}

/* ------------------------------------------------------------------ */
/* Student library + downloads                                         */
/* ------------------------------------------------------------------ */

function toLibraryItem(o: OrderDoc & { product?: unknown }): LibraryItemDTO {
  const p = o.product as unknown as ProductDoc | undefined;
  const populated = p && typeof p === "object" && "title" in p;
  return {
    orderId: String(o._id),
    status: o.status as "paid" | "cancelled",
    amount: o.amount,
    provider: (o.payment?.provider ?? "free") as LibraryItemDTO["provider"],
    paymentId: o.payment?.paymentId ?? undefined,
    paidAt: o.payment?.paidAt ? new Date(o.payment.paidAt).toISOString() : undefined,
    refundedAt: o.payment?.refundedAt ? new Date(o.payment.refundedAt).toISOString() : undefined,
    downloadCount: o.downloadCount ?? 0,
    product: populated
      ? { id: String(p._id), title: p.title, slug: p.slug, category: p.category ?? "Guide", coverImage: toImage(p.coverImage), deliveryType: (p.delivery?.type ?? "file") as "file" | "link", deliveryNote: deliveryNote(p) }
      : undefined,
  };
}

export async function listStudentOrders(studentId: Types.ObjectId | string) {
  await connectDB();
  const docs = await Order.find({ student: studentId, status: { $in: ["paid", "cancelled"] }, "payment.paidAt": { $ne: null } }).sort({ createdAt: -1 }).populate("product").lean();
  const items = (docs as unknown as OrderDoc[]).map(toLibraryItem);
  const owned = items.filter((i) => i.status === "paid" && !i.refundedAt && i.product);
  if (!owned.length) return items;
  const reviews = await ProductReview.find({ order: { $in: owned.map((i) => i.orderId) } }).select("order rating").lean<{ order: Types.ObjectId; rating: number }[]>();
  const ratingByOrder = new Map(reviews.map((r) => [String(r.order), r.rating]));
  await Promise.all(
    owned.map(async (i) => {
      i.rating = ratingByOrder.get(i.orderId);
      const token = await ensureOrderFeedbackToken(i.orderId).catch(() => null);
      if (token) i.feedbackUrl = feedbackUrl(token);
    }),
  );
  return items;
}

export async function getStudentOrder(studentId: Types.ObjectId | string, orderId: string) {
  if (!Types.ObjectId.isValid(orderId)) return null;
  await connectDB();
  const doc = await Order.findOne({ _id: orderId, student: studentId, status: { $in: ["paid", "cancelled"] } }).populate("product").lean();
  return doc ? { ...toLibraryItem(doc as unknown as OrderDoc), name: (doc as unknown as OrderDoc).name, email: (doc as unknown as OrderDoc).email, phone: (doc as unknown as OrderDoc).phone ?? "" } : null;
}

/**
 * What a buyer gets when they click Download: a file stream or the link.
 * Only for the owner's own paid (not refunded) order.
 */
export async function openDownload(studentId: Types.ObjectId | string, orderId: string) {
  if (!Types.ObjectId.isValid(orderId)) return null;
  await connectDB();
  const o = await Order.findOne({ _id: orderId, student: studentId, status: "paid" }).lean<OrderDoc>();
  if (!o || o.payment?.refundedAt) return null;
  const p = await Product.findById(o.product).lean<ProductDoc>();
  if (!p) return null;
  await Order.updateOne({ _id: o._id }, { $inc: { downloadCount: 1 }, $set: { lastDownloadAt: new Date() } });
  if (p.delivery?.type === "link") return p.delivery.url ? { kind: "link" as const, url: p.delivery.url } : null;
  if (!p.delivery?.fileId) return null;
  const stream = fileBucket().openDownloadStream(p.delivery.fileId);
  return {
    kind: "file" as const,
    stream: Readable.toWeb(stream) as unknown as ReadableStream,
    fileName: p.delivery.fileName ?? "download",
    contentType: p.delivery.contentType ?? "application/octet-stream",
    size: p.delivery.fileSize ?? undefined,
  };
}
