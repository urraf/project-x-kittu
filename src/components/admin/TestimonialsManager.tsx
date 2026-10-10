"use client";

import { useState } from "react";
import { DownloadCloud, EyeOff, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/admin/api";
import { useApi } from "@/lib/admin/hooks";
import { AdminEmpty, Button, ConfirmDialog, Dialog, Field, LoadingBlock, PageHeader } from "@/components/admin/ui";
import { YouTubeIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";
import type { TestimonialDTO } from "@/lib/services/testimonials";

const EMPTY = { name: "", via: "", text: "", rating: 5 };

export function TestimonialsManager() {
  const { data, mutate, reload } = useApi<TestimonialDTO[]>("/api/admin/testimonials");
  const [importing, setImporting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<TestimonialDTO | null>(null);

  async function patch(t: TestimonialDTO, body: Partial<TestimonialDTO>) {
    mutate((d) => d?.map((x) => (x.id === t.id ? { ...x, ...body } : x)));
    try {
      await api(`/api/admin/testimonials/${t.id}`, { method: "PATCH", body });
    } catch (e) {
      toast.error(errorMessage(e));
      reload();
    }
  }

  async function importComments() {
    setImporting(true);
    try {
      const r = await api<{ videos: number; checked: number; added: number }>("/api/admin/testimonials/import", { method: "POST" });
      toast.success(r.added ? `${r.added} new testimonial${r.added === 1 ? "" : "s"} added` : "No new kind comments found", { description: `Checked ${r.checked} comments on ${r.videos} videos.` });
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setImporting(false);
    }
  }

  async function add() {
    setSaving(true);
    try {
      const t = await api<TestimonialDTO>("/api/admin/testimonials", { body: { ...form, rating: form.rating || null } });
      mutate((d) => [t, ...(d ?? [])]);
      setForm(EMPTY);
      setAddOpen(false);
      toast.success("Testimonial added");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    try {
      await api(`/api/admin/testimonials/${toDelete.id}`, { method: "DELETE" });
      mutate((d) => d?.filter((x) => x.id !== toDelete.id));
      toast.success("Deleted");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setToDelete(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Testimonials"
        description="Kind words shown on the homepage and sessions page next to session reviews. Import the warmest comments from your YouTube videos, or add messages students sent you."
        actions={
          <>
            <Button onClick={() => setAddOpen(true)}><Plus className="size-4" /> Add testimonial</Button>
            <Button variant="primary" onClick={importComments} loading={importing}>{!importing && <DownloadCloud className="size-4" />} Import from YouTube comments</Button>
          </>
        }
      />

      {!data ? (
        <LoadingBlock />
      ) : !data.length ? (
        <AdminEmpty title="No testimonials yet" description="Import from YouTube comments to pull in viewers' thank-you messages, or add one by hand." />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {data.map((t) => (
            <li key={t.id} className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-start", t.status === "hidden" && "opacity-55")}>
              <div className="min-w-0 flex-1">
                <p className="text-[0.95rem] leading-relaxed text-ink">“{t.text}”</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span className="font-medium text-ink-2">{t.name}</span>
                  {t.source === "youtube" ? (
                    <a href={`https://www.youtube.com/watch?v=${t.videoId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
                      <YouTubeIcon className="size-3 text-accent" /> {t.videoTitle ?? "YouTube comment"}
                    </a>
                  ) : (
                    t.via && <span>{t.via}</span>
                  )}
                  {t.likes > 0 && <span>· {t.likes} likes</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => patch(t, { featured: !t.featured })} title={t.featured ? "Unfeature" : "Feature (shown first)"} aria-pressed={t.featured} className={cn("grid size-9 place-items-center rounded-full border", t.featured ? "border-[#c08a1e] bg-[#f3e6c8] text-[#7a5410]" : "border-line text-muted hover:text-ink")}>
                  <Star className={cn("size-4", t.featured && "fill-current")} />
                </button>
                <button type="button" onClick={() => patch(t, { status: t.status === "hidden" ? "visible" : "hidden" })} title={t.status === "hidden" ? "Show on website" : "Hide from website"} aria-pressed={t.status === "hidden"} className={cn("grid size-9 place-items-center rounded-full border", t.status === "hidden" ? "border-ink bg-ink text-cream" : "border-line text-muted hover:text-ink")}>
                  <EyeOff className="size-4" />
                </button>
                <button type="button" onClick={() => setToDelete(t)} title="Delete" className="grid size-9 place-items-center rounded-full border border-line text-muted hover:border-accent/40 hover:text-accent-deep">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a testimonial"
        footer={<><Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="primary" onClick={add} loading={saving} disabled={!form.name.trim() || form.text.trim().length < 5}>Add</Button></>}
      >
        <div className="space-y-4">
          <Field label="What they said"><textarea className="field min-h-28" value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} maxLength={1200} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name"><input className="field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={100} /></Field>
            <Field label="Where they said it" hint="e.g. Instagram DM, LinkedIn"><input className="field" value={form.via} onChange={(e) => setForm((f) => ({ ...f, via: e.target.value }))} maxLength={60} /></Field>
          </div>
          <Field label="Rating (optional)">
            <select className="field" value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}>
              <option value={0}>No rating</option>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
            </select>
          </Field>
        </div>
      </Dialog>
      <ConfirmDialog open={!!toDelete} title="Delete this testimonial?" message="It will be removed from the website. To stop a YouTube comment coming back on the next import, hide it instead." confirmLabel="Delete" onConfirm={remove} onClose={() => setToDelete(null)} />
    </>
  );
}
