import "server-only";
import { randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Booking, Order, Product, ProductReview, Review, type BookingDoc, type MentorSessionDoc, type OrderDoc, type ProductDoc } from "@/lib/models";
import { ApiError, badRequest, conflict, notFound } from "@/lib/http";
import { logger } from "@/lib/logger";
import { absoluteUrl } from "@/lib/site";
import { sanitizePlain } from "@/lib/content/html";
import { feedbackRequestEmail, productFeedbackEmail } from "@/lib/email/templates";
import { emailProvider, sendEmail } from "@/lib/services/email";

/**
 * One-time feedback links. Every session booking and every store purchase has
 * its own unguessable token (/feedback/<token>). The student can leave one
 * rating + review per booking or purchase; after that the link only says thanks.
 */

export const feedbackSchema = z.object({
  rating: z.number().int().min(1, "Choose a star rating").max(5),
  text: z.string().trim().max(2000).default(""),
  name: z.string().trim().min(2, "Add your name").max(100),
});

export const feedbackUrl = (token: string) => absoluteUrl(`/feedback/${token}`);
const newToken = () => randomBytes(24).toString("base64url");

type BookingWithSession = BookingDoc & { session: MentorSessionDoc; feedbackToken?: string };
type OrderWithProduct = OrderDoc & { product: ProductDoc; feedbackToken?: string };

export type FeedbackContext = {
  kind: "session" | "product";
  title: string;
  name: string;
  /** Session start (ISO) for session feedback. */
  startsAt?: string;
  durationMin?: number;
  /** Feedback opens once the session has started; purchases can be rated straight away. */
  open: boolean;
  /** Set once feedback has been given: the link can't be used again. */
  given: { rating: number; text: string } | null;
};

async function findByToken(token: string) {
  if (!token || token.length > 100) return null;
  await connectDB();
  const booking = (await Booking.findOne({ feedbackToken: token, status: "confirmed" }).populate("session").lean()) as unknown as BookingWithSession | null;
  if (booking?.session) return { kind: "session" as const, booking };
  const order = (await Order.findOne({ feedbackToken: token, status: "paid" }).populate("product").lean()) as unknown as OrderWithProduct | null;
  if (order?.product) return { kind: "product" as const, order };
  return null;
}

/** What the feedback page shows for a link, or null if the link isn't valid. */
export async function getFeedbackContext(token: string): Promise<FeedbackContext | null> {
  const found = await findByToken(token);
  if (!found) return null;
  if (found.kind === "session") {
    const b = found.booking;
    const review = await Review.findOne({ booking: b._id }).select("rating text").lean<{ rating: number; text?: string }>();
    return {
      kind: "session",
      title: b.session.title,
      name: b.name,
      startsAt: new Date(b.session.startsAt).toISOString(),
      durationMin: b.session.durationMin,
      open: new Date(b.session.startsAt) <= new Date(),
      given: review ? { rating: review.rating, text: review.text ?? "" } : null,
    };
  }
  const o = found.order;
  const review = await ProductReview.findOne({ order: o._id }).select("rating text").lean<{ rating: number; text?: string }>();
  return { kind: "product", title: o.product.title, name: o.name, open: true, given: review ? { rating: review.rating, text: review.text ?? "" } : null };
}

const ALREADY = "You've already shared feedback for this. Thank you!";

/** Saves the one and only review for this link. A second attempt is rejected. */
export async function submitFeedback(token: string, raw: unknown) {
  const input = feedbackSchema.parse(raw);
  const found = await findByToken(token);
  if (!found) throw notFound("This feedback link isn't valid.");
  const fields = { rating: input.rating, text: sanitizePlain(input.text), name: sanitizePlain(input.name), status: "visible" as const, featured: false };
  try {
    if (found.kind === "session") {
      const b = found.booking;
      if (new Date(b.session.startsAt) > new Date()) throw badRequest("You can leave feedback once the session has started.");
      if (await Review.exists({ booking: b._id })) throw conflict(ALREADY);
      await Review.create({ ...fields, booking: b._id, session: b.session._id, student: b.student });
      logger.info("review.submitted", { booking: String(b._id), rating: input.rating });
    } else {
      const o = found.order;
      if (await ProductReview.exists({ order: o._id })) throw conflict(ALREADY);
      await ProductReview.create({ ...fields, order: o._id, product: o.product._id, student: o.student });
      logger.info("product_review.submitted", { order: String(o._id), rating: input.rating });
    }
  } catch (err) {
    // Two tabs submitting at once: the unique index lets only one through.
    if ((err as { code?: number }).code === 11000) throw conflict(ALREADY);
    throw err;
  }
}

/** Returns the order's feedback token, creating one the first time. */
export async function ensureOrderFeedbackToken(orderId: Types.ObjectId | string) {
  const existing = await Order.findById(orderId).select("+feedbackToken").lean<{ feedbackToken?: string }>();
  if (existing?.feedbackToken) return existing.feedbackToken;
  const token = newToken();
  const updated = await Order.findOneAndUpdate({ _id: orderId, feedbackToken: { $exists: false } }, { $set: { feedbackToken: token } }, { returnDocument: "after" })
    .select("+feedbackToken")
    .lean<{ feedbackToken?: string }>();
  if (updated?.feedbackToken) return updated.feedbackToken;
  // Set by a parallel request in between: use theirs.
  return (await Order.findById(orderId).select("+feedbackToken").lean<{ feedbackToken?: string }>())?.feedbackToken ?? null;
}

async function ensureBookingFeedbackToken(booking: { _id: Types.ObjectId; feedbackToken?: string }) {
  if (booking.feedbackToken) return booking.feedbackToken;
  const token = newToken();
  await Booking.updateOne({ _id: booking._id, feedbackToken: { $exists: false } }, { $set: { feedbackToken: token } });
  return (await Booking.findById(booking._id).select("+feedbackToken").lean<{ feedbackToken?: string }>())?.feedbackToken ?? token;
}

export const sendFeedbackLinkSchema = z.object({ kind: z.enum(["session", "store"]), id: z.string().max(40) });

/** Admin: emails a student the one-time feedback link for one of their sessions or purchases. */
export async function sendFeedbackLink(studentId: string, raw: unknown) {
  const { kind, id } = sendFeedbackLinkSchema.parse(raw);
  if (!Types.ObjectId.isValid(studentId) || !Types.ObjectId.isValid(id)) throw notFound("Not found");
  if (!emailProvider()) throw new ApiError(503, "Email isn't set up yet, so this can't be sent. Add the email settings on the server first.", "email_not_configured");
  await connectDB();

  if (kind === "session") {
    const b = (await Booking.findOne({ _id: id, student: studentId, status: "confirmed" }).select("+feedbackToken").populate("session").lean()) as unknown as BookingWithSession | null;
    if (!b?.session) throw notFound("Booking not found");
    if (new Date(b.session.startsAt) > new Date()) throw badRequest("This session hasn't started yet. Send the feedback link after it.");
    if (await Review.exists({ booking: b._id })) throw conflict("This student has already given feedback for this session.");
    const token = await ensureBookingFeedbackToken(b);
    const mail = feedbackRequestEmail({ name: b.name, session: { title: b.session.title, startsAt: b.session.startsAt, durationMin: b.session.durationMin, price: b.session.price }, feedbackUrl: feedbackUrl(token) });
    if (!(await sendEmail({ to: b.email, toName: b.name, kind: "feedback_request", ...mail }))) throw new ApiError(502, "The email couldn't be sent. Try again in a moment.", "email_failed");
    await Booking.updateOne({ _id: b._id }, { $set: { feedbackSentAt: new Date() } });
    return { sent: true };
  }

  const o = (await Order.findOne({ _id: id, student: studentId, status: "paid" }).lean()) as unknown as OrderDoc | null;
  if (!o) throw notFound("Purchase not found");
  const product = await Product.findById(o.product).select("title").lean<{ title: string }>();
  if (!product) throw notFound("This product was deleted.");
  if (await ProductReview.exists({ order: o._id })) throw conflict("This student has already given feedback for this purchase.");
  const token = await ensureOrderFeedbackToken(o._id);
  if (!token) throw new ApiError(500, "Couldn't create the feedback link. Try again.", "token_failed");
  const mail = productFeedbackEmail({ name: o.name, product: product.title, feedbackUrl: feedbackUrl(token) });
  if (!(await sendEmail({ to: o.email, toName: o.name, kind: "feedback_request", ...mail }))) throw new ApiError(502, "The email couldn't be sent. Try again in a moment.", "email_failed");
  await Order.updateOne({ _id: o._id }, { $set: { feedbackSentAt: new Date() } });
  return { sent: true };
}
