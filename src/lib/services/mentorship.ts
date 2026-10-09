import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import {
  AdminAccount,
  Booking,
  MentorSession,
  Review,
  Student,
  TaskLock,
  type BookingDoc,
  type MentorSessionDoc,
  type ReviewDoc,
} from "@/lib/models";
import { env } from "@/lib/env";
import { ApiError, badRequest, conflict, notFound } from "@/lib/http";
import { logger } from "@/lib/logger";
import { absoluteUrl } from "@/lib/site";
import { sanitizePlain } from "@/lib/content/html";
import { slugify } from "@/lib/utils/text";
import { fromIstInputs, sessionEnd } from "@/lib/utils/session-time";
import { sendEmail } from "@/lib/services/email";
import { getSettings } from "@/lib/services/settings";
import { createRazorpayOrder, paymentMode, refundPayment } from "@/lib/services/razorpay";
import { ensureAccountPassword } from "@/lib/services/student-account";
import { addGoogleGuest, cancelGoogleEvent, createMeeting, updateGoogleEvent } from "@/lib/services/meet";
import {
  adminNewBookingEmail,
  bookingConfirmedEmail,
  feedbackRequestEmail,
  reminderEmail,
  sessionCancelledEmail,
} from "@/lib/email/templates";
import type { AdminMentorSessionDTO, BookingDTO, MentorSessionDTO, MentorStats, ReviewDTO } from "@/lib/types";

const HOLD_MINUTES = 15;

/* ================================================================== */
/* Mapping                                                            */
/* ================================================================== */

export function toSessionDTO(s: MentorSessionDoc): MentorSessionDTO {
  const now = Date.now();
  const start = new Date(s.startsAt).getTime();
  return {
    id: String(s._id),
    title: s.title,
    slug: s.slug,
    summary: s.summary ?? "",
    description: s.description ?? "",
    highlights: s.highlights ?? [],
    startsAt: new Date(s.startsAt).toISOString(),
    durationMin: s.durationMin,
    price: s.price ?? 0,
    capacity: s.capacity,
    seatsTaken: s.seatsTaken ?? 0,
    seatsLeft: Math.max(0, s.capacity - (s.seatsTaken ?? 0)),
    status: (s.status ?? "draft") as MentorSessionDTO["status"],
    started: start <= now,
    ended: sessionEnd(s.startsAt, s.durationMin).getTime() <= now,
  };
}

function toBookingDTO(b: BookingDoc & { session?: unknown }, extra: Partial<BookingDTO> = {}): BookingDTO {
  const s = b.session as unknown as MentorSessionDoc | undefined;
  const populated = s && typeof s === "object" && "title" in s;
  return {
    id: String(b._id),
    name: b.name,
    email: b.email,
    phone: b.phone ?? "",
    notes: b.notes ?? "",
    amount: b.amount,
    status: b.status as BookingDTO["status"],
    paidAt: b.payment?.paidAt ? new Date(b.payment.paidAt).toISOString() : undefined,
    paymentId: b.payment?.paymentId ?? undefined,
    paymentProvider: (b.payment?.provider ?? undefined) as BookingDTO["paymentProvider"],
    refundedAt: b.payment?.refundedAt ? new Date(b.payment.refundedAt).toISOString() : undefined,
    createdAt: new Date(b.createdAt).toISOString(),
    session: populated
      ? {
          id: String(s._id),
          title: s.title,
          slug: s.slug,
          startsAt: new Date(s.startsAt).toISOString(),
          durationMin: s.durationMin,
          meetingUrl: b.status === "confirmed" ? (s.meeting?.url ?? undefined) : undefined,
          ended: sessionEnd(s.startsAt, s.durationMin).getTime() <= Date.now(),
          status: s.status ?? "published",
        }
      : undefined,
    ...extra,
  };
}

function toReviewDTO(r: ReviewDoc & { session?: unknown }): ReviewDTO {
  const s = r.session as { title?: string } | undefined;
  return {
    id: String(r._id),
    name: r.name,
    rating: r.rating,
    text: r.text ?? "",
    createdAt: new Date(r.createdAt).toISOString(),
    sessionTitle: s && typeof s === "object" ? s.title : undefined,
    status: (r.status ?? "visible") as ReviewDTO["status"],
    featured: Boolean(r.featured),
  };
}

const feedbackUrl = (token: string) => absoluteUrl(`/feedback/${token}`);

async function adminNotifyEmail() {
  const settings = await getSettings();
  if (settings.mentorship.notifyEmail) return settings.mentorship.notifyEmail;
  const account = await AdminAccount.findOne({ key: "admin" }).select("email").lean<{ email?: string }>();
  return account?.email || env.adminEmail || null;
}

/* ================================================================== */
/* Public reads                                                       */
/* ================================================================== */

/** Upcoming (or currently running) published sessions, soonest first. */
export async function listUpcomingSessions(limit = 20) {
  await connectDB();
  await releaseExpiredHolds();
  const docs = await MentorSession.find({ status: "published", startsAt: { $gt: new Date(Date.now() - 3 * 3600_000) } })
    .sort({ startsAt: 1 })
    .limit(limit * 2)
    .lean<MentorSessionDoc[]>();
  return docs.map(toSessionDTO).filter((s) => !s.ended).slice(0, limit);
}

export async function getPublicSessionBySlug(slug: string) {
  await connectDB();
  await releaseExpiredHolds();
  const doc = await MentorSession.findOne({ slug, status: { $in: ["published", "cancelled"] } }).lean<MentorSessionDoc>();
  return doc ? toSessionDTO(doc) : null;
}

export async function getMentorStats(): Promise<MentorStats> {
  await connectDB();
  const settings = await getSettings();
  const now = new Date();
  const [ended, ratings] = await Promise.all([
    MentorSession.find({ status: "published", startsAt: { $lt: now }, seatsTaken: { $gt: 0 } }).select("_id startsAt durationMin").lean<MentorSessionDoc[]>(),
    Review.aggregate<{ avg: number; count: number }>([{ $match: { status: "visible" } }, { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }]),
  ]);
  const endedIds = ended.filter((s) => sessionEnd(s.startsAt, s.durationMin) <= now).map((s) => s._id);
  const students = endedIds.length ? await Booking.countDocuments({ session: { $in: endedIds }, status: "confirmed" }) : 0;
  return {
    sessions: endedIds.length + settings.mentorship.pastSessions,
    students: students + settings.mentorship.pastStudents,
    avgRating: ratings[0] ? Math.round(ratings[0].avg * 10) / 10 : 0,
    reviewCount: ratings[0]?.count ?? 0,
  };
}

export async function listPublicReviews(limit = 24) {
  await connectDB();
  const docs = await Review.find({ status: "visible" }).sort({ featured: -1, createdAt: -1 }).limit(limit).populate("session", "title").lean();
  return (docs as unknown as ReviewDoc[]).map(toReviewDTO);
}

/* ================================================================== */
/* Booking                                                            */
/* ================================================================== */

export const bookingInputSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().toLowerCase().max(200).pipe(z.email("Enter a valid email address")),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((p) => /^[+\d][\d\s-]{6,}$/.test(p), "Enter a valid phone number"),
  notes: z.string().trim().max(1500).default(""),
  captchaToken: z.string().min(10, "Please answer the math question").max(2000),
  captchaAnswer: z.union([z.string(), z.number()]).refine((v) => String(v).trim() !== "", "Please answer the math question"),
  website: z.string().max(500).optional(),
});

/** Releases seats held by bookings whose payment window expired. */
export async function releaseExpiredHolds() {
  const expired = await Booking.find({ status: "pending", holdExpiresAt: { $lt: new Date() } }).select("_id session").limit(200).lean<BookingDoc[]>();
  for (const b of expired) {
    const changed = await Booking.findOneAndUpdate({ _id: b._id, status: "pending" }, { $set: { status: "expired" } });
    if (changed) await MentorSession.updateOne({ _id: b.session, seatsTaken: { $gt: 0 } }, { $inc: { seatsTaken: -1 } });
  }
}

type PaymentProvider = "razorpay" | "demo" | "free";
const DEMO_PAYMENT_PREFIX = "pay_demo_";

/** True when money (real or demo) was taken for this booking. */
const isPaid = (p?: { provider?: string | null; paymentId?: string | null } | null) => (p?.provider === "razorpay" || p?.provider === "demo") && Boolean(p.paymentId);

/** Full refund (simulated for demo payments); remembers it on the booking so the admin can see it. */
async function refundBooking(bookingId: Types.ObjectId | string, paymentId: string) {
  const ok = paymentId.startsWith(DEMO_PAYMENT_PREFIX) ? true : await refundPayment(paymentId);
  if (ok) await Booking.updateOne({ _id: bookingId }, { $set: { "payment.refundedAt": new Date() } });
  return ok;
}

export type BookingStart =
  | { bookingId: string; status: "confirmed"; newAccount: boolean }
  | {
      bookingId: string;
      status: "payment_required";
      /** true = practice checkout, no real money */
      demo: boolean;
      razorpay: { keyId: string; orderId: string; amount: number; currency: "INR"; name: string; description: string; prefill: { name: string; email: string; contact: string } };
    };

export async function startBooking(sessionId: string, input: z.infer<typeof bookingInputSchema>, meta: { ip: string }): Promise<BookingStart> {
  if (!Types.ObjectId.isValid(sessionId)) throw notFound("Session not found");
  await connectDB();
  await releaseExpiredHolds();

  const session = await MentorSession.findById(sessionId).lean<MentorSessionDoc>();
  if (!session || session.status !== "published") throw notFound("This session isn't available.");
  if (new Date(session.startsAt) <= new Date()) throw badRequest("Booking for this session has closed.");

  const email = input.email;
  if (await Booking.exists({ session: sessionId, email, status: "confirmed" })) {
    throw conflict("You've already booked this session. Check your email for the details.");
  }

  const student = await Student.findOneAndUpdate(
    { email },
    { $setOnInsert: { email, name: sanitizePlain(input.name), phone: input.phone } },
    { upsert: true, returnDocument: "after" },
  ).lean<{ _id: Types.ObjectId }>();

  // Hold a seat atomically: never more seats than capacity.
  const held = await MentorSession.findOneAndUpdate(
    { _id: sessionId, status: "published", startsAt: { $gt: new Date() }, $expr: { $lt: ["$seatsTaken", "$capacity"] } },
    { $inc: { seatsTaken: 1 } },
  );
  if (!held) throw conflict("Sorry, this session just filled up.");

  const booking = await Booking.create({
    session: sessionId,
    student: student!._id,
    name: sanitizePlain(input.name),
    email,
    phone: input.phone,
    notes: sanitizePlain(input.notes),
    amount: session.price,
    status: "pending",
    holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000),
    feedbackToken: randomBytes(24).toString("base64url"),
    ipHash: createHash("sha256").update(meta.ip).digest("hex").slice(0, 32),
  });

  if (!session.price) {
    const outcome = await confirmBooking(String(booking._id), { provider: "free" });
    return { bookingId: String(booking._id), status: "confirmed", newAccount: outcome.result === "confirmed" && Boolean(outcome.newAccount) };
  }

  try {
    const demo = paymentMode() === "demo";
    const order = demo
      ? { orderId: `order_demo_${randomBytes(8).toString("hex")}`, amountPaise: session.price * 100 }
      : await createRazorpayOrder({ amountRupees: session.price, receipt: `bk_${booking._id}`, notes: { bookingId: String(booking._id), session: session.title.slice(0, 200) } });
    await Booking.updateOne({ _id: booking._id }, { $set: { payment: { provider: demo ? "demo" : "razorpay", orderId: order.orderId } } });
    return {
      bookingId: String(booking._id),
      status: "payment_required",
      demo,
      razorpay: {
        keyId: demo ? "demo" : env.razorpayKeyId!,
        orderId: order.orderId,
        amount: order.amountPaise,
        currency: "INR",
        name: "Life of KittuKun",
        description: session.title.slice(0, 250),
        prefill: { name: input.name, email, contact: input.phone },
      },
    };
  } catch (err) {
    // Give the seat back if the payment couldn't start.
    await Booking.updateOne({ _id: booking._id }, { $set: { status: "expired" } });
    await MentorSession.updateOne({ _id: sessionId, seatsTaken: { $gt: 0 } }, { $inc: { seatsTaken: -1 } });
    throw err;
  }
}

/**
 * Confirms a booking exactly once (safe to call from the browser callback and
 * the webhook). Sends the confirmation emails and calendar invite.
 */
export type ConfirmOutcome =
  | { result: "confirmed"; newAccount?: boolean }
  | { result: "already_confirmed" }
  | { result: "refunded" | "rejected"; reason: "session_cancelled" | "duplicate" };

export async function confirmBooking(bookingId: string, payment: { provider: PaymentProvider; paymentId?: string }): Promise<ConfirmOutcome> {
  await connectDB();
  const pending = await Booking.findOne({ _id: bookingId, status: { $in: ["pending", "expired"] } }).lean<BookingDoc>();
  if (!pending) return { result: "already_confirmed" };

  // Money must never be kept for a seat we can't give: refund instead.
  const reject = async (reason: "session_cancelled" | "duplicate"): Promise<ConfirmOutcome> => {
    const claimed = await Booking.findOneAndUpdate(
      { _id: bookingId, status: { $in: ["pending", "expired"] } },
      { $set: { status: "cancelled", ...(payment.paymentId ? { "payment.paymentId": payment.paymentId, "payment.paidAt": new Date() } : {}) }, $unset: { holdExpiresAt: 1 } },
    ).lean<BookingDoc>();
    if (!claimed) return { result: "already_confirmed" };
    if (claimed.status === "pending") await MentorSession.updateOne({ _id: claimed.session, seatsTaken: { $gt: 0 } }, { $inc: { seatsTaken: -1 } });
    const refunded = isPaid(payment) ? await refundBooking(claimed._id, payment.paymentId!) : false;
    logger.warn("booking.rejected_after_payment", { booking: bookingId, reason, refunded });
    return { result: refunded ? "refunded" : "rejected", reason };
  };

  const current = await MentorSession.findById(pending.session).select("status").lean<MentorSessionDoc>();
  if (!current || current.status === "cancelled") return reject("session_cancelled");

  let before: BookingDoc | null;
  try {
    before = await Booking.findOneAndUpdate(
      { _id: bookingId, status: { $in: ["pending", "expired"] } },
      {
        $set: {
          status: "confirmed",
          confirmedAt: new Date(),
          "payment.provider": payment.provider,
          ...(payment.paymentId ? { "payment.paymentId": payment.paymentId, "payment.paidAt": new Date() } : {}),
        },
        $unset: { holdExpiresAt: 1 },
      },
      { returnDocument: "before" },
    ).lean<BookingDoc>();
  } catch (err) {
    // Same email already holds a confirmed seat (e.g. paid twice in two tabs).
    if ((err as { code?: number }).code === 11000) return reject("duplicate");
    throw err;
  }

  if (!before) return { result: "already_confirmed" };
  // Payment landed after the hold expired: they paid, so they get the seat (may exceed capacity by one).
  if (before.status === "expired") await MentorSession.updateOne({ _id: before.session }, { $inc: { seatsTaken: 1 } });

  const session = await MentorSession.findById(before.session).lean<MentorSessionDoc>();
  if (!session) return { result: "confirmed" };
  logger.info("booking.confirmed", { booking: bookingId, session: String(session._id), provider: payment.provider });

  const card = { title: session.title, startsAt: session.startsAt, durationMin: session.durationMin, price: session.price, meetingUrl: session.meeting?.url };
  // First confirmed booking for this email: the account gets a password, sent in this email.
  const newPassword = await ensureAccountPassword(before.student);
  const confirmMail = bookingConfirmedEmail({ name: before.name, email: before.email, session: card, loginUrl: absoluteUrl("/account/login"), newPassword });
  await sendEmail({ to: before.email, toName: before.name, kind: "booking_confirmed", ...confirmMail });

  const adminEmail = await adminNotifyEmail();
  if (adminEmail) {
    const mail = adminNewBookingEmail({
      session: card,
      name: before.name,
      email: before.email,
      phone: before.phone ?? "",
      notes: before.notes ?? "",
      amount: payment.provider === "free" ? 0 : before.amount,
      seatsLeft: Math.max(0, session.capacity - (session.seatsTaken ?? 0)),
      adminUrl: absoluteUrl(`/admin/sessions/${session._id}`),
    });
    await sendEmail({ to: adminEmail, kind: "admin_new_booking", replyTo: before.email, ...mail });
  }
  if (session.meeting?.googleEventId) await addGoogleGuest(session.meeting.googleEventId, before.email);
  return { result: "confirmed", newAccount: Boolean(newPassword) };
}

/**
 * The student closed the checkout without paying: free the seat now instead of
 * after the 15-minute hold. Needs the order id, which only that student has.
 * A payment that still lands later is handled by confirmBooking (it re-takes the seat).
 */
export async function abandonBooking(bookingId: string, orderId: string) {
  if (!Types.ObjectId.isValid(bookingId)) return false;
  await connectDB();
  const b = await Booking.findOneAndUpdate(
    { _id: bookingId, status: "pending", "payment.orderId": orderId },
    { $set: { status: "expired" }, $unset: { holdExpiresAt: 1 } },
  ).lean<BookingDoc>();
  if (b) await MentorSession.updateOne({ _id: b.session, seatsTaken: { $gt: 0 } }, { $inc: { seatsTaken: -1 } });
  return Boolean(b);
}

/** The error a student sees when their payment couldn't be turned into a seat (it was refunded instead). */
export function confirmationError(outcome: ConfirmOutcome) {
  if (outcome.result !== "refunded" && outcome.result !== "rejected") return null;
  const why = outcome.reason === "duplicate" ? "You already have a seat in this session" : "This session was cancelled";
  const money = outcome.result === "refunded" ? "Your payment has been refunded and will reach you in 5–7 days." : "Your payment will be refunded. We'll be in touch by email.";
  return new ApiError(409, `${why}, so this extra booking wasn't needed. ${money}`, outcome.reason);
}

export async function findBookingByOrderId(orderId: string) {
  await connectDB();
  return Booking.findOne({ "payment.orderId": orderId }).lean<BookingDoc>();
}

export async function getBookingConfirmation(bookingId: string) {
  if (!Types.ObjectId.isValid(bookingId)) return null;
  await connectDB();
  const b = await Booking.findById(bookingId).populate("session").lean();
  return b ? toBookingDTO(b as unknown as BookingDoc) : null;
}

/* ================================================================== */
/* Student account                                                    */
/* ================================================================== */

export async function listStudentBookings(studentId: Types.ObjectId | string) {
  await connectDB();
  const docs = (await Booking.find({ student: studentId, status: { $in: ["confirmed", "cancelled"] } })
    .select("+feedbackToken")
    .sort({ createdAt: -1 })
    .populate("session")
    .lean()) as unknown as (BookingDoc & { feedbackToken?: string })[];
  const reviews = await Review.find({ booking: { $in: docs.map((d) => d._id) } }).lean<ReviewDoc[]>();
  const byBooking = new Map(reviews.map((r) => [String(r.booking), r]));
  return docs.map((d) => {
    const r = byBooking.get(String(d._id));
    return toBookingDTO(d, {
      review: r ? { rating: r.rating, text: r.text ?? "" } : undefined,
      feedbackUrl: d.status === "confirmed" && d.feedbackToken ? feedbackUrl(d.feedbackToken) : undefined,
    });
  });
}

/* ================================================================== */
/* Feedback                                                           */
/* ================================================================== */

export const feedbackSchema = z.object({
  rating: z.number().int().min(1, "Choose a star rating").max(5),
  text: z.string().trim().max(2000).default(""),
  name: z.string().trim().min(2, "Add your name").max(100),
});

/** Finds the booking behind a feedback link. */
export async function getFeedbackContext(token: string) {
  if (!token || token.length > 100) return null;
  await connectDB();
  const booking = await Booking.findOne({ feedbackToken: token, status: "confirmed" }).populate("session").lean();
  if (!booking) return null;
  const b = booking as unknown as BookingDoc & { session: MentorSessionDoc };
  const review = await Review.findOne({ booking: b._id }).lean<ReviewDoc>();
  return {
    bookingId: String(b._id),
    name: b.name,
    session: { title: b.session.title, startsAt: new Date(b.session.startsAt).toISOString(), durationMin: b.session.durationMin, started: new Date(b.session.startsAt) <= new Date() },
    review: review ? { rating: review.rating, text: review.text ?? "", name: review.name } : null,
  };
}

export async function submitFeedback(token: string, raw: unknown) {
  const input = feedbackSchema.parse(raw);
  await connectDB();
  const b = (await Booking.findOne({ feedbackToken: token, status: "confirmed" }).populate("session").lean()) as unknown as
    | (BookingDoc & { session: MentorSessionDoc })
    | null;
  if (!b) throw notFound("This feedback link isn't valid.");
  if (new Date(b.session.startsAt) > new Date()) throw badRequest("You can leave feedback once the session has started.");
  await Review.updateOne(
    { booking: b._id },
    {
      $set: { rating: input.rating, text: sanitizePlain(input.text), name: sanitizePlain(input.name) },
      $setOnInsert: { session: b.session._id, student: b.student, status: "visible", featured: false },
    },
    { upsert: true },
  );
  logger.info("review.submitted", { booking: String(b._id), rating: input.rating });
}

/* ================================================================== */
/* Admin: sessions                                                    */
/* ================================================================== */

export const sessionInputSchema = z.object({
  title: z.string().trim().min(3, "Add a title").max(140),
  summary: z.string().trim().max(300).default(""),
  description: z.string().trim().max(5000).default(""),
  highlights: z.array(z.string().trim().min(1).max(160)).max(10).default([]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
  durationMin: z.coerce.number().int().min(10, "At least 10 minutes").max(600),
  price: z.coerce.number().int().min(0, "Price can't be negative").max(1_000_000),
  capacity: z.coerce.number().int().min(1, "At least 1 seat").max(1000),
  status: z.enum(["draft", "published"]).default("draft"),
  meetingMode: z.enum(["auto", "manual"]).default("auto"),
  meetingUrl: z
    .string()
    .trim()
    .max(2048)
    .refine((v) => v === "" || /^https:\/\//.test(v), "Meeting link must start with https://")
    .default(""),
});

async function uniqueSessionSlug(base: string, excludeId?: string) {
  const root = slugify(base, 80);
  let candidate = root;
  for (let i = 2; await MentorSession.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); i++) candidate = `${root}-${i}`;
  return candidate;
}

async function toAdminDTO(s: MentorSessionDoc): Promise<AdminMentorSessionDTO> {
  const confirmed = await Booking.find({ session: s._id, status: "confirmed" }).select("amount payment").lean<BookingDoc[]>();
  return {
    ...toSessionDTO(s),
    meeting: { provider: (s.meeting?.provider ?? "manual") as AdminMentorSessionDTO["meeting"]["provider"], url: s.meeting?.url ?? "" },
    confirmedCount: confirmed.length,
    revenue: confirmed.reduce((sum, b) => sum + (isPaid(b.payment) ? b.amount : 0), 0),
    reminderSentAt: s.reminderSentAt ? new Date(s.reminderSentAt).toISOString() : undefined,
    feedbackSentAt: s.feedbackSentAt ? new Date(s.feedbackSentAt).toISOString() : undefined,
  };
}

export async function listAdminSessions(filter: "upcoming" | "past" | "all" = "all") {
  await connectDB();
  await releaseExpiredHolds();
  const now = new Date();
  const q = filter === "upcoming" ? { startsAt: { $gte: new Date(now.getTime() - 6 * 3600_000) } } : filter === "past" ? { startsAt: { $lt: now } } : {};
  const docs = await MentorSession.find(q).sort({ startsAt: filter === "past" ? -1 : 1 }).limit(200).lean<MentorSessionDoc[]>();
  return Promise.all(docs.map(toAdminDTO));
}

export async function getAdminSession(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDB();
  await releaseExpiredHolds();
  const s = await MentorSession.findById(id).lean<MentorSessionDoc>();
  if (!s) return null;
  const bookings = await Booking.find({ session: id, status: { $in: ["confirmed", "cancelled", "pending"] } }).sort({ createdAt: 1 }).lean<BookingDoc[]>();
  const reviews = await Review.find({ session: id }).lean<ReviewDoc[]>();
  const byBooking = new Map(reviews.map((r) => [String(r.booking), r]));
  return {
    session: await toAdminDTO(s),
    bookings: bookings.map((b) => {
      const r = byBooking.get(String(b._id));
      return toBookingDTO(b, { review: r ? { rating: r.rating, text: r.text ?? "" } : undefined });
    }),
  };
}

export async function createSession(raw: unknown) {
  const input = sessionInputSchema.parse(raw);
  await connectDB();
  const startsAt = fromIstInputs(input.date, input.time);
  const meeting =
    input.meetingMode === "manual" && input.meetingUrl
      ? { provider: "manual" as const, url: input.meetingUrl }
      : await createMeeting({ title: input.title, description: input.summary, startsAt, durationMin: input.durationMin });
  const doc = await MentorSession.create({
    title: sanitizePlain(input.title),
    slug: await uniqueSessionSlug(`${input.title} ${input.date}`),
    summary: sanitizePlain(input.summary),
    description: sanitizePlain(input.description),
    highlights: input.highlights.map(sanitizePlain),
    startsAt,
    durationMin: input.durationMin,
    price: input.price,
    capacity: input.capacity,
    status: input.status,
    meeting,
  });
  logger.info("session.created", { id: String(doc._id), meeting: meeting.provider });
  return toAdminDTO(doc.toObject() as MentorSessionDoc);
}

export async function updateSession(id: string, raw: unknown) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Session not found");
  const input = sessionInputSchema.parse(raw);
  await connectDB();
  const existing = await MentorSession.findById(id).lean<MentorSessionDoc>();
  if (!existing) throw notFound("Session not found");
  if (existing.status === "cancelled") throw badRequest("This session was cancelled and can't be edited. Duplicate it instead.");
  if (input.capacity < (existing.seatsTaken ?? 0)) throw badRequest(`${existing.seatsTaken} seats are already booked, so capacity can't be lower than that.`);

  const startsAt = fromIstInputs(input.date, input.time);
  let meeting = existing.meeting as { provider: "google" | "jitsi" | "manual"; url?: string; googleEventId?: string } | undefined;
  if (input.meetingMode === "manual" && input.meetingUrl) {
    meeting = { provider: "manual", url: input.meetingUrl, googleEventId: meeting?.googleEventId };
  } else if (input.meetingMode === "auto" && (!meeting?.url || meeting.provider === "manual")) {
    meeting = await createMeeting({ title: input.title, description: input.summary, startsAt, durationMin: input.durationMin });
  }

  const timeChanged = startsAt.getTime() !== new Date(existing.startsAt).getTime() || input.durationMin !== existing.durationMin;
  const doc = await MentorSession.findByIdAndUpdate(
    id,
    {
      $set: {
        title: sanitizePlain(input.title),
        summary: sanitizePlain(input.summary),
        description: sanitizePlain(input.description),
        highlights: input.highlights.map(sanitizePlain),
        startsAt,
        durationMin: input.durationMin,
        price: input.price,
        capacity: input.capacity,
        status: input.status,
        meeting,
        ...(timeChanged ? { reminderSentAt: null, feedbackSentAt: null } : {}),
      },
    },
    { returnDocument: "after", runValidators: true },
  ).lean<MentorSessionDoc>();
  if (meeting?.provider === "google" && meeting.googleEventId) {
    await updateGoogleEvent(meeting.googleEventId, { title: input.title, description: input.summary, startsAt, durationMin: input.durationMin });
  }
  return toAdminDTO(doc!);
}

export async function duplicateSession(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Session not found");
  await connectDB();
  const s = await MentorSession.findById(id).lean<MentorSessionDoc>();
  if (!s) throw notFound("Session not found");
  const startsAt = new Date(new Date(s.startsAt).getTime() + 7 * 86400_000);
  const meeting =
    s.meeting?.provider === "manual" && s.meeting.url
      ? { provider: "manual" as const, url: s.meeting.url }
      : await createMeeting({ title: s.title, description: s.summary ?? "", startsAt, durationMin: s.durationMin });
  const doc = await MentorSession.create({
    title: s.title,
    slug: await uniqueSessionSlug(`${s.title} ${startsAt.toISOString().slice(0, 10)}`),
    summary: s.summary,
    description: s.description,
    highlights: s.highlights,
    startsAt,
    durationMin: s.durationMin,
    price: s.price,
    capacity: s.capacity,
    status: "draft",
    meeting,
  });
  return toAdminDTO(doc.toObject() as MentorSessionDoc);
}

/** Cancels a session: refunds paid bookings, emails everyone, removes the calendar event. */
export async function cancelSession(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Session not found");
  await connectDB();
  const s = await MentorSession.findOneAndUpdate({ _id: id, status: { $ne: "cancelled" } }, { $set: { status: "cancelled", cancelledAt: new Date() } }, { returnDocument: "after" }).lean<MentorSessionDoc>();
  if (!s) throw badRequest("This session is already cancelled.");
  const bookings = await Booking.find({ session: id, status: "confirmed" }).lean<BookingDoc[]>();
  let refunded = 0;
  let refundFailed = 0;
  for (const b of bookings) {
    const paid = isPaid(b.payment);
    if (paid) {
      if (await refundBooking(b._id, b.payment!.paymentId!)) refunded++;
      else refundFailed++;
    }
    await Booking.updateOne({ _id: b._id }, { $set: { status: "cancelled" } });
    const mail = sessionCancelledEmail({ name: b.name, session: { title: s.title, startsAt: s.startsAt, durationMin: s.durationMin, price: s.price }, paid });
    await sendEmail({ to: b.email, toName: b.name, kind: "session_cancelled", ...mail });
  }
  if (s.meeting?.googleEventId) await cancelGoogleEvent(s.meeting.googleEventId);
  logger.info("session.cancelled", { id, notified: bookings.length, refunded, refundFailed });
  return { notified: bookings.length, refunded, refundFailed };
}

export async function deleteSession(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Session not found");
  await connectDB();
  if (await Booking.exists({ session: id, status: "confirmed" })) {
    throw new ApiError(409, "This session has bookings. Cancel it instead, so attendees are notified and refunded.", "has_bookings");
  }
  const s = await MentorSession.findByIdAndDelete(id).lean<MentorSessionDoc>();
  if (!s) throw notFound("Session not found");
  await Booking.deleteMany({ session: id });
  if (s.meeting?.googleEventId) await cancelGoogleEvent(s.meeting.googleEventId);
}

/** Admin cancels one booking (optionally refunding it) and frees the seat. */
export async function cancelBooking(bookingId: string, opts: { refund: boolean }) {
  if (!Types.ObjectId.isValid(bookingId)) throw notFound("Booking not found");
  await connectDB();
  const b = await Booking.findOneAndUpdate({ _id: bookingId, status: { $in: ["confirmed", "pending"] } }, { $set: { status: "cancelled" } }, { returnDocument: "before" }).lean<BookingDoc>();
  if (!b) throw badRequest("This booking is already cancelled.");
  await MentorSession.updateOne({ _id: b.session, seatsTaken: { $gt: 0 } }, { $inc: { seatsTaken: -1 } });
  let refunded = false;
  if (opts.refund && isPaid(b.payment)) refunded = await refundBooking(b._id, b.payment!.paymentId!);
  return { refunded };
}

/** Sends the feedback request now (e.g. if the admin ended early). */
export async function sendFeedbackRequestsNow(sessionId: string) {
  await connectDB();
  const s = await MentorSession.findById(sessionId).lean<MentorSessionDoc>();
  if (!s) throw notFound("Session not found");
  const sent = await sendFeedbackForSession(s, { force: true });
  await MentorSession.updateOne({ _id: s._id }, { $set: { feedbackSentAt: new Date() } });
  return { sent };
}

/* ================================================================== */
/* Admin: reviews & overview                                          */
/* ================================================================== */

export async function listAdminReviews() {
  await connectDB();
  const docs = await Review.find().sort({ createdAt: -1 }).limit(300).populate("session", "title").lean();
  return (docs as unknown as ReviewDoc[]).map(toReviewDTO);
}

export async function updateReview(id: string, patch: { status?: "visible" | "hidden"; featured?: boolean }) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Review not found");
  await connectDB();
  const doc = await Review.findByIdAndUpdate(id, { $set: patch }, { returnDocument: "after" }).populate("session", "title").lean();
  if (!doc) throw notFound("Review not found");
  return toReviewDTO(doc as unknown as ReviewDoc);
}

export async function deleteReview(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound("Review not found");
  await connectDB();
  await Review.deleteOne({ _id: id });
}

export async function mentorshipOverview() {
  await connectDB();
  const now = new Date();
  const [upcoming, confirmed, revenueAgg, stats] = await Promise.all([
    MentorSession.countDocuments({ status: "published", startsAt: { $gt: now } }),
    Booking.countDocuments({ status: "confirmed" }),
    Booking.aggregate<{ total: number }>([{ $match: { status: "confirmed", "payment.provider": { $in: ["razorpay", "demo"] } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    getMentorStats(),
  ]);
  return { upcoming, bookings: confirmed, revenue: revenueAgg[0]?.total ?? 0, avgRating: stats.avgRating, reviewCount: stats.reviewCount };
}

/* ================================================================== */
/* Background tasks: reminders & feedback requests                    */
/* ================================================================== */

async function sendFeedbackForSession(s: MentorSessionDoc, opts: { force?: boolean } = {}) {
  const bookings = (await Booking.find({ session: s._id, status: "confirmed", ...(opts.force ? {} : { feedbackSentAt: null }) })
    .select("+feedbackToken")
    .lean()) as unknown as (BookingDoc & { feedbackToken?: string })[];
  let sent = 0;
  for (const b of bookings) {
    if (!b.feedbackToken) continue;
    const mail = feedbackRequestEmail({ name: b.name, session: { title: s.title, startsAt: s.startsAt, durationMin: s.durationMin, price: s.price }, feedbackUrl: feedbackUrl(b.feedbackToken) });
    if (await sendEmail({ to: b.email, toName: b.name, kind: "feedback_request", ...mail })) sent++;
    await Booking.updateOne({ _id: b._id }, { $set: { feedbackSentAt: new Date() } });
  }
  return sent;
}

/**
 * Runs due work: frees expired seat holds, sends 1-hour reminders and
 * post-session feedback requests. Safe to call often: a database lock makes
 * sure only one run happens at a time, at most every 2 minutes.
 */
export async function runDueTasks() {
  await connectDB();
  const now = new Date();
  const lock = await TaskLock.findOneAndUpdate(
    { _id: "mentorship", $or: [{ lockedUntil: { $lt: now } }, { lockedUntil: { $exists: false } }] },
    { $set: { lockedUntil: new Date(now.getTime() + 2 * 60_000), lastRunAt: now } },
    { upsert: true, returnDocument: "after" },
  ).catch((err: { code?: number }) => {
    if (err.code === 11000) return null; // someone else holds the lock
    throw err;
  });
  if (!lock) return { skipped: true };

  await releaseExpiredHolds();
  let reminders = 0;
  let feedback = 0;

  // Reminders: sessions starting within the next hour.
  const soon = await MentorSession.find({ status: "published", reminderSentAt: null, startsAt: { $gt: now, $lte: new Date(now.getTime() + 65 * 60_000) } }).lean<MentorSessionDoc[]>();
  for (const s of soon) {
    const bookings = await Booking.find({ session: s._id, status: "confirmed", reminderSentAt: null }).lean<BookingDoc[]>();
    for (const b of bookings) {
      const mail = reminderEmail({ name: b.name, session: { title: s.title, startsAt: s.startsAt, durationMin: s.durationMin, price: s.price, meetingUrl: s.meeting?.url } });
      if (await sendEmail({ to: b.email, toName: b.name, kind: "reminder", ...mail })) reminders++;
      await Booking.updateOne({ _id: b._id }, { $set: { reminderSentAt: new Date() } });
    }
    await MentorSession.updateOne({ _id: s._id }, { $set: { reminderSentAt: new Date() } });
  }

  // Feedback: sessions that ended (within the last 7 days).
  const recent = await MentorSession.find({ status: "published", feedbackSentAt: null, startsAt: { $lt: now, $gt: new Date(now.getTime() - 8 * 86400_000) } }).lean<MentorSessionDoc[]>();
  for (const s of recent) {
    if (sessionEnd(s.startsAt, s.durationMin) > now) continue;
    feedback += await sendFeedbackForSession(s);
    await MentorSession.updateOne({ _id: s._id }, { $set: { feedbackSentAt: new Date() } });
  }

  if (reminders || feedback) logger.info("tasks.mentorship", { reminders, feedback });
  return { skipped: false, reminders, feedback };
}
