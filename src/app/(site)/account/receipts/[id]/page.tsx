import type { Metadata } from "next";
import { receiptNumber } from "@/lib/utils/receipt";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SunMark } from "@/components/site/Logo";
import { PrintButton } from "@/components/mentorship/PrintButton";
import { getStudent } from "@/lib/auth/student";
import { getStudentBooking } from "@/lib/services/mentorship";
import { getStudentOrder } from "@/lib/services/store";
import { getSettings } from "@/lib/services/settings";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { formatDuration, formatPrice, formatSessionWhen } from "@/lib/utils/session-time";

export const metadata: Metadata = { title: "Receipt", robots: { index: false } };
export const dynamic = "force-dynamic";

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await getStudent();
  if (!student) redirect(`/account/login?next=${encodeURIComponent(`/account/receipts/${id}`)}`);
  const [booking, order, settings] = await Promise.all([getStudentBooking(student._id, id), getStudentOrder(student._id, id), getSettings()]);
  // One receipt layout for both session bookings and store orders.
  const b = booking?.session
    ? {
        id: booking.id, name: booking.name, email: booking.email, phone: booking.phone, amount: booking.amount, paidAt: booking.paidAt, refundedAt: booking.refundedAt,
        paymentId: booking.paymentId, paymentProvider: booking.paymentProvider, status: booking.status,
        item: booking.session.title, itemLine: `Live group session · ${formatSessionWhen(booking.session.startsAt, booking.session.durationMin)} · ${formatDuration(booking.session.durationMin)}`, qty: "1 seat",
      }
    : order
      ? {
          id: order.orderId, name: order.name, email: order.email, phone: order.phone, amount: order.amount, paidAt: order.paidAt, refundedAt: order.refundedAt,
          paymentId: order.paymentId, paymentProvider: order.provider, status: order.status,
          item: order.product?.title ?? "Digital product", itemLine: `Digital product · ${order.product?.category ?? "Download"}`, qty: "Lifetime access",
        }
      : null;
  if (!b || !b.amount || !b.paidAt) notFound();
  const demo = b.paymentProvider === "demo";
  const number = receiptNumber(b.id);

  return (
    <section className="container-x max-w-3xl pb-24 pt-28 md:pt-32 print:max-w-none print:px-[12mm] print:py-[14mm]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/account?tab=payments" className="group inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /> Payments
        </Link>
        <PrintButton />
      </div>

      <article className="rounded-3xl border border-line bg-[#fffdf9] p-6 md:p-10 print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div className="flex items-center gap-3">
            <SunMark className="size-9" />
            <div>
              <p className="display text-2xl leading-none">{SITE_NAME}</p>
              <p className="mt-1 text-xs text-muted">{SITE_URL.replace(/^https?:\/\//, "")}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="display text-4xl leading-none">Receipt</p>
            <p className="mt-2 font-mono text-sm text-ink-2">{number}</p>
          </div>
        </header>

        {demo && (
          <p className="mt-6 rounded-xl bg-[#fff4d6] px-4 py-2.5 text-sm font-medium text-[#7a5410]">Demo payment: no real money was charged. This is not a valid receipt.</p>
        )}

        <dl className="mt-6 grid grid-cols-1 gap-6 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted">Billed to</dt>
            <dd className="mt-1.5 text-ink">
              <span className="block font-medium">{b.name}</span>
              <span className="block break-all">{b.email}</span>
              {b.phone && <span className="block">{b.phone}</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted">Paid on</dt>
            <dd className="mt-1.5 text-ink">{fmtDate(b.paidAt!)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted">Payment</dt>
            <dd className="mt-1.5 text-ink">
              <span className="block">{demo ? "Demo checkout" : "Razorpay"}</span>
              {b.paymentId && <span className="block break-all font-mono text-xs text-ink-2">{b.paymentId}</span>}
            </dd>
          </div>
        </dl>

        <table className="mt-8 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <th className="pb-3 font-normal">Item</th>
              <th className="pb-3 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line align-top">
              <td className="py-4 pr-4">
                <p className="font-medium text-ink">{b.item}</p>
                <p className="mt-1 text-ink-2">{b.itemLine}</p>
                <p className="mt-0.5 text-xs text-muted">{b.qty}</p>
              </td>
              <td className="py-4 text-right font-medium text-ink">{formatPrice(b.amount)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-4 text-right text-ink-2">Total paid</td>
              <td className="pt-4 text-right display text-3xl text-ink">{formatPrice(b.amount)}</td>
            </tr>
            {b.refundedAt && (
              <tr>
                <td className="pt-2 text-right text-moss">Refunded on {fmtDate(b.refundedAt)}</td>
                <td className="pt-2 text-right font-medium text-moss">−{formatPrice(b.amount)}</td>
              </tr>
            )}
          </tfoot>
        </table>

        <footer className="mt-10 border-t border-line pt-5 text-xs leading-relaxed text-muted">
          <p>Status: <strong className="text-ink">{b.refundedAt ? "Refunded" : b.status === "cancelled" ? "Cancelled" : "Paid"}</strong> · Booking {b.id}</p>
          <p className="mt-1">Thank you for booking with {settings.profile.name}. Questions about this payment? Reply to your booking confirmation email{settings.social.email ? ` or write to ${settings.social.email}` : ""}.</p>
        </footer>
      </article>
    </section>
  );
}
