import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarPlus, CheckCircle2, CircleAlert, FilePlus2, Mail, MessageCircle, PackagePlus, SearchCheck, Sparkles, Users } from "lucide-react";
import { SyncVideosButton } from "@/components/admin/SyncVideosButton";
import { Card, PageHeader, StatusBadge } from "@/components/admin/ui";
import { env, isGroqConfigured } from "@/lib/env";
import { listAdminPayments, paymentsSummary } from "@/lib/services/admin-payments";
import { listRuns } from "@/lib/services/automation";
import { platformCounts } from "@/lib/services/dashboard";
import { countUnreadComments } from "@/lib/services/engagement";
import { getAccountInfo } from "@/lib/services/admin-account";
import { listAdminSessions } from "@/lib/services/mentorship";
import { countNewMessages } from "@/lib/services/messages";
import { getPostStats, listAdminPosts } from "@/lib/services/posts";
import { getSettings } from "@/lib/services/settings";
import { videoPostStats } from "@/lib/services/video-posts";
import { formatCompact, formatDate, timeAgo } from "@/lib/utils/text";
import { cn } from "@/lib/utils/cn";
import { formatPrice, formatSessionDate, formatSessionTime } from "@/lib/utils/session-time";

export const dynamic = "force-dynamic";

const QUICK = [
  { href: "/admin/sessions/new", label: "New session", Icon: CalendarPlus },
  { href: "/admin/products/new", label: "New product", Icon: PackagePlus },
  { href: "/admin/opportunities/new", label: "New opportunity", Icon: SearchCheck },
  { href: "/admin/posts/new", label: "New post", Icon: FilePlus2 },
];

export default async function Dashboard() {
  const [money, counts, posts, recentPosts, payments, runs, messages, settings, unreadComments, account, upcomingSessions, videoBlogs] = await Promise.all([
    paymentsSummary(),
    platformCounts(),
    getPostStats(),
    listAdminPosts({ limit: 4 }),
    listAdminPayments({ page: 1 }),
    listRuns(4),
    countNewMessages(),
    getSettings(),
    countUnreadComments(),
    getAccountInfo(),
    listAdminSessions("upcoming").then((l) => l.filter((s) => s.status !== "cancelled" && !s.ended)),
    videoPostStats().catch(() => ({ eligible: 0, pending: 0 })),
  ]);
  const hour = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = settings.profile.name.split(" ")[0];
  const seatsBooked = upcomingSessions.reduce((n, s) => n + s.seatsTaken, 0);
  const demoOnly = money.real.payments === 0 && money.demo.payments > 0;

  const tiles = [
    { label: "Revenue this month", value: formatPrice(money.real.thisMonth).replace("Free", "₹0"), sub: `${formatPrice(money.real.net).replace("Free", "₹0")} all time`, href: "/admin/payments", img: "inbox" },
    { label: "Students", value: formatCompact(counts.students) || "0", sub: counts.newStudents ? `+${counts.newStudents} this week` : "Accounts on the platform", href: "/admin/students", img: "student-woman" },
    { label: "Seats booked", value: String(seatsBooked), sub: `${upcomingSessions.length} upcoming session${upcomingSessions.length === 1 ? "" : "s"}`, href: "/admin/sessions", img: "video-camera" },
    { label: "Store orders", value: String(counts.orders), sub: `${counts.products} product${counts.products === 1 ? "" : "s"} live`, href: "/admin/products", img: "books" },
    { label: "Open opportunities", value: String(counts.opportunities), sub: "Accepting applications", href: "/admin/opportunities", img: "globe" },
    { label: "Blog posts", value: String(posts.published), sub: posts.drafts ? `${posts.drafts} draft${posts.drafts === 1 ? "" : "s"}` : "Published", href: "/admin/posts", img: "open-book" },
  ];
  const alerts = [
    messages > 0 && { href: "/admin/messages", label: `${messages} new message${messages === 1 ? "" : "s"}`, Icon: Mail },
    unreadComments > 0 && { href: "/admin/comments", label: `${unreadComments} new comment${unreadComments === 1 ? "" : "s"}`, Icon: MessageCircle },
    videoBlogs.pending > 0 && { href: "/admin/videos", label: `${videoBlogs.pending} video${videoBlogs.pending === 1 ? "" : "s"} without a blog post`, Icon: Sparkles },
  ].filter((a): a is { href: string; label: string; Icon: typeof Mail } => Boolean(a));

  const aiReady = isGroqConfigured();
  const autoReady = aiReady && Boolean(env.cronSecret);

  return (
    <>
      <PageHeader
        kicker={formatDate(new Date())}
        title={<>{greeting}, <em className="text-accent">{firstName}</em>.</>}
        description="Sessions, sales, students and content across your platform."
        actions={
          <Link href="/admin/ai" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-[#fffdf9] px-4 text-[0.88rem] font-medium hover:border-ink/40">
            <Sparkles className="size-4 text-accent" /> Write with AI
          </Link>
        }
      />

      {alerts.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {alerts.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft/60 px-3.5 py-1.5 text-sm font-medium text-accent-deep hover:bg-accent-soft">
              <Icon className="size-4" /> {label} <ArrowRight className="size-3.5" />
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="card group flex items-center gap-4 p-5 transition-colors hover:border-ink/30">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-paper-2">
              <Image src={`/images/3d/${t.img}.webp`} alt="" width={64} height={64} className="size-9" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-medium uppercase tracking-wider text-muted">{t.label}</span>
              <span className="display block text-[2.2rem] leading-tight">{t.value}</span>
              <span className="block truncate text-xs text-ink-2">{t.sub}</span>
            </span>
          </Link>
        ))}
      </div>
      {demoOnly && <p className="mt-2 text-xs text-muted">Revenue shows real payments only. There are {money.demo.payments} demo payment{money.demo.payments === 1 ? "" : "s"} ({formatPrice(money.demo.net)}) from testing.</p>}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {QUICK.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-2.5 rounded-2xl border border-line bg-[#fffdf9] px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-ink/30">
            <span className="grid size-8 place-items-center rounded-xl bg-accent-soft text-accent-deep"><Icon className="size-4" /></span>
            {label}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card className="!p-0">
            <div className="flex items-center justify-between border-b border-line px-5 py-4 md:px-6">
              <h2 className="font-medium">Recent payments</h2>
              <Link href="/admin/payments" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">All payments <ArrowRight className="size-3.5" /></Link>
            </div>
            {payments.items.length ? (
              <ul className="divide-y divide-line">
                {payments.items.slice(0, 5).map((p) => (
                  <li key={`${p.kind}-${p.id}`} className="flex items-center gap-4 px-5 py-3.5 md:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.92rem] font-medium">{p.name} <span className="font-normal text-muted">· {p.item?.title ?? (p.kind === "store" ? "Store order" : "Session")}</span></p>
                      <p className="mt-0.5 text-xs text-muted">{p.kind === "store" ? "Store" : "Session"} · {timeAgo(p.paidAt)}{p.provider === "demo" ? " · demo" : ""}</p>
                    </div>
                    <span className={cn("shrink-0 text-sm font-medium", p.status === "refunded" ? "text-muted line-through" : "text-ink")}>{formatPrice(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-6 py-8 text-sm text-ink-2">No payments yet. Paid session bookings and store orders appear here.</p>
            )}
          </Card>

          <Card className="!p-0">
            <div className="flex items-center justify-between border-b border-line px-5 py-4 md:px-6">
              <h2 className="font-medium">Recent posts</h2>
              <Link href="/admin/posts" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">All posts <ArrowRight className="size-3.5" /></Link>
            </div>
            {recentPosts.items.length ? (
              <ul className="divide-y divide-line">
                {recentPosts.items.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/posts/${p.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-paper-2/60 md:px-6">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.92rem] font-medium">{p.title}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {p.category} · {formatCompact(p.views) || 0} views · {p.commentCount} comments
                          {p.source !== "manual" && <> · <Sparkles className="inline size-3 text-accent" /> AI</>}
                        </p>
                      </div>
                      <StatusBadge status={p.status} publishedAt={p.publishedAt} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-6 py-10 text-sm text-ink-2">No posts yet. <Link href="/admin/posts/new" className="underline">Write your first one</Link>.</p>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card className="!p-0">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-medium">Upcoming sessions</h2>
              <Link href="/admin/sessions" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">All <ArrowRight className="size-3.5" /></Link>
            </div>
            {upcomingSessions.length ? (
              <ul className="divide-y divide-line">
                {upcomingSessions.slice(0, 4).map((s) => (
                  <li key={s.id}>
                    <Link href={`/admin/sessions/${s.id}`} className="block px-5 py-3.5 hover:bg-paper-2/60">
                      <p className="truncate text-[0.92rem] font-medium">{s.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                        <span>{formatSessionDate(s.startsAt)} · {formatSessionTime(s.startsAt)}</span>
                        <span className="inline-flex items-center gap-1"><Users className="size-3" /> {s.seatsTaken}/{s.capacity}</span>
                        {s.status === "draft" && <span className="rounded-full bg-paper-3 px-1.5 text-ink-2">Draft</span>}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-6 text-sm text-ink-2">
                <p>No sessions scheduled.</p>
                <Link href="/admin/sessions/new" className="mt-3 inline-flex items-center gap-1.5 font-medium text-accent-deep"><CalendarPlus className="size-4" /> Schedule one</Link>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-medium">YouTube &amp; video blogs</h2>
            <p className="mt-1 text-sm text-ink-2">
              {videoBlogs.eligible ? `${videoBlogs.eligible - videoBlogs.pending} of ${videoBlogs.eligible} videos have a blog post.` : "Pull in your latest uploads so they appear on the website."}
              {settings.automation.videoPosts && " New uploads get one automatically when you sync."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <SyncVideosButton />
              {videoBlogs.pending > 0 && <Link href="/admin/videos" className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-[0.88rem] font-medium hover:border-ink/40">Write missing blogs</Link>}
            </div>
          </Card>

          <Card>
            <h2 className="font-medium">Website status</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                {aiReady ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-moss" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-[#c08a1e]" />}
                <span>
                  <span className="text-ink">{aiReady ? "AI writer is ready" : "AI writer isn't connected"}</span>
                  {!aiReady && <span className="block text-xs text-muted">Ask your developer to connect the AI service.</span>}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                {settings.automation.enabled && autoReady ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-moss" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-[#c08a1e]" />}
                <span>
                  <span className="text-ink">Automatic posting is {settings.automation.enabled ? "on" : "off"}</span>
                  <span className="block text-xs text-muted">
                    {!autoReady ? "Needs a one-time setup from your developer." : settings.automation.enabled ? `Up to ${settings.automation.maxPerDay} new post${settings.automation.maxPerDay > 1 ? "s" : ""} a day.` : "Turn it on in Settings → Automation."}
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                {account.passwordChangedAt && account.email ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-moss" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-[#c08a1e]" />}
                <span>
                  <span className="text-ink">
                    {!account.passwordChangedAt ? "Still using the starting password" : !account.email ? "No login email set yet" : "Login secured by you"}
                  </span>
                  {(!account.passwordChangedAt || !account.email) && (
                    <Link href="/admin/settings?tab=password" className="block text-xs text-accent-deep underline">
                      {!account.passwordChangedAt ? "Change it now" : "Add a login email"}
                    </Link>
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className={cn("mt-0.5 size-4 shrink-0", counts.testimonials ? "text-moss" : "text-muted")} />
                <span className="text-ink">{counts.testimonials} testimonial{counts.testimonials === 1 ? "" : "s"} on the website</span>
              </li>
            </ul>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-medium">AI writer activity</h2>
              <Link href="/admin/ai" className="text-sm text-ink-2 hover:text-ink">Details</Link>
            </div>
            {runs.length ? (
              <ul className="mt-4 space-y-3">
                {runs.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 text-sm">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", r.status === "succeeded" ? "bg-moss" : r.status === "failed" ? "bg-accent" : "bg-[#c08a1e]")} />
                    <span className="min-w-0">
                      <span className="block truncate text-ink">{r.status === "failed" ? "Couldn't create a post" : r.status === "running" ? "Writing a post…" : r.message}</span>
                      <span className="text-xs text-muted">{r.idempotencyKey.startsWith("video:") ? "Video blog" : r.trigger === "manual" ? "Started by you" : "Automatic"} · {timeAgo(r.startedAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-2">Nothing yet. Automatically written posts will be listed here.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
