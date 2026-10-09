import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Booking, Review, Student, type BookingDoc, type MentorSessionDoc, type StudentDoc } from "@/lib/models";

// Mongoose 9 query typings are very strict; these dynamic filters are built from validated input.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Filter = Record<string, any>;

const PAGE_SIZE = 50;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Bookings where money was taken (real or demo). */
const PAID: Filter = { amount: { $gt: 0 }, "payment.paidAt": { $ne: null }, "payment.provider": { $in: ["razorpay", "demo"] } };

export type PaymentStatus = "paid" | "refunded" | "kept";

export type AdminPaymentDTO = {
  id: string;
  name: string;
  email: string;
  phone: string;
  amount: number;
  provider: "razorpay" | "demo";
  paymentId?: string;
  orderId?: string;
  paidAt: string;
  refundedAt?: string;
  /** paid = seat active, refunded = money returned, kept = booking cancelled but not refunded */
  status: PaymentStatus;
  session?: { id: string; title: string; startsAt: string };
};

export type PaymentFilters = { q?: string; status?: PaymentStatus | "all"; provider?: "razorpay" | "demo" | "all"; page?: number };

function statusOf(b: BookingDoc): PaymentStatus {
  if (b.payment?.refundedAt) return "refunded";
  return b.status === "cancelled" ? "kept" : "paid";
}

export async function listAdminPayments({ q = "", status = "all", provider = "all", page = 1 }: PaymentFilters) {
  await connectDB();
  const filter: Filter = { ...PAID };
  if (status === "paid") Object.assign(filter, { status: "confirmed", "payment.refundedAt": null });
  if (status === "refunded") filter["payment.refundedAt"] = { $ne: null };
  if (status === "kept") Object.assign(filter, { status: "cancelled", "payment.refundedAt": null });
  if (provider !== "all") filter["payment.provider"] = provider;
  const term = q.trim().slice(0, 100);
  if (term) {
    const rx = { $regex: escapeRegex(term), $options: "i" };
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { "payment.paymentId": rx }, { "payment.orderId": rx }];
  }
  const [docs, total] = await Promise.all([
    Booking.find(filter).sort({ "payment.paidAt": -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).populate("session", "title startsAt").lean(),
    Booking.countDocuments(filter),
  ]);
  const items: AdminPaymentDTO[] = (docs as unknown as (BookingDoc & { session?: MentorSessionDoc })[]).map((b) => ({
    id: String(b._id),
    name: b.name,
    email: b.email,
    phone: b.phone ?? "",
    amount: b.amount,
    provider: b.payment!.provider as "razorpay" | "demo",
    paymentId: b.payment?.paymentId ?? undefined,
    orderId: b.payment?.orderId ?? undefined,
    paidAt: new Date(b.payment!.paidAt!).toISOString(),
    refundedAt: b.payment?.refundedAt ? new Date(b.payment.refundedAt).toISOString() : undefined,
    status: statusOf(b),
    session: b.session && typeof b.session === "object" && "title" in b.session ? { id: String(b.session._id), title: b.session.title, startsAt: new Date(b.session.startsAt).toISOString() } : undefined,
  }));
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

type Totals = { collected: number; payments: number; refunded: number; refunds: number; net: number; thisMonth: number; kept: number; keptCount: number };

/** Money totals, real (Razorpay) and demo kept apart so practice payments never inflate revenue. */
export async function paymentsSummary(): Promise<{ real: Totals; demo: Totals }> {
  await connectDB();
  // Start of the current month in India time.
  const ist = new Date(Date.now() + 5.5 * 3600_000);
  const monthStart = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 5.5 * 3600_000);
  const rows = await Booking.aggregate<{ _id: string } & Omit<Totals, "net">>([
    { $match: PAID },
    {
      $group: {
        _id: "$payment.provider",
        collected: { $sum: "$amount" },
        payments: { $sum: 1 },
        refunded: { $sum: { $cond: [{ $ifNull: ["$payment.refundedAt", false] }, "$amount", 0] } },
        refunds: { $sum: { $cond: [{ $ifNull: ["$payment.refundedAt", false] }, 1, 0] } },
        thisMonth: {
          $sum: { $cond: [{ $and: [{ $gte: ["$payment.paidAt", monthStart] }, { $not: [{ $ifNull: ["$payment.refundedAt", false] }] }] }, "$amount", 0] },
        },
        kept: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "cancelled"] }, { $not: [{ $ifNull: ["$payment.refundedAt", false] }] }] }, "$amount", 0] } },
        keptCount: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "cancelled"] }, { $not: [{ $ifNull: ["$payment.refundedAt", false] }] }] }, 1, 0] } },
      },
    },
  ]);
  const empty: Totals = { collected: 0, payments: 0, refunded: 0, refunds: 0, net: 0, thisMonth: 0, kept: 0, keptCount: 0 };
  const pick = (p: string): Totals => {
    const r = rows.find((x) => x._id === p);
    return r ? { ...empty, ...r, net: r.collected - r.refunded } : empty;
  };
  return { real: pick("razorpay"), demo: pick("demo") };
}

/* ------------------------------------------------------------------ */
/* Students                                                            */
/* ------------------------------------------------------------------ */

export type AdminStudentDTO = {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string;
  lastLoginAt?: string;
  hasPassword: boolean;
  emailVerified: boolean;
  booked: number;
  cancelled: number;
  spent: number;
  demoSpent: number;
  reviews: number;
  lastBookingAt?: string;
};

export async function listAdminStudents({ q = "", page = 1 }: { q?: string; page?: number }) {
  await connectDB();
  const filter: Filter = {};
  const term = q.trim().slice(0, 100);
  if (term) {
    const rx = { $regex: escapeRegex(term), $options: "i" };
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const [students, total] = await Promise.all([
    Student.find(filter).select("+passwordHash").sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean<(StudentDoc & { passwordHash?: string })[]>(),
    Student.countDocuments(filter),
  ]);
  const ids = students.map((s) => s._id);
  const [stats, reviews] = await Promise.all([
    Booking.aggregate<{ _id: Types.ObjectId; booked: number; cancelled: number; spent: number; demoSpent: number; lastBookingAt: Date }>([
      { $match: { student: { $in: ids }, status: { $in: ["confirmed", "cancelled"] } } },
      {
        $group: {
          _id: "$student",
          booked: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
          spent: { $sum: { $cond: [{ $and: [{ $eq: ["$payment.provider", "razorpay"] }, { $ifNull: ["$payment.paidAt", false] }, { $not: [{ $ifNull: ["$payment.refundedAt", false] }] }] }, "$amount", 0] } },
          demoSpent: { $sum: { $cond: [{ $and: [{ $eq: ["$payment.provider", "demo"] }, { $ifNull: ["$payment.paidAt", false] }, { $not: [{ $ifNull: ["$payment.refundedAt", false] }] }] }, "$amount", 0] } },
          lastBookingAt: { $max: "$createdAt" },
        },
      },
    ]),
    Review.aggregate<{ _id: Types.ObjectId; n: number }>([{ $match: { student: { $in: ids } } }, { $group: { _id: "$student", n: { $sum: 1 } } }]),
  ]);
  const byId = new Map(stats.map((s) => [String(s._id), s]));
  const reviewsById = new Map(reviews.map((r) => [String(r._id), r.n]));
  const items: AdminStudentDTO[] = students.map((s) => {
    const st = byId.get(String(s._id));
    return {
      id: String(s._id),
      name: s.name,
      email: s.email,
      phone: s.phone ?? "",
      joinedAt: new Date(s.createdAt).toISOString(),
      lastLoginAt: s.lastLoginAt ? new Date(s.lastLoginAt).toISOString() : undefined,
      hasPassword: Boolean(s.passwordHash),
      emailVerified: Boolean(s.emailVerifiedAt),
      booked: st?.booked ?? 0,
      cancelled: st?.cancelled ?? 0,
      spent: st?.spent ?? 0,
      demoSpent: st?.demoSpent ?? 0,
      reviews: reviewsById.get(String(s._id)) ?? 0,
      lastBookingAt: st?.lastBookingAt ? new Date(st.lastBookingAt).toISOString() : undefined,
    };
  });
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** One student's bookings, newest first (for the expandable row). */
export async function getAdminStudentBookings(studentId: string) {
  if (!Types.ObjectId.isValid(studentId)) return null;
  await connectDB();
  const docs = await Booking.find({ student: studentId, status: { $in: ["confirmed", "cancelled"] } }).sort({ createdAt: -1 }).limit(100).populate("session", "title startsAt").lean();
  return (docs as unknown as (BookingDoc & { session?: MentorSessionDoc })[]).map((b) => ({
    id: String(b._id),
    status: b.status as "confirmed" | "cancelled",
    amount: b.amount,
    provider: (b.payment?.provider ?? "free") as "razorpay" | "demo" | "free",
    paid: Boolean(b.payment?.paidAt),
    refunded: Boolean(b.payment?.refundedAt),
    notes: b.notes ?? "",
    createdAt: new Date(b.createdAt).toISOString(),
    session: b.session && typeof b.session === "object" && "title" in b.session ? { id: String(b.session._id), title: b.session.title, startsAt: new Date(b.session.startsAt).toISOString() } : undefined,
  }));
}
