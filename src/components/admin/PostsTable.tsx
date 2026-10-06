"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, FilePlus2, Heart, MessageCircle, Pencil, Search, Sparkles, Trash2, Upload, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/admin/api";
import { useApi } from "@/lib/admin/hooks";
import { AdminEmpty, Button, ConfirmDialog, LoadingBlock, PageHeader, StatusBadge } from "@/components/admin/ui";
import { formatCompact, formatDate, timeAgo } from "@/lib/utils/text";
import { cn } from "@/lib/utils/cn";
import type { PostSummary } from "@/lib/types";

type List = { items: PostSummary[]; total: number; page: number; pages: number };

const TABS = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Drafts" },
  { id: "scheduled", label: "Scheduled" },
];

export function PostsTable({ initialStatus }: { initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<PostSummary | null>(null);

  const params = new URLSearchParams({ status, page: String(page), limit: "20", ...(query ? { q: query } : {}) });
  const { data, loading, reload: load } = useApi<List>(`/api/admin/posts?${params}`);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQuery(q.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  async function toggleStatus(p: PostSummary) {
    const next = p.status === "published" ? "draft" : "published";
    setBusy(p.id);
    try {
      await api(`/api/admin/posts/${p.id}`, { method: "PATCH", body: { status: next } });
      toast.success(next === "published" ? "Post published" : "Moved back to drafts");
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(toDelete.id);
    try {
      await api(`/api/admin/posts/${toDelete.id}`, { method: "DELETE" });
      toast.success("Post deleted");
      setToDelete(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Blog posts"
        description="Write, edit and publish articles. Drafts are only visible to you."
        actions={
          <>
            <Link href="/admin/ai" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-[#fffdf9] px-4 text-[0.88rem] font-medium hover:border-ink/40">
              <Sparkles className="size-4 text-accent" /> AI draft
            </Link>
            <Link href="/admin/posts/new" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[0.88rem] font-medium text-cream hover:bg-ink-2">
              <FilePlus2 className="size-4" /> New post
            </Link>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-[#fffdf9] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setStatus(t.id);
                setPage(1);
              }}
              className={cn("rounded-full px-4 py-1.5 text-[0.84rem] transition-colors", status === t.id ? "bg-ink text-cream" : "text-ink-2 hover:text-ink")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="relative block md:w-72">
          <span className="sr-only">Search posts</span>
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title…" className="field !rounded-full pl-10" />
        </label>
      </div>

      {loading && !data ? (
        <LoadingBlock />
      ) : !data?.items.length ? (
        <AdminEmpty
          title={query ? "No posts match that search" : "No posts here yet"}
          description={query ? "Try a different word." : "Start with a blank page or let the AI writer draft one for you."}
          action={<Link href="/admin/posts/new" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-cream">New post</Link>}
        />
      ) : (
        <div className={cn("card overflow-hidden transition-opacity", loading && "opacity-60")}>
          <ul className="divide-y divide-line">
            {data.items.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center md:px-5">
                <Link href={`/admin/posts/${p.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg bg-paper-3">
                    {(p.thumbnail ?? p.coverImage)?.url && <Image src={(p.thumbnail ?? p.coverImage)!.url} alt="" fill sizes="80px" className="object-cover" />}
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 font-medium leading-snug text-ink">{p.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      <span>{p.category}</span>
                      <span>·</span>
                      <span>{p.status === "published" && p.publishedAt ? formatDate(p.publishedAt, "short") : `Edited ${timeAgo(p.updatedAt)}`}</span>
                      {p.source !== "manual" && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 text-accent-deep"><Sparkles className="size-3" /> {p.source === "automation" ? "Auto" : "AI"}</span>
                        </>
                      )}
                    </span>
                  </span>
                </Link>
                <div className="flex flex-wrap items-center gap-1.5 pl-24 sm:pl-0">
                  {p.status === "published" && (
                    <span className="mr-2 flex items-center gap-3 text-xs text-muted" aria-label={`${p.views} views, ${p.likes} likes, ${p.commentCount} comments`}>
                      <span className="inline-flex items-center gap-1"><Eye className="size-3.5" />{formatCompact(p.views) || 0}</span>
                      <span className="inline-flex items-center gap-1"><Heart className="size-3.5" />{p.likes}</span>
                      <span className="inline-flex items-center gap-1"><MessageCircle className="size-3.5" />{p.commentCount}</span>
                    </span>
                  )}
                  <StatusBadge status={p.status} publishedAt={p.publishedAt} />
                  <div className="ml-2 flex items-center">
                    <Link href={`/admin/posts/${p.id}`} className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-paper-2 hover:text-ink" title="Edit" aria-label={`Edit ${p.title}`}>
                      <Pencil className="size-4" />
                    </Link>
                    <a href={`/admin/posts/${p.id}/preview`} target="_blank" rel="noopener" className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-paper-2 hover:text-ink" title="Preview" aria-label={`Preview ${p.title}`}>
                      <Eye className="size-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => toggleStatus(p)}
                      disabled={busy === p.id}
                      className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-paper-2 hover:text-ink disabled:opacity-40"
                      title={p.status === "published" ? "Unpublish" : "Publish"}
                      aria-label={p.status === "published" ? `Unpublish ${p.title}` : `Publish ${p.title}`}
                    >
                      {p.status === "published" ? <Undo2 className="size-4" /> : <Upload className="size-4" />}
                    </button>
                    <button type="button" onClick={() => setToDelete(p)} className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-accent-soft hover:text-accent-deep" title="Delete" aria-label={`Delete ${p.title}`}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {data.pages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm">
              <span className="text-muted">{data.total} posts</span>
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span className="font-mono text-xs text-muted">{page}/{data.pages}</span>
                <Button size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this post?"
        message={<>“{toDelete?.title}” will be permanently removed from your website. This can&apos;t be undone.</>}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
        loading={busy === toDelete?.id}
      />
    </>
  );
}
