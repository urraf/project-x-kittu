import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

/* ------------------------------------------------------------------ */
/* MentorSession: one scheduled group session (fixed date & time)     */
/* ------------------------------------------------------------------ */

const MentorSessionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    summary: { type: String, trim: true, maxlength: 300, default: "" },
    description: { type: String, trim: true, maxlength: 5000, default: "" },
    highlights: { type: [{ type: String, trim: true, maxlength: 160 }], default: [] },
    startsAt: { type: Date, required: true },
    durationMin: { type: Number, required: true, min: 10, max: 600 },
    /** Price in INR (whole rupees). 0 = free. */
    price: { type: Number, required: true, min: 0, max: 1_000_000, default: 0 },
    capacity: { type: Number, required: true, min: 1, max: 1000 },
    seatsTaken: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["draft", "published", "cancelled"], default: "draft" },
    meeting: {
      provider: { type: String, enum: ["google", "jitsi", "manual"], default: "jitsi" },
      url: { type: String, trim: true, maxlength: 2048 },
      googleEventId: String,
    },
    reminderSentAt: Date,
    feedbackSentAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true },
);
MentorSessionSchema.index({ status: 1, startsAt: 1 });
export type MentorSessionDoc = InferSchemaType<typeof MentorSessionSchema> & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };
export const MentorSession: Model<InferSchemaType<typeof MentorSessionSchema>> =
  models.MentorSession || model("MentorSession", MentorSessionSchema);

/* ------------------------------------------------------------------ */
/* Student: created on sign-up, or automatically on the first booking  */
/* ------------------------------------------------------------------ */

const StudentSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 200 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    /** scrypt hash. Missing until the first confirmed booking or sign-up. */
    passwordHash: { type: String, select: false },
    passwordSetAt: Date,
    emailVerifiedAt: Date,
    /** Bumped on every password change so old sign-in cookies stop working. */
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: Date,
  },
  { timestamps: true },
);
export type StudentDoc = InferSchemaType<typeof StudentSchema> & { _id: Types.ObjectId; createdAt: Date };
export const Student: Model<InferSchemaType<typeof StudentSchema>> = models.Student || model("Student", StudentSchema);

/* ------------------------------------------------------------------ */
/* Booking: a student's seat in a session                              */
/* ------------------------------------------------------------------ */

const BookingSchema = new Schema(
  {
    session: { type: Schema.Types.ObjectId, ref: "MentorSession", required: true },
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    notes: { type: String, trim: true, maxlength: 1500, default: "" },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["pending", "confirmed", "cancelled", "expired"], default: "pending" },
    /** A seat is held while payment is in progress; released if it expires. */
    holdExpiresAt: Date,
    payment: {
      provider: { type: String, enum: ["razorpay", "demo", "free"] },
      orderId: { type: String, index: true, sparse: true },
      paymentId: String,
      paidAt: Date,
      refundedAt: Date,
    },
    confirmedAt: Date,
    /** Unique, unguessable token for the no-login feedback link. */
    feedbackToken: { type: String, unique: true, sparse: true, select: false },
    reminderSentAt: Date,
    feedbackSentAt: Date,
    ipHash: { type: String, select: false },
  },
  { timestamps: true },
);
BookingSchema.index({ session: 1, status: 1 });
BookingSchema.index({ student: 1, createdAt: -1 });
BookingSchema.index({ status: 1, holdExpiresAt: 1 });
BookingSchema.index({ session: 1, email: 1 }, { unique: true, partialFilterExpression: { status: "confirmed" }, name: "one_confirmed_seat_per_email" });
export type BookingDoc = InferSchemaType<typeof BookingSchema> & { _id: Types.ObjectId; createdAt: Date };
export const Booking: Model<InferSchemaType<typeof BookingSchema>> = models.Booking || model("Booking", BookingSchema);

/* ------------------------------------------------------------------ */
/* Review: star rating + text left via the feedback link               */
/* ------------------------------------------------------------------ */

const ReviewSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    session: { type: Schema.Types.ObjectId, ref: "MentorSession", required: true },
    student: { type: Schema.Types.ObjectId, ref: "Student" },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, trim: true, maxlength: 2000, default: "" },
    status: { type: String, enum: ["visible", "hidden"], default: "visible" },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);
ReviewSchema.index({ status: 1, featured: -1, createdAt: -1 });
export type ReviewDoc = InferSchemaType<typeof ReviewSchema> & { _id: Types.ObjectId; createdAt: Date };
export const Review: Model<InferSchemaType<typeof ReviewSchema>> = models.Review || model("Review", ReviewSchema);

/* ------------------------------------------------------------------ */
/* StudentOtp: 6-digit email codes for sign-up and password reset      */
/* ------------------------------------------------------------------ */

const StudentOtpSchema = new Schema({
  _id: { type: String, required: true }, // `${purpose}:${email}`, so one live code per email & purpose
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  /** Sign-up details waiting for the code (the password is already hashed). */
  data: { name: String, phone: String, passwordHash: String },
});
StudentOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const StudentOtp: Model<InferSchemaType<typeof StudentOtpSchema>> = models.StudentOtp || model("StudentOtp", StudentOtpSchema);

/* ------------------------------------------------------------------ */
/* EmailLog: every email we try to send (for delivery troubleshooting) */
/* ------------------------------------------------------------------ */

const EmailLogSchema = new Schema(
  {
    to: { type: String, required: true },
    subject: { type: String, required: true },
    kind: { type: String, required: true },
    status: { type: String, enum: ["sent", "failed", "skipped"], required: true },
    provider: String,
    error: { type: String, maxlength: 1000 },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 90 * 86400_000) },
  },
  { timestamps: true },
);
EmailLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
EmailLogSchema.index({ createdAt: -1 });
export const EmailLog: Model<InferSchemaType<typeof EmailLogSchema>> = models.EmailLog || model("EmailLog", EmailLogSchema);

/* ------------------------------------------------------------------ */
/* TaskLock: prevents background tasks from running concurrently      */
/* ------------------------------------------------------------------ */

const TaskLockSchema = new Schema({
  _id: { type: String, required: true },
  lockedUntil: { type: Date, required: true },
  lastRunAt: Date,
});
export const TaskLock: Model<InferSchemaType<typeof TaskLockSchema>> = models.TaskLock || model("TaskLock", TaskLockSchema);
