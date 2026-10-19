import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CalendarPlus,
  CircleHelp,
  Clock,
  Download,
  ExternalLink,
  FileText,
  LayoutDashboard,
  ListChecks,
  MessageSquareQuote,
  Receipt,
  Star,
  UserRound,
  Video,
  Wallet,
  Library as LibraryIcon,
} from "lucide-react";
import { ChangePasswordForm, LogoutButton, ProfileForm } from "@/components/mentorship/AccountForms";
import { Countdown } from "@/components/mentorship/Countdown";
import { SessionServiceCard } from "@/components/mentorship/ServiceCard";
import { Stars } from "@/components/mentorship/Stars";
import { getStudent } from "@/lib/auth/student";
import { safe } from "@/lib/safe";
import { listStudentBookings, listUpcomingSessions } from "@/lib/services/mentorship";
import { listStudentOrders } from "@/lib/services/store";
import { ProductCover } from "@/components/store/ProductCard";
import { getSettings } from "@/lib/services/settings";
import { formatDuration, formatPrice, formatSessionDate, formatSessionTime, googleCalendarLink, sessionEnd } from "@/lib/utils/session-time";
import { cn } from "@/lib/utils/cn";
import type { BookingDTO } from "@/lib/types";

export const metadata: Metadata = { title: "My account", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "sessions", label: "My sessions", Icon: CalendarDays },
  { id: "library", label: "My library", Icon: LibraryIcon },
  { id: "payments", label: "Payments", Icon: Wallet },
  { id: "profile", label: "Profile & security", Icon: UserRound },
] as const;
type Tab = (typeof TABS)[number]["id"];

const shortDate = (d: string | Date) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** "live" between start and end, otherwise upcoming/ended. Kept outside components (reads the clock). */
function liveState(startsAt: string, durationMin: number): "upcoming" | "live" | "ended" {
  const now = Date.now();
  if (sessionEnd(startsAt, durationMin).getTime() <= now) return "ended";
  return new Date(startsAt).getTime() <= now ? "live" : "upcoming";
}

function paymentLine(b: BookingDTO) {
  if (!b.amount) return "Free session";
  const demo = b.paymentProvider === "demo" ? " (demo)" : "";
  if (b.refundedAt) return `${formatPrice(b.amount)} refunded${demo}`;
  if (!b.paidAt) return "Not paid";
  return `Paid ${formatPrice(b.amount)} on ${shortDate(b.paidAt)}${demo}`;
}

const isCancelled = (b: BookingDTO) => b.status === "cancelled" || b.session?.status === "cancelled";

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function CalendarLinks({ b, tone = "light" }: { b: BookingDTO; tone?: "light" | "dark" }) {
  const s = b.session!;
  const google = googleCalendarLink({ title: s.title, startsAt: s.startsAt, durationMin: s.durationMin, details: s.meetingUrl ? `Join: ${s.meetingUrl}` : "", location: s.meetingUrl });
  const cls = tone === "dark" ? "btn btn-ghost text-cream" : "btn btn-ghost !py-2.5 text-ink";
  return (
    <>
      <a href={google} target="_blank" rel="noopener noreferrer" className={cls}>
        <CalendarPlus className="size-4" /> Google Calendar
      </a>
      <a href={`/api/account/bookings/${b.id}/calendar`} className={cls} title="For Apple Calendar, Outlook and others">
        <Download className="size-4" /> .ics file
      </a>
    </>
  );
}

function BookingRow({ b }: { b: BookingDTO }) {
  const s = b.session;
  if (!s) return null;
  const cancelled = isCancelled(b);
  const state = liveState(s.startsAt, s.durationMin);
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
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            cancelled ? "bg-paper-3 text-ink-2" : state === "live" ? "bg-accent text-white" : state === "ended" ? "bg-paper-2 text-ink-2" : "bg-[#dde8de] text-moss",
          )}
        >
          {cancelled ? "Cancelled" : state === "live" ? "Live now" : state === "ended" ? "Completed" : "Confirmed"}
        </span>
      </div>

      {b.notes && (
        <p className="mt-3 rounded-xl bg-paper-2 px-3.5 py-2.5 text-sm text-ink-2">
          <span className="text-muted">You asked about: </span>
          {b.notes}
        </p>
      )}

      {!cancelled && state !== "ended" && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {s.meetingUrl && (
            <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent !py-2.5">
              <Video className="size-4" /> {state === "live" ? "Join now" : "Join link"} <ExternalLink className="size-3.5" />
            </a>
          )}
          <CalendarLinks b={b} />
        </div>
      )}
      {!cancelled && state === "ended" && b.feedbackUrl && (
        <div className="mt-4">
          {b.review ? (
            <span className="inline-flex items-center gap-2 text-sm text-ink-2">
              <Stars value={b.review.rating} /> Thanks for your feedback
            </span>
          ) : (
            <a href={b.feedbackUrl} className="btn btn-ink !py-2.5"><Star className="size-4" /> Rate this session</a>
          )}
        </div>
      )}

      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><Receipt className="size-3.5" /> {paymentLine(b)}</span>
        {b.amount > 0 && b.paidAt && (
          <Link href={`/account/receipts/${b.id}`} className="font-medium text-ink underline underline-offset-4">View receipt</Link>
        )}
        <span>Booked {shortDate(b.createdAt)}</span>
      </p>
    </li>
  );
}

function NextUp({ b }: { b: BookingDTO }) {
  const s = b.session!;
  const state = liveState(s.startsAt, s.durationMin);
  return (
    <div className="seigaiha relative overflow-hidden rounded-3xl border border-line bg-indigo-soft p-6 text-ink md:p-8">
      <span aria-hidden className="absolute -right-16 -top-16 size-48 rounded-full bg-accent/85" />
      <div className="relative z-[2]">
        <p className="kicker flex items-center gap-2 text-muted">
          {state === "live" && <span className="size-2 animate-pulse rounded-full bg-accent" />}
          {state === "live" ? "Happening now" : "Your next session"}
        </p>
        <h2 className="display mt-3 max-w-xl text-3xl leading-tight md:text-4xl">{s.title}</h2>
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.95rem] text-ink-2">
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 text-accent" /> {formatSessionDate(s.startsAt)}</span>
          <span className="inline-flex items-center gap-1.5"><Clock className="size-4 text-accent" /> {formatSessionTime(s.startsAt)} IST · {formatDuration(s.durationMin)}</span>
        </p>
        {state === "upcoming" && (
          <div className="mt-5">
            <p className="mb-2 text-xs uppercase tracking-wider text-muted">Starts in</p>
            <Countdown to={s.startsAt} />
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          {s.meetingUrl && (
            <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent">
              <Video className="size-4" /> {state === "live" ? "Join now, it's live" : "Join the session"}
            </a>
          )}
          <CalendarLinks b={b} />
        </div>
        {s.meetingUrl && <p className="mt-4 break-all text-xs text-muted">Meeting link: {s.meetingUrl}</p>}
      </div>
    </div>
  );
}

function Stat({ Icon, value, label }: { Icon: typeof Star; value: string | number; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-[#fffdf9] p-4">
      <Icon className="size-5 text-accent" />
      <p className="display mt-3 text-4xl leading-none">{value}</p>
      <p className="mt-1.5 text-xs uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}

const PREP = [
  "Test your camera, mic and internet 10 minutes before",
  "Keep your CV / profile open so you can share it if asked",
  "Write down your top 3 questions",
  "Join from a quiet place, with a notebook ready",
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const student = await getStudent();
  if (!student) redirect("/account/login?next=/account");
  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : "overview";

  const [bookings, upcomingAll, settings, orders] = await Promise.all([
    listStudentBookings(student._id),
    safe("account.recommended", () => listUpcomingSessions(8), []),
    getSettings(),
    safe("account.orders", () => listStudentOrders(student._id), []),
  ]);

  const active = bookings.filter((b) => b.session && !isCancelled(b));
  const upcoming = active
    .filter((b) => liveState(b.session!.startsAt, b.session!.durationMin) !== "ended")
    .sort((a, b) => new Date(a.session!.startsAt).getTime() - new Date(b.session!.startsAt).getTime());
  const attended = active.filter((b) => liveState(b.session!.startsAt, b.session!.durationMin) === "ended");
  const past = bookings.filter((b) => !upcoming.includes(b)).sort((a, b) => new Date(b.session?.startsAt ?? 0).getTime() - new Date(a.session?.startsAt ?? 0).getTime());
  const toRate = attended.filter((b) => !b.review && b.feedbackUrl);
  const owned = orders.filter((o) => o.status === "paid" && !o.refundedAt);
  // Sessions and store purchases in one list, newest first.
  const payments = [
    ...bookings.filter((b) => b.amount > 0 && b.paidAt).map((b) => ({ id: b.id, kind: "Session", title: b.session?.title ?? "Session", amount: b.amount, paidAt: b.paidAt!, refundedAt: b.refundedAt, provider: b.paymentProvider, paymentId: b.paymentId })),
    ...orders.filter((o) => o.amount > 0 && o.paidAt).map((o) => ({ id: o.orderId, kind: "Store", title: o.product?.title ?? "Product", amount: o.amount, paidAt: o.paidAt!, refundedAt: o.refundedAt, provider: o.provider, paymentId: o.paymentId })),
  ].sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  const bookedIds = new Set(bookings.map((b) => b.session?.id));
  const recommended = upcomingAll.filter((s) => !bookedIds.has(s.id) && s.seatsLeft > 0).slice(0, 3);
  const next = upcoming[0];
  const counts: Partial<Record<Tab, number>> = { sessions: upcoming.length, library: owned.length, payments: payments.length };

  return (
    <section className="container-x max-w-6xl pb-24 pt-28 md:pt-32">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> My account</p>
          <h1 className="display mt-4 text-5xl">Hi, {student.name.split(" ")[0]}</h1>
          <p className="mt-2 text-ink-2">Everything about your sessions, in one place.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sessions" className="btn btn-ink !py-2.5">Book a session <ArrowRight className="size-4" /></Link>
          <LogoutButton />
        </div>
      </div>

      {/* Tabs */}
      <nav aria-label="Account sections" className="mt-8 grid grid-cols-2 gap-2 sm:flex sm:gap-1 sm:border-b sm:border-line">
        {TABS.map(({ id, label, Icon }) => (
          <Link
            key={id}
            href={id === "overview" ? "/account" : `/account?tab=${id}`}
            aria-current={tab === id ? "page" : undefined}
            className={cn(
              // Phones: a 2×2 grid of buttons. Larger screens: underlined tabs.
              "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2.5 text-sm transition-colors sm:-mb-px sm:justify-start sm:rounded-none sm:border-0 sm:border-b-2 sm:px-4 sm:py-3",
              tab === id
                ? "border-ink bg-ink font-medium text-cream sm:border-accent sm:bg-transparent sm:text-ink"
                : "border-line bg-[#fffdf9] text-ink-2 hover:text-ink sm:border-transparent sm:bg-transparent",
            )}
          >
            <Icon className="size-4 shrink-0" /> <span className="truncate">{label}</span>
            {counts[id] ? (
              <span className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-medium", tab === id ? "bg-cream/20 text-cream sm:bg-ink" : "bg-paper-3 text-ink-2")}>{counts[id]}</span>
            ) : null}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        {/* ------------------------------ Overview ------------------------------ */}
        {tab === "overview" && (
          <div className="space-y-10">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat Icon={CalendarDays} value={upcoming.length} label="Upcoming" />
              <Stat Icon={BadgeCheck} value={attended.length} label="Attended" />
              <Stat Icon={LibraryIcon} value={owned.length} label="In your library" />
              <Stat Icon={MessageSquareQuote} value={attended.filter((b) => b.review).length} label="Reviews given" />
            </div>

            {toRate.length > 0 && (
              <div className="flex flex-col gap-4 rounded-2xl border border-accent/30 bg-accent-soft/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Star className="mt-0.5 size-5 shrink-0 text-accent" />
                  <div>
                    <p className="font-medium text-ink">How was “{toRate[0]!.session!.title}”?</p>
                    <p className="text-sm text-ink-2">A 30-second rating helps other students decide.{toRate.length > 1 ? ` (${toRate.length} sessions to rate)` : ""}</p>
                  </div>
                </div>
                <a href={toRate[0]!.feedbackUrl} className="btn btn-accent shrink-0 !py-2.5">Rate now</a>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              {next ? (
                <NextUp b={next} />
              ) : (
                <div className="rounded-3xl border border-dashed border-line p-8 text-center">
                  <p className="display text-3xl">No upcoming sessions</p>
                  <p className="mt-2 text-ink-2">Pick a date that works for you. Seats are limited in every group.</p>
                  <Link href="/sessions" className="btn btn-accent mt-5">See upcoming sessions</Link>
                </div>
              )}
              <div className="rounded-3xl border border-line bg-paper-2 p-5">
                <p className="flex items-center gap-2 font-medium text-ink"><ListChecks className="size-5 text-accent" /> Before your session</p>
                <ul className="mt-4 space-y-3 text-sm text-ink-2">
                  {PREP.map((p) => (
                    <li key={p} className="flex gap-2.5">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" /> {p}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 border-t border-line pt-4 text-xs text-muted">The meeting link also arrives by email, with a reminder 1 hour before.</p>
              </div>
            </div>

            {upcoming.length > 1 && (
              <div>
                <div className="flex items-baseline justify-between">
                  <h2 className="font-medium text-ink">Also coming up</h2>
                  <Link href="/account?tab=sessions" className="text-sm text-ink-2 underline underline-offset-4 hover:text-ink">All my sessions</Link>
                </div>
                <ul className="mt-4 space-y-4">{upcoming.slice(1, 3).map((b) => <BookingRow key={b.id} b={b} />)}</ul>
              </div>
            )}

            {recommended.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between">
                  <h2 className="display text-3xl">Recommended <em className="text-accent">for you</em></h2>
                  <Link href="/sessions" className="text-sm text-ink-2 underline underline-offset-4 hover:text-ink">All sessions</Link>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {recommended.map((s) => <SessionServiceCard key={s.id} session={s} compact />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------ My sessions ------------------------------ */}
        {tab === "sessions" && (
          <div className="space-y-10">
            <div>
              <h2 className="font-medium text-ink">Upcoming</h2>
              {upcoming.length ? (
                <ul className="mt-4 space-y-4">{upcoming.map((b) => <BookingRow key={b.id} b={b} />)}</ul>
              ) : (
                <p className="mt-3 text-ink-2">Nothing booked right now. <Link href="/sessions" className="underline underline-offset-4">See upcoming sessions</Link></p>
              )}
            </div>
            <div>
              <h2 className="font-medium text-ink">Past & cancelled</h2>
              {past.length ? (
                <ul className="mt-4 space-y-4">{past.map((b) => <BookingRow key={b.id} b={b} />)}</ul>
              ) : (
                <p className="mt-3 text-ink-2">Your completed sessions will appear here, with a link to rate each one.</p>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------ Library ------------------------------ */}
        {tab === "library" && (
          <div>
            {owned.length ? (
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {owned.map((o) => {
                  const active = o.status === "paid" && !o.refundedAt;
                  return (
                    <li key={o.orderId} className={cn("flex flex-col overflow-hidden rounded-3xl border border-line bg-[#fffdf9]", !active && "opacity-70")}>
                      {o.product && <ProductCover product={o.product} sizes="(min-width: 1024px) 22rem, 100vw" className="aspect-[4/3]" />}
                      <div className="flex flex-1 flex-col p-5">
                        <p className="kicker !text-[0.65rem] text-accent-deep">{o.product?.category ?? "Product"}</p>
                        <p className="display mt-2 text-2xl leading-tight">{o.product?.title ?? "Product no longer available"}</p>
                        <p className="mt-1 text-xs text-muted">
                          {o.paidAt ? `Added ${shortDate(o.paidAt)}` : ""}
                          {o.product?.deliveryNote ? ` · ${o.product.deliveryNote}` : ""}
                        </p>
                        <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                          {active ? (
                            <a href={`/api/account/library/${o.orderId}/download`} className="btn btn-accent !py-2.5" {...(o.product?.deliveryType === "link" ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                              {o.product?.deliveryType === "link" ? <ExternalLink className="size-4" /> : <Download className="size-4" />}
                              {o.product?.deliveryType === "link" ? "Open" : "Download"}
                            </a>
                          ) : (
                            <span className="text-sm text-muted">Refunded, access removed</span>
                          )}
                          {o.amount > 0 && o.paidAt && <Link href={`/account/receipts/${o.orderId}`} className="btn btn-ghost !py-2.5 text-ink"><FileText className="size-4" /> Receipt</Link>}
                          {active && o.rating ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-ink-2"><Stars value={o.rating} /> Rated</span>
                          ) : active && o.feedbackUrl ? (
                            <a href={o.feedbackUrl} className="btn btn-ghost !py-2.5 text-ink"><Star className="size-4" /> Rate it</a>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-3xl border border-dashed border-line p-8 text-center">
                <LibraryIcon className="mx-auto size-8 text-accent" />
                <p className="display mt-3 text-3xl">Your library is empty</p>
                <p className="mt-2 text-ink-2">Guides and templates you get from the store appear here, ready to download any time.</p>
                <Link href="/store" className="btn btn-accent mt-5">Browse the store</Link>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------ Payments ------------------------------ */}
        {tab === "payments" && (
          <div>
            {payments.length ? (
              <div className="overflow-hidden rounded-2xl border border-line bg-[#fffdf9]">
                <ul className="divide-y divide-line">
                  {payments.map((b) => (
                    <li key={b.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{b.title}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {b.kind} · Paid {shortDate(b.paidAt)}
                          {b.paymentId && b.provider === "razorpay" && <> · <span className="font-mono">{b.paymentId}</span></>}
                          {b.provider === "demo" && " · demo payment"}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", b.refundedAt ? "bg-paper-3 text-ink-2" : "bg-[#dde8de] text-moss")}>
                          {b.refundedAt ? "Refunded" : "Paid"}
                        </span>
                        <span className="w-20 text-right font-medium text-ink">{formatPrice(b.amount)}</span>
                        <Link href={`/account/receipts/${b.id}`} className="btn btn-ghost !py-2 text-ink">
                          <FileText className="size-4" /> Receipt
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-line bg-paper-2/60 px-5 py-3 text-sm text-ink-2">
                  Total paid: <strong className="text-ink">{formatPrice(payments.filter((b) => !b.refundedAt).reduce((t, b) => t + b.amount, 0)).replace("Free", "₹0")}</strong>
                </p>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-line p-8 text-center">
                <Wallet className="mx-auto size-8 text-accent" />
                <p className="display mt-3 text-3xl">No payments yet</p>
                <p className="mt-2 text-ink-2">Receipts for paid sessions and store purchases show up here.</p>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------ Profile & security ------------------------------ */}
        {tab === "profile" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-line bg-paper-2 p-5">
              <h2 className="font-medium text-ink">Your details</h2>
              <p className="mt-1 text-sm text-muted">Used for your bookings and receipts.</p>
              <div className="mt-4">
                <ProfileForm initial={{ name: student.name, phone: student.phone ?? "", email: student.email }} />
              </div>
            </div>
            <div className="scroll-mt-28 rounded-2xl border border-line bg-paper-2 p-5" id="password">
              <h2 className="font-medium text-ink">Password</h2>
              <p className="mt-1 text-sm text-muted">Got a password by email? Change it to one you&apos;ll remember. Other devices will be signed out.</p>
              <div className="mt-4">
                <ChangePasswordForm />
              </div>
            </div>
            <div className="space-y-6">
              <div className="rounded-2xl border border-line bg-[#fffdf9] p-5">
                <h2 className="font-medium text-ink">Account</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-muted">Email</dt><dd className="truncate text-ink">{student.email}</dd></div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Email verified</dt>
                    <dd className="text-ink">{student.emailVerifiedAt ? "Yes" : "Via booking email"}</dd>
                  </div>
                  <div className="flex justify-between gap-3"><dt className="text-muted">Member since</dt><dd className="text-ink">{shortDate(student.createdAt)}</dd></div>
                  {student.lastLoginAt && <div className="flex justify-between gap-3"><dt className="text-muted">Last login</dt><dd className="text-ink">{shortDate(student.lastLoginAt)}</dd></div>}
                  <div className="flex justify-between gap-3"><dt className="text-muted">Sessions booked</dt><dd className="text-ink">{active.length}</dd></div>
                </dl>
              </div>
              <div className="rounded-2xl border border-line bg-[#fffdf9] p-5">
                <h2 className="flex items-center gap-2 font-medium text-ink"><CircleHelp className="size-5 text-accent" /> Need help?</h2>
                <p className="mt-2 text-sm text-ink-2">
                  Questions about a booking, payment or refund? Reply to your booking confirmation email{settings.social.email ? (
                    <> or write to <a href={`mailto:${settings.social.email}`} className="underline underline-offset-4">{settings.social.email}</a></>
                  ) : null}
                  .
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
