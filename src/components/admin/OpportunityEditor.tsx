"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ExternalLink, FolderTree, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiClientError, api, errorMessage } from "@/lib/admin/api";
import { ImageField } from "@/components/admin/ImageField";
import { Button, ConfirmDialog, Dialog, Field, PageHeader, Toggle } from "@/components/admin/ui";
import { DEGREE_LEVELS, FUNDING_TYPES } from "@/lib/opportunities/constants";
import { COUNTRY_OPTIONS } from "@/lib/opportunities/countries";
import { useApi } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils/cn";
import type { ImageDTO } from "@/lib/types";
import type { OpportunityDTO } from "@/lib/services/opportunities";

type CategoryNode = { id: string; name: string; children: { id: string; name: string }[] };

type Form = {
  title: string;
  categories: string[];
  organization: string;
  country: string;
  location: string;
  funding: string;
  deadline: string;
  rolling: boolean;
  period: string;
  degreeLevels: string[];
  fields: string[];
  summary: string;
  description: string;
  eligibility: string;
  benefits: string;
  applyUrl: string;
  sourceUrl: string;
  coverImage: ImageDTO | null;
  status: "draft" | "published";
  featured: boolean;
};

const toDate = (iso?: string) => (iso ? new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10) : "");

const fromDTO = (o?: OpportunityDTO): Form => ({
  title: o?.title ?? "",
  categories: o?.categories.map((c) => c.id) ?? [],
  organization: o?.organization ?? "",
  country: o?.country ?? "Japan",
  location: o?.location ?? "",
  funding: o?.funding ?? "fully-funded",
  deadline: toDate(o?.deadline),
  rolling: o?.rolling ?? false,
  period: o?.period ?? "",
  degreeLevels: o?.degreeLevels ?? [],
  fields: o?.fields ?? [],
  summary: o?.summary ?? "",
  description: o?.description ?? "",
  eligibility: o?.eligibility ?? "",
  benefits: o?.benefits ?? "",
  applyUrl: o?.applyUrl ?? "",
  sourceUrl: o?.sourceUrl ?? "",
  coverImage: o?.coverImage ?? null,
  status: o?.status ?? "draft",
  featured: o?.featured ?? false,
});

export function OpportunityEditor({ opportunity, siteUrl, aiReady }: { opportunity?: OpportunityDTO; siteUrl: string; aiReady: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(() => fromDTO(opportunity));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const { data: categoryTree } = useApi<CategoryNode[]>("/api/admin/opportunity-categories");
  const toggleCategory = (id: string) => set("categories", form.categories.includes(id) ? form.categories.filter((x) => x !== id) : [...form.categories, id]);

  async function save(status: Form["status"]) {
    setSaving(true);
    setErrors({});
    try {
      const body = { ...form, status };
      if (opportunity) {
        const updated = await api<OpportunityDTO>(`/api/admin/opportunities/${opportunity.id}`, { method: "PUT", body });
        setForm(fromDTO(updated));
        toast.success(status === "published" ? "Saved. It's live in the Opportunity finder." : "Saved as a draft (hidden from the site).");
        router.refresh();
      } else {
        const created = await api<OpportunityDTO>("/api/admin/opportunities", { body });
        toast.success(status === "published" ? "Published to the Opportunity finder." : "Saved as a draft.");
        router.replace(`/admin/opportunities/${created.id}`);
      }
    } catch (e) {
      if (e instanceof ApiClientError) {
        setErrors(e.fieldErrors);
        // Bring the first problem into view so it's obvious why it didn't save.
        requestAnimationFrame(() => document.querySelector("[data-field-error]")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      }
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function fillFromText() {
    setAiBusy(true);
    try {
      const d = await api<Partial<Form>>("/api/admin/opportunities/draft", { body: { text: aiText } });
      // Only overwrite fields the AI actually found.
      setForm((f) => {
        const next = { ...f };
        for (const [k, v] of Object.entries(d) as [keyof Form, Form[keyof Form]][]) {
          if (Array.isArray(v) ? v.length : typeof v === "boolean" ? v : v) (next as Record<string, unknown>)[k] = v;
        }
        return next;
      });
      setAiOpen(false);
      toast.success("Filled in from the text. Check every field (especially the deadline and link) before publishing.", { duration: 8000 });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setAiBusy(false);
    }
  }

  async function remove() {
    if (!opportunity) return;
    try {
      await api(`/api/admin/opportunities/${opportunity.id}`, { method: "DELETE" });
      toast.success("Deleted.");
      router.replace("/admin/opportunities");
    } catch (e) {
      toast.error(errorMessage(e));
      setConfirmDelete(false);
    }
  }

  const toggleLevel = (id: string) => set("degreeLevels", form.degreeLevels.includes(id) ? form.degreeLevels.filter((x) => x !== id) : [...form.degreeLevels, id]);

  return (
    <>
      <Link href="/admin/opportunities" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> All opportunities</Link>
      <PageHeader
        title={opportunity ? opportunity.title : "Add opportunity"}
        description={opportunity ? `${opportunity.views} views · ${opportunity.status === "published" ? (opportunity.closed ? "closed (hidden from the finder)" : "live") : "draft"}` : "Fill it in yourself, or paste the announcement and let the AI draft it."}
        actions={
          <>
            <Button onClick={() => setAiOpen(true)} disabled={!aiReady} title={aiReady ? undefined : "The AI assistant isn't connected"}>
              <Sparkles className="size-4 text-accent" /> Fill from text
            </Button>
            {opportunity?.status === "published" && (
              <a href={`${siteUrl}/opportunities/${opportunity.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-[#fffdf9] px-4 text-[0.88rem] font-medium hover:border-ink/40">
                <ExternalLink className="size-4" /> View
              </a>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="card min-w-0 space-y-5 p-5 md:p-6">
          <Field label="Title" htmlFor="o-title" error={errors.title} counter={{ value: form.title.length, max: 160 }}>
            <input id="o-title" className="field" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. OIST Research Internship 2027" />
          </Field>
          <div className={cn("rounded-xl border p-4", errors.categories ? "border-accent bg-accent-soft/30" : "border-line")} {...(errors.categories ? { "data-field-error": "" } : {})}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="label !mb-0">Categories <span className="font-normal text-muted">(pick one or more)</span></p>
              <Link href="/admin/opportunities/categories" target="_blank" className="inline-flex items-center gap-1 text-xs font-medium text-accent-deep hover:underline"><FolderTree className="size-3.5" /> Manage categories</Link>
            </div>
            {!categoryTree ? (
              <p className="mt-3 text-sm text-muted">Loading categories…</p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {categoryTree.map((top) => (
                  <div key={top.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                      <input type="checkbox" className="size-4 accent-[var(--color-accent)]" checked={form.categories.includes(top.id)} onChange={() => toggleCategory(top.id)} />
                      {top.name}
                    </label>
                    {top.children.map((c) => (
                      <label key={c.id} className="ml-6 mt-1.5 flex cursor-pointer items-center gap-2 text-sm text-ink-2">
                        <input type="checkbox" className="size-4 accent-[var(--color-accent)]" checked={form.categories.includes(c.id)} onChange={() => toggleCategory(c.id)} />
                        {c.name}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {errors.categories ? <p className="mt-2 text-[0.78rem] text-accent-deep">{errors.categories}</p> : <p className="hint">Tip: tick the most specific one (e.g. “Masters scholarships”). It also shows under its parent.</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Organisation" htmlFor="o-org" error={errors.organization}>
              <input id="o-org" className="field" value={form.organization} onChange={(e) => set("organization", e.target.value)} placeholder="e.g. Okinawa Institute of Science and Technology" />
            </Field>
            <Field label="Country" htmlFor="o-country" error={errors.country}>
              <input id="o-country" list="o-countries" className="field" value={form.country} onChange={(e) => set("country", e.target.value)} />
              <datalist id="o-countries">{COUNTRY_OPTIONS.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="City / campus (optional)" htmlFor="o-loc">
              <input id="o-loc" className="field" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Okinawa, or Online" />
            </Field>
            <Field label="Funding" htmlFor="o-funding" error={errors.funding}>
              <select id="o-funding" className="field" value={form.funding} onChange={(e) => set("funding", e.target.value)}>
                {FUNDING_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Program dates / duration (optional)" htmlFor="o-period">
              <input id="o-period" className="field" value={form.period} onChange={(e) => set("period", e.target.value)} placeholder="e.g. June–August 2027" />
            </Field>
          </div>
          <div className="rounded-xl border border-line p-4">
            <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
              <Field label="Application deadline" htmlFor="o-deadline" error={errors.deadline} hint="Closes at the end of this day (India time).">
                <input id="o-deadline" type="date" className="field" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} disabled={form.rolling} />
              </Field>
              <Toggle checked={form.rolling} onChange={(v) => (set("rolling", v), v && set("deadline", ""))} label="Rolling / no fixed deadline" description="Stays visible until you unpublish it." />
            </div>
          </div>
          <Field label="Who is it for?">
            <div className="flex flex-wrap gap-2">
              {DEGREE_LEVELS.map((d) => (
                <button key={d.id} type="button" onClick={() => toggleLevel(d.id)} className={cn("chip", form.degreeLevels.includes(d.id) && "!border-ink !bg-ink !text-cream")}>{d.label}</button>
              ))}
            </div>
          </Field>
          <Field label="Fields / subjects (optional)" htmlFor="o-fields" hint="Separate with commas, e.g. Engineering, Computer Science, Biology.">
            <input
              id="o-fields"
              className="field"
              defaultValue={form.fields.join(", ")}
              key={form.fields.join("|")}
              onBlur={(e) => set("fields", e.target.value.split(",").map((f) => f.trim()).filter(Boolean).slice(0, 12))}
            />
          </Field>
          <Field label="Short summary" htmlFor="o-summary" hint="1–2 sentences shown on the card." error={errors.summary} counter={{ value: form.summary.length, max: 500 }}>
            <textarea id="o-summary" rows={2} className="field" value={form.summary} onChange={(e) => set("summary", e.target.value)} />
          </Field>
          <Field label="About the program" htmlFor="o-desc" hint="Plain text. Blank lines start a new paragraph." error={errors.description} counter={{ value: form.description.length, max: 20000 }}>
            <textarea id="o-desc" rows={6} className="field" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Eligibility (one per line)" htmlFor="o-elig" error={errors.eligibility}>
              <textarea id="o-elig" rows={6} className="field text-sm" value={form.eligibility} onChange={(e) => set("eligibility", e.target.value)} placeholder={"Enrolled in a Bachelor's or Master's\nCGPA 7.0 or above\nIELTS 6.5"} />
            </Field>
            <Field label="Benefits (one per line)" htmlFor="o-ben" error={errors.benefits}>
              <textarea id="o-ben" rows={6} className="field text-sm" value={form.benefits} onChange={(e) => set("benefits", e.target.value)} placeholder={"Monthly stipend\nRound-trip airfare\nFree accommodation"} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Official apply link" htmlFor="o-apply" error={errors.applyUrl} hint="Required to publish.">
              <input id="o-apply" className="field" value={form.applyUrl} onChange={(e) => set("applyUrl", e.target.value)} placeholder="https://…" />
            </Field>
            <Field label="Source (optional)" htmlFor="o-src" error={errors.sourceUrl} hint="Where you found the announcement.">
              <input id="o-src" className="field" value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://…" />
            </Field>
          </div>
          <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">{form.status === "published" ? "Live in the Opportunity finder." : "Draft: hidden from the site."}</p>
            <div className="flex flex-wrap gap-2">
              {form.status === "published" ? (
                <>
                  <Button onClick={() => save("draft")} loading={saving}>Unpublish</Button>
                  <Button variant="primary" onClick={() => save("published")} loading={saving}>Save changes</Button>
                </>
              ) : (
                <>
                  <Button onClick={() => save("draft")} loading={saving}>Save draft</Button>
                  <Button variant="accent" onClick={() => save("published")} loading={saving}>Publish</Button>
                </>
              )}
            </div>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="card p-5">
            <ImageField label="Image (optional)" hint="A logo or campus photo, 16:9." value={form.coverImage} onChange={(v) => set("coverImage", v)} />
          </div>
          <div className="card p-5">
            <Toggle checked={form.featured} onChange={(v) => set("featured", v)} label="Feature it" description="Shown first among opportunities with the same deadline." />
          </div>
          {opportunity && (
            <div className="card p-5">
              <Button variant="ghost" className="w-full" onClick={() => setConfirmDelete(true)}><Trash2 className="size-4" /> Delete</Button>
            </div>
          )}
        </aside>
      </div>

      <Dialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        title="Fill from an announcement"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAiOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={fillFromText} loading={aiBusy} disabled={aiText.trim().length < 80}><Sparkles className="size-4" /> Fill the form</Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">Paste the full announcement text (from the official page or an email). The AI fills in only what the text says. Nothing is saved until you click Save.</p>
        <textarea rows={14} className="field mt-4 text-sm" value={aiText} onChange={(e) => setAiText(e.target.value)} placeholder="Paste the announcement here…" />
      </Dialog>
      <ConfirmDialog open={confirmDelete} title="Delete this opportunity?" message="It will be removed permanently." onConfirm={remove} onClose={() => setConfirmDelete(false)} />
    </>
  );
}
