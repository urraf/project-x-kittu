import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Booking, Order, Review, Student, type BookingDoc, type MentorSessionDoc, type StudentDoc } from "@/lib/models";

// Mongoose 9 query typings are very strict; these dynamic filters are built from validated input.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Filter = Record<string, any>;

const PAGE_SIZE = 50;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Bookings where money was taken (real or demo). */
const PAID: Filter = { amount: { $gt: 0 }, "payment.paidAt": { $ne: null }, "payment.provider": { $in: ["razorpay", "demo"] } };

export type PaymentStatus = "paid" | "refunded" | "kept";
export type PaymentKind = "session" | "store";

export type AdminPaymentDTO = {
  id: string;
  kind: PaymentKind;
  name: string;
  email: string;
  phone: string;
  amount: number;
  provider: "razorpay" | "demo";
  paymentId?: string;
  orderId?: string;
  paidAt: string;
  refundedAt?: string;
  /** paid = active (seat / download), refunded = money returned, kept = cancelled but not refunded */
  status: PaymentStatus;
  /** What was bought: a session (links to its students tab) or a store product. */
  item?: { id: string; title: string; href: string; date?: string };
};

export type PaymentFilters = { q?: string; status?: PaymentStatus | "all"; provider?: "razorpay" | "demo" | "all"; kind?: PaymentKind | "all"; page?: number };

const ACTIVE = { session: "confirmed", store: "paid" } as const;

function statusOf(doc: { status?: string | null; payment?: { refundedAt?: Date | null } | null }): PaymentStatus {
  if (doc.payment?.refundedAt) return "refunded";
  return doc.status === "cancelled" ? "kept" : "paid";
}

function filterFor(kind: PaymentKind, { q = "", status = "all", provider = "all" }: PaymentFilters): Filter {
  const filter: Filter = { ...PAID };
  if (status === "paid") Object.assign(filter, { status: ACTIVE[kind], "payment.refundedAt": null });
  if (status === "refunded") filter["payment.refundedAt"] = { $ne: null };
  if (status === "kept") Object.assign(filter, { status: "cancelled", "payment.refundedAt": null });
  if (provider !== "all") filter["payment.provider"] = provider;
  const term = q.trim().slice(0, 100);
  if (term) {
    const rx = { $regex: escapeRegex(term), $options: "i" };
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { "payment.paymentId": rx }, { "payment.orderId": rx }];
  }
  return filter;
}

type PaidDoc = { _id: Types.ObjectId; name: string; email: string; phone?: string | null; amount: number; status?: string | null; payment?: { provider?: string | null; paymentId?: string | null; orderId?: string | null; paidAt?: Date | null; refundedAt?: Date | null } | null };

function toPaymentDTO(kind: PaymentKind, d: PaidDoc, item?: AdminPaymentDTO["item"]): AdminPaymentDTO {
  return {
    id: String(d._id),
    kind,
    name: d.name,
    email: d.email,
    phone: d.phone ?? "",
    amount: d.amount,
    provider: d.payment!.provider as "razorpay" | "demo",
    paymentId: d.payment?.paymentId ?? undefined,
    orderId: d.payment?.orderId ?? undefined,
    paidAt: new Date(d.payment!.paidAt!).toISOString(),
    refundedAt: d.payment?.refundedAt ? new Date(d.payment.refundedAt).toISOString() : undefined,
    status: statusOf(d),
    item,
  };
}

/** Session bookings and store orders in one list, newest payment first. */
export async function listAdminPayments(filters: PaymentFilters) {
  const { kind = "all", page = 1 } = filters;
  await connectDB();
  const need = page * PAGE_SIZE;
  const wantSessions = kind === "all" || kind === "session";
  const wantStore = kind === "all" || kind === "store";
  const [bookings, orders, bookingCount, orderCount] = await Promise.all([
    wantSessions ? Booking.find(filterFor("session", filters)).sort({ "payment.paidAt": -1 }).limit(need).populate("session", "title startsAt").lean() : [],
    wantStore ? Order.find(filterFor("store", filters)).sort({ "payment.paidAt": -1 }).limit(need).populate("product", "title slug").lean() : [],
    wantSessions ? Booking.countDocuments(filterFor("session", filters)) : 0,
    wantStore ? Order.countDocuments(filterFor("store", filters)) : 0,
  ]);
  const items: AdminPaymentDTO[] = [
    ...(bookings as unknown as (PaidDoc & { session?: MentorSessionDoc })[]).map((b) =>
      toPaymentDTO("session", b, b.session && typeof b.session === "object" && "title" in b.session ? { id: String(b.session._id), title: b.session.title, href: `/admin/sessions/${b.session._id}?tab=students`, date: new Date(b.session.startsAt).toISOString() } : undefined),
    ),
    ...(orders as unknown as (PaidDoc & { product?: { _id: Types.ObjectId; title: string } })[]).map((o) =>
      toPaymentDTO("store", o, o.product && typeof o.product === "object" && "title" in o.product ? { id: String(o.product._id), title: o.product.title, href: `/admin/products/${o.product._id}` } : undefined),
    ),
  ]
    .sort((x, y) => new Date(y.paidAt).getTime() - new Date(x.paidAt).getTime())
    .slice((page - 1) * PAGE_SIZE, need);
  const total = bookingCount + orderCount;
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

type Totals = { collected: number; payments: number; refunded: number; refunds: number; net: number; thisMonth: number; kept: number; keptCount: number };

/** Money totals (sessions + store). Real (Razorpay) and demo kept apart so practice payments never inflate revenue. */
export async function paymentsSummary(): Promise<{ real: Totals; demo: Totals; storeReal: number; sessionsReal: number }> {
  await connectDB();
  // Start of the current month in India time.
  const ist = new Date(Date.now() + 5.5 * 3600_000);
  const monthStart = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 5.5 * 3600_000);
  const notRefunded = { $not: [{ $ifNull: ["$payment.refundedAt", false] }] };
  const pipeline = [
    { $match: PAID },
    {
      $group: {
        _id: "$payment.provider",
        collected: { $sum: "$amount" },
        payments: { $sum: 1 },
        refunded: { $sum: { $cond: [{ $ifNull: ["$payment.refundedAt", false] }, "$amount", 0] } },
        refunds: { $sum: { $cond: [{ $ifNull: ["$payment.refundedAt", false] }, 1, 0] } },
        thisMonth: { $sum: { $cond: [{ $and: [{ $gte: ["$payment.paidAt", monthStart] }, notRefunded] }, "$amount", 0] } },
        kept: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "cancelled"] }, notRefunded] }, "$amount", 0] } },
        keptCount: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "cancelled"] }, notRefunded] }, 1, 0] } },
      },
    },
  ];
  type Row = { _id: string } & Omit<Totals, "net">;
  const [bookingRows, orderRows] = await Promise.all([Booking.aggregate<Row>(pipeline), Order.aggregate<Row>(pipeline)]);
  const empty: Totals = { collected: 0, payments: 0, refunded: 0, refunds: 0, net: 0, thisMonth: 0, kept: 0, keptCount: 0 };
  const pick = (rows: Row[], provider: string): Totals => {
    const r = rows.find((x) => x._id === provider);
    return r ? { collected: r.collected, payments: r.payments, refunded: r.refunded, refunds: r.refunds, thisMonth: r.thisMonth, kept: r.kept, keptCount: r.keptCount, net: r.collected - r.refunded } : empty;
  };
  const add = (a: Totals, b: Totals): Totals => Object.fromEntries(Object.keys(a).map((k) => [k, a[k as keyof Totals] + b[k as keyof Totals]])) as Totals;
  const sessionsReal = pick(bookingRows, "razorpay");
  const storeReal = pick(orderRows, "razorpay");
  return { real: add(sessionsReal, storeReal), demo: add(pick(bookingRows, "demo"), pick(orderRows, "demo")), sessionsReal: sessionsReal.net, storeReal: storeReal.net };
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
  /** Store products owned */
  products: number;
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
  const [stats, reviews, orderStats] = await Promise.all([
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
    Order.aggregate<{ _id: Types.ObjectId; products: number; spent: number; demoSpent: number; last: Date }>([
      { $match: { student: { $in: ids }, status: "paid" } },
      {
        $group: {
          _id: "$student",
          products: { $sum: 1 },
          spent: { $sum: { $cond: [{ $and: [{ $eq: ["$payment.provider", "razorpay"] }, { $not: [{ $ifNull: ["$payment.refundedAt", false] }] }] }, "$amount", 0] } },
          demoSpent: { $sum: { $cond: [{ $and: [{ $eq: ["$payment.provider", "demo"] }, { $not: [{ $ifNull: ["$payment.refundedAt", false] }] }] }, "$amount", 0] } },
          last: { $max: "$createdAt" },
        },
      },
    ]),
  ]);
  const ordersById = new Map(orderStats.map((o) => [String(o._id), o]));
  const byId = new Map(stats.map((s) => [String(s._id), s]));
  const reviewsById = new Map(reviews.map((r) => [String(r._id), r.n]));
  const items: AdminStudentDTO[] = students.map((s) => {
    const st = byId.get(String(s._id));
    const os = ordersById.get(String(s._id));
    const lastBooking = Math.max(st?.lastBookingAt ? new Date(st.lastBookingAt).getTime() : 0, os?.last ? new Date(os.last).getTime() : 0);
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
      spent: (st?.spent ?? 0) + (os?.spent ?? 0),
      demoSpent: (st?.demoSpent ?? 0) + (os?.demoSpent ?? 0),
      products: os?.products ?? 0,
      reviews: reviewsById.get(String(s._id)) ?? 0,
      lastBookingAt: lastBooking ? new Date(lastBooking).toISOString() : undefined,
    };
  });
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** One student's bookings, newest first (for the expandable row). */
export async function getAdminStudentBookings(studentId: string) {
  if (!Types.ObjectId.isValid(studentId)) return null;
  await connectDB();
  const [docs, orders] = await Promise.all([
    Booking.find({ student: studentId, status: { $in: ["confirmed", "cancelled"] } }).sort({ createdAt: -1 }).limit(100).populate("session", "title startsAt").lean(),
    Order.find({ student: studentId, status: { $in: ["paid", "cancelled"] }, "payment.paidAt": { $ne: null } }).sort({ createdAt: -1 }).limit(100).populate("product", "title").lean(),
  ]);
  const bookingRows = (docs as unknown as (BookingDoc & { session?: MentorSessionDoc })[]).map((b) => ({
    id: String(b._id),
    kind: "session" as const,
    status: b.status as "confirmed" | "cancelled",
    amount: b.amount,
    provider: (b.payment?.provider ?? "free") as "razorpay" | "demo" | "free",
    paid: Boolean(b.payment?.paidAt),
    refunded: Boolean(b.payment?.refundedAt),
    notes: b.notes ?? "",
    createdAt: new Date(b.createdAt).toISOString(),
    session: b.session && typeof b.session === "object" && "title" in b.session ? { id: String(b.session._id), title: b.session.title, startsAt: new Date(b.session.startsAt).toISOString() } : undefined,
  }));
  const orderRows = (orders as unknown as (PaidDoc & { createdAt: Date; product?: { _id: Types.ObjectId; title: string } })[]).map((o) => ({
    id: String(o._id),
    kind: "store" as const,
    status: (o.status === "paid" ? "confirmed" : "cancelled") as "confirmed" | "cancelled",
    amount: o.amount,
    provider: (o.payment?.provider ?? "free") as "razorpay" | "demo" | "free",
    paid: Boolean(o.payment?.paidAt),
    refunded: Boolean(o.payment?.refundedAt),
    notes: "",
    createdAt: new Date(o.createdAt).toISOString(),
    product: o.product && typeof o.product === "object" && "title" in o.product ? { id: String(o.product._id), title: o.product.title } : undefined,
  }));
  return [...bookingRows, ...orderRows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
