"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { EyeOff, FileText, PenLine, Plus, Search, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/admin/api";
import { useApi } from "@/lib/admin/hooks";
import { SyncVideosButton } from "@/components/admin/SyncVideosButton";
import { AdminEmpty, Button, ConfirmDialog, Dialog, Field, LoadingBlock, PageHeader } from "@/components/admin/ui";
import { VIDEO_SERIES } from "@/lib/site";
import { cleanTitle, formatCompact, formatDate } from "@/lib/utils/text";
import { youtubeThumb } from "@/lib/utils/youtube";
import { cn } from "@/lib/utils/cn";
import type { VideoDTO } from "@/lib/types";

type BlogInfo = {
  eligible: number;
  pending: number;
  posts: Record<string, { id: string; slug: string; status: string; title: string }>;
  aiReady: boolean;
  autoEnabled: boolean;
};
type Batch = { written: { title: string }[]; failed: { title: string; error: string }[]; stoppedBecause?: string; remaining: number };

export function VideosManager() {
  const { data: videos, mutate, reload: loadVideos } = useApi<VideoDTO[]>("/api/admin/videos");
  const { data: blogs, reload: loadBlogs } = useApi<BlogInfo>("/api/admin/videos/blogs");
  const load = () => {
    loadVideos();
    loadBlogs();
  };
  const [writing, setWriting] = useState<string | null>(null);
  const [bulk, setBulk] = useState<{ done: number; total: number; last?: string } | null>(null);
  const stopRef = useRef(false);
  const setVideos = (fn: (prev: VideoDTO[] | undefined) => VideoDTO[] | null | undefined) => mutate((d) => fn(d) ?? undefined);
  const [q, setQ] = useState("");
  const [series, setSeries] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<VideoDTO | null>(null);


  const filtered = useMemo(
    () => (videos ?? []).filter((v) => (!series || v.series === series) && (!q || v.title.toLowerCase().includes(q.toLowerCase()))),
    [videos, q, series],
  );

  async function patch(v: VideoDTO, body: Partial<VideoDTO>) {
    setVideos((prev) => prev?.map((x) => (x.id === v.id ? { ...x, ...body } : x)) ?? null);
    try {
      await api(`/api/admin/videos/${v.id}`, { method: "PATCH", body });
    } catch (e) {
      toast.error(errorMessage(e));
      load();
    }
  }

  async function writeOne(v: VideoDTO) {
    setWriting(v.youtubeId);
    try {
      const r = await api<Batch>("/api/admin/videos/blogs", { body: { youtubeId: v.youtubeId } });
      if (r.written[0]) toast.success("Blog post written", { description: r.written[0].title });
      else toast.error(r.failed[0]?.error ?? r.stoppedBecause ?? "Couldn't write this one. Try again in a minute.");
      loadBlogs();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setWriting(null);
    }
  }

  /** Writes one article per request (about a minute each) until every video has one. */
  async function writeAll() {
    if (!blogs?.pending) return;
    stopRef.current = false;
    const total = blogs.pending;
    let done = 0;
    let failures = 0;
    setBulk({ done, total });
    try {
      while (!stopRef.current) {
        const r = await api<Batch>("/api/admin/videos/blogs", { body: {} });
        done += r.written.length;
        failures += r.failed.length;
        setBulk({ done, total, last: r.written[0]?.title });
        if (r.stoppedBecause) {
          toast.message(r.stoppedBecause);
          break;
        }
        if (r.remaining === 0 || (!r.written.length && !r.failed.length)) break;
        if (failures >= 3 && !done) {
          toast.error(r.failed[0]?.error ?? "Writing keeps failing. Try again later.");
          break;
        }
      }
      toast.success(`${done} blog post${done === 1 ? "" : "s"} written`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBulk(null);
      loadBlogs();
    }
  }

  async function add() {
    setAdding(true);
    try {
      const v = await api<VideoDTO>("/api/admin/videos", { body: { url } });
      setVideos((prev) => [v, ...(prev ?? [])]);
      toast.success("Video added");
      setUrl("");
      setAddOpen(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setAdding(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    try {
      await api(`/api/admin/videos/${toDelete.id}`, { method: "DELETE" });
      setVideos((prev) => prev?.filter((x) => x.id !== toDelete.id) ?? null);
      toast.success("Removed from website");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setToDelete(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Videos"
        description="Your YouTube videos as they appear on the website. Feature your best ones, organise them into series, or hide any you don't want shown."
        actions={
          <>
            <Button onClick={() => setAddOpen(true)}><Plus className="size-4" /> Add by link</Button>
            <SyncVideosButton variant="primary" onDone={load} />
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 md:flex-row">
        <label className="relative block md:w-72">
          <span className="sr-only">Search videos</span>
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search videos…" className="field !rounded-full pl-10" />
        </label>
        <select value={series} onChange={(e) => setSeries(e.target.value)} className="field !rounded-full md:w-56" aria-label="Filter by series">
          <option value="">All series</option>
          {VIDEO_SERIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {blogs && blogs.pending > 0 && (
        <div className="card mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-deep"><Sparkles className="size-5" /></span>
          <div className="min-w-0 flex-1 text-sm">
            {bulk ? (
              <>
                <p className="font-medium text-ink">Writing blog posts… {bulk.done} of {bulk.total} done</p>
                <p className="mt-0.5 truncate text-muted">{bulk.last ? `Last: ${bulk.last}` : "Each article takes about a minute. Keep this tab open."}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-3"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.round((bulk.done / Math.max(1, bulk.total)) * 100)}%` }} /></div>
              </>
            ) : (
              <>
                <p className="font-medium text-ink">{blogs.pending} of {blogs.eligible} videos don&apos;t have a blog post yet</p>
                <p className="mt-0.5 text-muted">
                  {blogs.aiReady
                    ? `Each one gets an article written from the video's title and description, with the video embedded.${blogs.autoEnabled ? " New uploads get one automatically when you sync." : ""}`
                    : "Add GROQ_API_KEY on the server to write blog posts with AI."}
                </p>
              </>
            )}
          </div>
          {bulk ? (
            <Button onClick={() => { stopRef.current = true; }}>Stop after this one</Button>
          ) : (
            <Button variant="accent" onClick={writeAll} disabled={!blogs.aiReady || !!writing}><PenLine className="size-4" /> Write blogs for all</Button>
          )}
        </div>
      )}

      {!videos ? (
        <LoadingBlock />
      ) : !filtered.length ? (
        <AdminEmpty title="No videos found" description="Use “Sync from YouTube” to pull in your latest uploads." />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {filtered.map((v) => (
            <div key={v.id} className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-center", v.hidden && "opacity-55")}>
              <a href={`/videos/${v.youtubeId}`} target="_blank" rel="noopener" className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-night sm:w-36">
                <Image src={youtubeThumb(v.youtubeId, "mq")} alt="" fill sizes="144px" className="object-cover" />
              </a>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[0.92rem] font-medium leading-snug">{cleanTitle(v.title)}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatDate(v.publishedAt, "short")}
                  {v.views ? ` · ${formatCompact(v.views)} views` : ""}
                  {v.isShort ? " · Short" : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {blogs?.posts[v.youtubeId] ? (
                  <Link href={`/admin/posts/${blogs.posts[v.youtubeId]!.id}`} title={blogs.posts[v.youtubeId]!.title} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#dde8de] px-3 text-xs font-medium text-moss hover:underline">
                    <FileText className="size-3.5" /> {blogs.posts[v.youtubeId]!.status === "published" ? "Blog live" : "Blog draft"}
                  </Link>
                ) : blogs && !v.isShort && !v.hidden ? (
                  <Button size="sm" onClick={() => writeOne(v)} loading={writing === v.youtubeId} disabled={!blogs.aiReady || (!!writing && writing !== v.youtubeId) || !!bulk}>
                    {writing !== v.youtubeId && <PenLine className="size-3.5" />} Write blog
                  </Button>
                ) : null}
                <select value={v.series} onChange={(e) => patch(v, { series: e.target.value })} className="field !w-auto !py-1.5 text-sm" aria-label="Series">
                  {VIDEO_SERIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <button type="button" onClick={() => patch(v, { featured: !v.featured })} title={v.featured ? "Unfeature" : "Feature on homepage"} aria-pressed={v.featured} className={cn("grid size-9 place-items-center rounded-full border", v.featured ? "border-[#c08a1e] bg-[#f3e6c8] text-[#7a5410]" : "border-line text-muted hover:text-ink")}>
                  <Star className={cn("size-4", v.featured && "fill-current")} />
                </button>
                <button type="button" onClick={() => patch(v, { hidden: !v.hidden })} title={v.hidden ? "Show on website" : "Hide from website"} aria-pressed={v.hidden} className={cn("grid size-9 place-items-center rounded-full border", v.hidden ? "border-ink bg-ink text-cream" : "border-line text-muted hover:text-ink")}>
                  <EyeOff className="size-4" />
                </button>
                <button type="button" onClick={() => setToDelete(v)} title="Remove" className="grid size-9 place-items-center rounded-full border border-line text-muted hover:border-accent/40 hover:text-accent-deep">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-muted"><Star className="inline size-3" /> Featured videos appear in the homepage spotlight. Hidden videos stay in this list but not on the website.</p>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add a video" footer={<><Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="primary" onClick={add} loading={adding} disabled={url.trim().length < 8}>Add video</Button></>}>
        <Field label="YouTube link" hint="Any public YouTube video link works.">
          <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} className="field" placeholder="https://www.youtube.com/watch?v=…" />
        </Field>
      </Dialog>
      <ConfirmDialog open={!!toDelete} title="Remove this video?" message="It will be removed from your website (not from YouTube). A future sync may bring it back. Use “hide” to keep it off permanently." confirmLabel="Remove" onConfirm={remove} onClose={() => setToDelete(null)} />
    </>
  );
}
