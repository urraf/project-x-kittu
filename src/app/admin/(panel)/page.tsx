import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert, FilePlus2, Sparkles } from "lucide-react";
import { SyncVideosButton } from "@/components/admin/SyncVideosButton";
import { Card, PageHeader, StatusBadge } from "@/components/admin/ui";
import { env, isGroqConfigured } from "@/lib/env";
import { listRuns } from "@/lib/services/automation";
import { countUnreadComments, engagementTotals, recentComments } from "@/lib/services/engagement";
import { getAccountInfo } from "@/lib/services/admin-account";
import { countNewMessages } from "@/lib/services/messages";
import { getPostStats, listAdminPosts } from "@/lib/services/posts";
import { getSettings } from "@/lib/services/settings";
import { formatCompact, formatDate, timeAgo, truncate } from "@/lib/utils/text";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [stats, recent, runs, messages, settings, totals, unreadComments, comments, account] = await Promise.all([
    getPostStats(),
    listAdminPosts({ limit: 6 }),
    listRuns(5),
    countNewMessages(),
    getSettings(),
    engagementTotals(),
    countUnreadComments(),
    recentComments(4),
    getAccountInfo(),
  ]);
  const hour = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = settings.profile.name.split(" ")[0];

  const tiles = [
    { label: "Published", value: stats.published, href: "/admin/posts?status=published" },
    { label: "Drafts", value: stats.drafts, href: "/admin/posts?status=draft" },
    { label: "Total views", value: formatCompact(totals.views) || "0", href: "/admin/posts" },
    { label: "Likes", value: formatCompact(totals.likes) || "0", href: "/admin/posts" },
    { label: "New comments", value: unreadComments, href: "/admin/comments", highlight: unreadComments > 0 },
    { label: "New messages", value: messages, href: "/admin/messages", highlight: messages > 0 },
  ];

  const aiReady = isGroqConfigured();
  const autoReady = aiReady && Boolean(env.cronSecret);

  return (
    <>
      <PageHeader
        kicker={formatDate(new Date())}
        title={<>{greeting}, <em className="text-accent">{firstName}</em>.</>}
        description="Here's what's happening across your website."
        actions={
          <>
            <Link href="/admin/ai" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-[#fffdf9] px-4 text-[0.88rem] font-medium hover:border-ink/40">
              <Sparkles className="size-4 text-accent" /> Write with AI
            </Link>
            <Link href="/admin/posts/new" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[0.88rem] font-medium text-cream hover:bg-ink-2">
              <FilePlus2 className="size-4" /> New post
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className={cn("card group p-5 transition-colors hover:border-ink/30", t.highlight && "border-accent/40 bg-accent-soft/40")}>
            <p className="kicker text-muted">{t.label}</p>
            <p className="display mt-3 text-4xl md:text-5xl">{t.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="!p-0">
            <div className="flex items-center justify-between border-b border-line px-5 py-4 md:px-6">
              <h2 className="font-medium">Recent posts</h2>
              <Link href="/admin/posts" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">All posts <ArrowRight className="size-3.5" /></Link>
            </div>
            {recent.items.length ? (
              <ul className="divide-y divide-line">
                {recent.items.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/posts/${p.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-paper-2/60 md:px-6">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.92rem] font-medium">{p.title}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {p.category} · {formatCompact(p.views) || 0} views · {p.likes} likes · {p.commentCount} comments
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

          <Card className="!p-0">
            <div className="flex items-center justify-between border-b border-line px-5 py-4 md:px-6">
              <h2 className="font-medium">Latest comments</h2>
              <Link href="/admin/comments" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">All comments <ArrowRight className="size-3.5" /></Link>
            </div>
            {comments.length ? (
              <ul className="divide-y divide-line">
                {comments.map((c) => (
                  <li key={c.id} className="px-5 py-3.5 md:px-6">
                    <p className="text-sm">
                      <span className="font-medium text-ink">{c.name}</span>
                      <span className="text-muted"> on {c.post?.title ?? "a post"} · {timeAgo(c.createdAt)}</span>
                      {c.status === "pending" && <span className="ml-2 rounded-full bg-[#f3e6c8] px-2 py-0.5 text-[0.68rem] text-[#7a5410]">Needs review</span>}
                    </p>
                    <p className="mt-1 text-sm text-ink-2">{truncate(c.message, 160)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-6 py-8 text-sm text-ink-2">No comments yet. They&apos;ll show up here as readers respond.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
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
                <CheckCircle2 className={cn("mt-0.5 size-4 shrink-0", settings.comments.enabled ? "text-moss" : "text-muted")} />
                <span className="text-ink">Comments are {settings.comments.enabled ? (settings.comments.requireApproval ? "on (with approval)" : "on") : "off"}</span>
              </li>
            </ul>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Automatic posts</h2>
              <Link href="/admin/ai" className="text-sm text-ink-2 hover:text-ink">Details</Link>
            </div>
            {runs.length ? (
              <ul className="mt-4 space-y-3">
                {runs.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 text-sm">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", r.status === "succeeded" ? "bg-moss" : r.status === "failed" ? "bg-accent" : "bg-[#c08a1e]")} />
                    <span className="min-w-0">
                      <span className="block truncate text-ink">{r.status === "failed" ? "Couldn't create a post" : r.status === "running" ? "Writing a post…" : r.message}</span>
                      <span className="text-xs text-muted">{r.trigger === "manual" ? "Started by you" : "Automatic"} · {timeAgo(r.startedAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-2">Nothing yet. Automatically written posts will be listed here.</p>
            )}
          </Card>

          <Card>
            <h2 className="font-medium">YouTube</h2>
            <p className="mt-1 text-sm text-ink-2">Pull in your latest uploads so they appear on the website.</p>
            <div className="mt-4"><SyncVideosButton /></div>
          </Card>
        </div>
      </div>
    </>
  );
}
