"use client";

import { useState } from "react";
import { EyeOff, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiClientError, errorMessage } from "@/lib/admin/api";
import { useApi } from "@/lib/admin/hooks";
import { ImageField } from "@/components/admin/ImageField";
import { AdminEmpty, Button, ConfirmDialog, Dialog, Field, LoadingBlock, PageHeader, Toggle } from "@/components/admin/ui";
import { MILESTONE_KINDS } from "@/lib/site";
import type { ImageDTO, MilestoneDTO } from "@/lib/types";

type Draft = Omit<MilestoneDTO, "id" | "highlights" | "image"> & { id?: string; highlights: string; image: ImageDTO | null };

const KIND_LABELS: Record<string, string> = { education: "Education", career: "Career", travel: "Travel", achievement: "Milestone", channel: "Channel", life: "Life" };

const empty = (): Draft => ({ title: "", period: "", sortDate: new Date().toISOString().slice(0, 10), chapter: "", location: "", description: "", highlights: "", kind: "life", image: null, videoId: "", published: true });

export function JourneyManager() {
  const { data: items, reload: load } = useApi<MilestoneDTO[]>("/api/admin/milestones");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<MilestoneDTO | null>(null);


  function edit(m: MilestoneDTO) {
    setErrors({});
    setDraft({ ...m, sortDate: m.sortDate.slice(0, 10), highlights: m.highlights.join("\n"), image: m.image?.url ? { url: m.image.url, alt: m.image.alt ?? "" } : null, videoId: m.videoId ?? "" });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setErrors({});
    const body = {
      ...draft,
      id: undefined,
      highlights: draft.highlights.split("\n").map((h) => h.trim()).filter(Boolean),
      image: draft.image ? { url: draft.image.url, alt: draft.image.alt } : undefined,
      videoId: draft.videoId || null,
    };
    try {
      if (draft.id) await api(`/api/admin/milestones/${draft.id}`, { method: "PUT", body });
      else await api("/api/admin/milestones", { body });
      toast.success("Journey updated");
      setDraft(null);
      load();
    } catch (e) {
      if (e instanceof ApiClientError) setErrors(e.fieldErrors);
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    try {
      await api(`/api/admin/milestones/${toDelete.id}`, { method: "DELETE" });
      toast.success("Chapter removed");
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setToDelete(null);
    }
  }

  const d = draft;
  const upd = (patch: Partial<Draft>) => setDraft((x) => (x ? { ...x, ...patch } : x));

  return (
    <>
      <PageHeader
        title="Journey"
        description="The chapters of your story, shown as a timeline on the Journey page and homepage. They're ordered by date automatically."
        actions={<Button variant="primary" onClick={() => { setErrors({}); setDraft(empty()); }}><Plus className="size-4" /> Add chapter</Button>}
      />
      {!items ? (
        <LoadingBlock />
      ) : !items.length ? (
        <AdminEmpty title="No chapters yet" description="Add the moments that shaped your journey." />
      ) : (
        <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[1.1rem] before:top-4 before:w-px before:bg-line">
          {items.map((m, i) => (
            <li key={m.id} className="relative pl-11">
              <span className="absolute left-2 top-5 grid size-5 place-items-center rounded-full border-2 border-accent bg-paper font-mono text-[0.55rem]">{i + 1}</span>
              <div className={`card flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${m.published ? "" : "opacity-60"}`}>
                <div className="min-w-0 flex-1">
                  <p className="kicker text-accent-deep">{m.period} · {KIND_LABELS[m.kind] ?? m.kind}</p>
                  <p className="display mt-1 text-2xl leading-tight">{m.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    {m.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{m.location}</span>}
                    {m.chapter && <span>{m.chapter}</span>}
                    {!m.published && <span className="inline-flex items-center gap-1"><EyeOff className="size-3" /> Hidden</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => edit(m)}><Pencil className="size-3.5" /> Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => setToDelete(m)} aria-label={`Delete ${m.title}`}><Trash2 className="size-3.5" /></Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Dialog
        open={!!d}
        onClose={() => setDraft(null)}
        title={d?.id ? "Edit chapter" : "New chapter"}
        size="lg"
        footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" onClick={save} loading={saving}>Save chapter</Button></>}
      >
        {d && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Title" className="md:col-span-2" error={errors.title}>
              <input value={d.title} onChange={(e) => upd({ title: e.target.value })} className="field" placeholder="e.g. Day one in Japan" maxLength={140} />
            </Field>
            <Field label="Period (shown on the site)" hint="e.g. “Summer 2025” or “2022 – 2026”" error={errors.period}>
              <input value={d.period} onChange={(e) => upd({ period: e.target.value })} className="field" maxLength={60} />
            </Field>
            <Field label="Date (used for ordering)" error={errors.sortDate}>
              <input type="date" value={d.sortDate} onChange={(e) => upd({ sortDate: e.target.value })} className="field" />
            </Field>
            <Field label="Chapter label (optional)" hint="e.g. “Chapter 03 · Japan”">
              <input value={d.chapter} onChange={(e) => upd({ chapter: e.target.value })} className="field" maxLength={60} />
            </Field>
            <Field label="Type">
              <select value={d.kind} onChange={(e) => upd({ kind: e.target.value })} className="field">
                {MILESTONE_KINDS.map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
              </select>
            </Field>
            <Field label="Location (optional)" className="md:col-span-2">
              <input value={d.location} onChange={(e) => upd({ location: e.target.value })} className="field" placeholder="e.g. Kyoto, Japan" maxLength={100} />
            </Field>
            <Field label="Story" className="md:col-span-2" hint="Leave a blank line between paragraphs." error={errors.description}>
              <textarea rows={5} value={d.description} onChange={(e) => upd({ description: e.target.value })} className="field" maxLength={3000} />
            </Field>
            <Field label="Highlights (one per line, optional)" className="md:col-span-2">
              <textarea rows={3} value={d.highlights} onChange={(e) => upd({ highlights: e.target.value })} className="field text-sm" placeholder={"Fully funded research internship\nFirst vlogs filmed in Japan"} />
            </Field>
            <Field label="Related YouTube video (optional)" hint="Shows a “Watch this chapter” link." error={errors.videoId}>
              <input value={d.videoId ?? ""} onChange={(e) => upd({ videoId: e.target.value })} className="field" placeholder="YouTube link" />
            </Field>
            <div className="flex items-end pb-2">
              <Toggle checked={d.published} onChange={(v) => upd({ published: v })} label="Show on website" />
            </div>
            <div className="md:col-span-2">
              <ImageField label="Photo (optional)" value={d.image} onChange={(v) => upd({ image: v })} aspect="aspect-[16/10]" />
            </div>
          </div>
        )}
      </Dialog>
      <ConfirmDialog open={!!toDelete} title="Delete this chapter?" message={<>“{toDelete?.title}” will be removed from your journey.</>} onConfirm={remove} onClose={() => setToDelete(null)} />
    </>
  );
}
