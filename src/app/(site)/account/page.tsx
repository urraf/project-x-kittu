import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, CalendarPlus, Clock, ExternalLink, Receipt, Star, Video } from "lucide-react";
import { ChangePasswordForm, LogoutButton, ProfileForm } from "@/components/mentorship/AccountForms";
import { Stars } from "@/components/mentorship/Stars";
import { getStudent } from "@/lib/auth/student";
import { listStudentBookings } from "@/lib/services/mentorship";
import { formatDuration, formatPrice, formatSessionDate, formatSessionTime, googleCalendarLink, sessionEnd } from "@/lib/utils/session-time";
import type { BookingDTO } from "@/lib/types";

export const metadata: Metadata = { title: "My account", robots: { index: false } };
export const dynamic = "force-dynamic";

function receipt(b: BookingDTO) {
  if (!b.amount) return "Free session";
  const demo = b.paymentProvider === "demo" ? " (demo)" : "";
  if (b.refundedAt) return `${formatPrice(b.amount)} refunded${demo}`;
  if (!b.paidAt) return "Not paid";
  const on = new Date(b.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  return `Paid ${formatPrice(b.amount)} on ${on}${demo}`;
}

function BookingRow({ b }: { b: BookingDTO }) {
  const s = b.session;
  if (!s) return null;
  const cancelled = b.status === "cancelled" || s.status === "cancelled";
  return (
    <li className="rounded-2xl border border-line bg-[#fffdf9] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/sessions/${s.slug}`} className="display text-2xl leading-tight hover:text-accent-deep">{s.title}</Link>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 text-accent" /> {formatSessionDate(s.startsAt)}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="size-4 text-accent" /> {formatSessionTime(s.startsAt)} – {formatSessionTime(sessionEnd(s.startsAt, s.durationMin))} IST</span>
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cancelled ? "bg-paper-3 text-ink-2" : s.ended ? "bg-paper-2 text-ink-2" : "bg-[#dde8de] text-moss"}`}>
          {cancelled ? "Cancelled" : s.ended ? "Completed" : "Confirmed"}
        </span>
      </div>
      {((!cancelled && !s.ended && s.meetingUrl) || (!cancelled && s.ended && b.feedbackUrl)) && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!cancelled && !s.ended && s.meetingUrl && (
            <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent !py-2.5">
              Join the session <ExternalLink className="size-4" />
            </a>
          )}
          {!cancelled && s.ended && b.feedbackUrl && (
            b.review ? (
              <span className="inline-flex items-center gap-2 text-sm text-ink-2">
                <Stars value={b.review.rating} /> Your review · <a href={b.feedbackUrl} className="underline underline-offset-4">Edit</a>
              </span>
            ) : (
              <a href={b.feedbackUrl} className="btn btn-ink !py-2.5"><Star className="size-4" /> Rate this session</a>
            )
          )}
        </div>
      )}
      <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-3 text-xs text-muted">
        <Receipt className="size-3.5" /> {receipt(b)}
        {b.paymentId && b.paymentProvider === "razorpay" && <span className="font-mono">· Ref {b.paymentId}</span>}
      </p>
    </li>
  );
}

/** The very next session gets a big card with the join button and calendar link. */
function NextUp({ b }: { b: BookingDTO }) {
  const s = b.session!;
  const cal = googleCalendarLink({ title: s.title, startsAt: s.startsAt, durationMin: s.durationMin, details: s.meetingUrl ? `Join: ${s.meetingUrl}` : "", location: s.meetingUrl });
  return (
    <div className="grain relative overflow-hidden rounded-3xl bg-night p-6 text-cream md:p-8">
      <span aria-hidden className="absolute -right-16 -top-16 size-48 rounded-full bg-accent/80" />
      <div className="relative z-[2]">
        <p className="kicker text-cream-muted">Your next session</p>
        <h2 className="display mt-3 max-w-xl text-3xl leading-tight md:text-4xl">{s.title}</h2>
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.95rem] text-cream/80">
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 text-accent" /> {formatSessionDate(s.startsAt)}</span>
          <span className="inline-flex items-center gap-1.5"><Clock className="size-4 text-accent" /> {formatSessionTime(s.startsAt)} IST · {formatDuration(s.durationMin)}</span>
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {s.meetingUrl && (
            <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent">
              <Video className="size-4" /> Join the session
            </a>
          )}
          <a href={cal} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-cream">
            <CalendarPlus className="size-4" /> Add to calendar
          </a>
        </div>
        {s.meetingUrl && <p className="mt-4 break-all text-xs text-cream/55">Meeting link: {s.meetingUrl}</p>}
        <p className="mt-2 text-xs text-cream/55">{receipt(b)}</p>
      </div>
    </div>
  );
}

export default async function AccountPage() {
  const student = await getStudent();
  if (!student) redirect("/account/login?next=/account");
  const bookings = await listStudentBookings(student._id);
  const upcoming = bookings
    .filter((b) => b.session && !b.session.ended && b.status === "confirmed" && b.session.status !== "cancelled")
    .sort((a, b) => new Date(a.session!.startsAt).getTime() - new Date(b.session!.startsAt).getTime());
  const past = bookings.filter((b) => !upcoming.includes(b));
  const attended = past.filter((b) => b.status === "confirmed" && b.session?.ended).length;
  const [next, ...later] = upcoming;

  return (
    <section className="container-x max-w-6xl pb-24 pt-28 md:pt-32">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> My account</p>
          <h1 className="display mt-4 text-5xl">Hi, {student.name.split(" ")[0]}</h1>
          <p className="mt-2 text-ink-2">
            {upcoming.length} upcoming · {attended} attended
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sessions" className="btn btn-ink !py-2.5">Book a session <ArrowRight className="size-4" /></Link>
          <LogoutButton />
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-10">
          {next ? (
            <NextUp b={next} />
          ) : (
            <div className="rounded-3xl border border-dashed border-line p-8 text-center">
              <p className="display text-3xl">No upcoming sessions</p>
              <p className="mt-2 text-ink-2">Pick a date that works for you. Seats are limited in every group.</p>
              <Link href="/sessions" className="btn btn-accent mt-5">See upcoming sessions</Link>
            </div>
          )}
          {later.length > 0 && (
            <div>
              <h2 className="font-medium text-ink">Also coming up</h2>
              <ul className="mt-4 space-y-4">{later.map((b) => <BookingRow key={b.id} b={b} />)}</ul>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="font-medium text-ink">Past sessions</h2>
              <ul className="mt-4 space-y-4">{past.map((b) => <BookingRow key={b.id} b={b} />)}</ul>
            </div>
          )}
        </div>
        <aside className="space-y-6">
          <div className="rounded-2xl border border-line bg-paper-2 p-5">
            <h2 className="font-medium text-ink">Your details</h2>
            <div className="mt-4">
              <ProfileForm initial={{ name: student.name, phone: student.phone ?? "", email: student.email }} />
            </div>
          </div>
          <div className="scroll-mt-28 rounded-2xl border border-line bg-paper-2 p-5" id="password">
            <h2 className="font-medium text-ink">Password</h2>
            <p className="mt-1 text-sm text-muted">Got a password by email? Change it to one you&apos;ll remember.</p>
            <div className="mt-4">
              <ChangePasswordForm />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
