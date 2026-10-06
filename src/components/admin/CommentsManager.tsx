"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, EyeOff, ExternalLink, Eye, MessageSquareReply, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/admin/api";
import { useApi } from "@/lib/admin/hooks";
import { AdminEmpty, Button, ConfirmDialog, LoadingBlock, PageHeader } from "@/components/admin/ui";
import { timeAgo } from "@/lib/utils/text";
import { cn } from "@/lib/utils/cn";
import type { AdminCommentDTO } from "@/lib/types";

type List = { items: AdminCommentDTO[]; total: number; page: number; pages: number };

const TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Needs review" },
  { id: "visible", label: "Visible" },
  { id: "hidden", label: "Hidden" },
] as const;

const STATUS_STYLE: Record<AdminCommentDTO["status"], string> = {
  visible: "bg-[#dde8de] text-moss",
  pending: "bg-[#f3e6c8] text-[#7a5410]",
  hidden: "bg-paper-3 text-ink-2",
};
const STATUS_LABEL: Record<AdminCommentDTO["status"], string> = { visible: "Visible", pending: "Needs review", hidden: "Hidden" };

export function CommentsManager() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [page, setPage] = useState(1);
  const { data, loading, mutate, reload } = useApi<List>(`/api/admin/comments?status=${tab}&page=${page}`);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminCommentDTO | null>(null);
  const markedRead = useRef(false);

  // Opening this page marks everything as read (clears the sidebar badge).
  useEffect(() => {
    if (!data || markedRead.current || !data.items.some((c) => !c.read)) return;
    markedRead.current = true;
    api("/api/admin/comments/read", { method: "POST" }).then(() => router.refresh()).catch(() => {});
  }, [data, router]);

  async function patch(c: AdminCommentDTO, body: { status?: AdminCommentDTO["status"]; reply?: string }, success: string) {
    setBusy(c.id);
    try {
      await api(`/api/admin/comments/${c.id}`, { method: "PATCH", body });
      toast.success(success);
      if (body.status && tab !== "all" && body.status !== tab) {
        mutate((d) => d && { ...d, items: d.items.filter((x) => x.id !== c.id) });
      } else {
        mutate((d) => d && { ...d, items: d.items.map((x) => (x.id === c.id ? { ...x, ...(body.status ? { status: body.status } : {}), ...(body.reply !== undefined ? { reply: body.reply ? { text: body.reply } : undefined } : {}) } : x)) });
      }
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!toDelete) return;
    setBusy(toDelete.id);
    try {
      await api(`/api/admin/comments/${toDelete.id}`, { method: "DELETE" });
      toast.success("Comment deleted");
      setToDelete(null);
      reload();
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader title="Comments" description="What readers are saying on your blog posts. Reply as the author, hide anything unkind, or delete spam." />

      <div className="no-scrollbar mb-5 flex gap-1 overflow-x-auto rounded-full border border-line bg-[#fffdf9] p-1 sm:inline-flex">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setPage(1);
            }}
            className={cn("whitespace-nowrap rounded-full px-4 py-1.5 text-[0.84rem]", tab === t.id ? "bg-ink text-cream" : "text-ink-2 hover:text-ink")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <LoadingBlock />
      ) : !data?.items.length ? (
        <AdminEmpty title={tab === "pending" ? "Nothing to review" : "No comments yet"} description="When readers comment on your posts, they'll appear here." />
      ) : (
        <ul className={cn("card divide-y divide-line overflow-hidden transition-opacity", loading && "opacity-60")}>
          {data.items.map((c) => (
            <li key={c.id} className="p-4 md:p-5">
              <div className="flex items-start gap-3">
                <span className={cn("mt-2 size-2 shrink-0 rounded-full", c.read ? "bg-transparent" : "bg-accent")} aria-label={c.read ? undefined : "New"} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-ink">{c.name}</span>
                    <span className="text-xs text-muted">{timeAgo(c.createdAt)}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-medium", STATUS_STYLE[c.status])}>{STATUS_LABEL[c.status]}</span>
                  </div>
                  {c.post && (
                    <a href={`/blog/${c.post.slug}#comments`} target="_blank" rel="noopener" className="mt-0.5 inline-flex items-center gap-1 text-xs text-accent-deep hover:underline">
                      on “{c.post.title}” <ExternalLink className="size-3" />
                    </a>
                  )}
                  <p className="mt-2 whitespace-pre-line break-words text-[0.95rem] leading-relaxed text-ink-2">{c.message}</p>

                  {c.reply && replyingTo !== c.id && (
                    <div className="mt-3 rounded-xl border-l-2 border-accent bg-paper-2 px-4 py-3 text-sm">
                      <p className="text-xs font-medium text-accent-deep">Your reply</p>
                      <p className="mt-1 whitespace-pre-line text-ink-2">{c.reply.text}</p>
                    </div>
                  )}

                  {replyingTo === c.id && (
                    <div className="mt-3">
                      <textarea autoFocus rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)} maxLength={2000} className="field text-sm" placeholder="Write a reply. It appears under the comment, marked as Author." />
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          loading={busy === c.id}
                          onClick={async () => {
                            await patch(c, { reply: replyText.trim(), ...(c.status !== "visible" && replyText.trim() ? { status: "visible" as const } : {}) }, replyText.trim() ? "Reply posted" : "Reply removed");
                            setReplyingTo(null);
                          }}
                        >
                          {replyText.trim() ? "Post reply" : "Remove reply"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {replyingTo !== c.id && (
                      <Button size="sm" onClick={() => { setReplyingTo(c.id); setReplyText(c.reply?.text ?? ""); }}>
                        <MessageSquareReply className="size-3.5" /> {c.reply ? "Edit reply" : "Reply"}
                      </Button>
                    )}
                    {c.status === "pending" && (
                      <Button size="sm" variant="primary" disabled={busy === c.id} onClick={() => patch(c, { status: "visible" }, "Comment approved")}>
                        <Check className="size-3.5" /> Approve
                      </Button>
                    )}
                    {c.status === "visible" && (
                      <Button size="sm" disabled={busy === c.id} onClick={() => patch(c, { status: "hidden" }, "Comment hidden from the site")}>
                        <EyeOff className="size-3.5" /> Hide
                      </Button>
                    )}
                    {c.status === "hidden" && (
                      <Button size="sm" disabled={busy === c.id} onClick={() => patch(c, { status: "visible" }, "Comment is visible again")}>
                        <Eye className="size-3.5" /> Show
                      </Button>
                    )}
                    <Button size="sm" variant="danger" onClick={() => setToDelete(c)}>
                      <Trash2 className="size-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">{data.total} comments</span>
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="font-mono text-xs text-muted">{page}/{data.pages}</span>
            <Button size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!toDelete} title="Delete this comment?" message={<>The comment from {toDelete?.name} will be permanently removed.</>} onConfirm={remove} onClose={() => setToDelete(null)} loading={busy === toDelete?.id} />
    </>
  );
}
