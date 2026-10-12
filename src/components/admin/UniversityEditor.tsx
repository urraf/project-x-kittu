"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, BadgeCheck, ExternalLink, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ApiClientError, api, errorMessage } from "@/lib/admin/api";
import { ImageField } from "@/components/admin/ImageField";
import { Button, ConfirmDialog, Field, PageHeader, Toggle } from "@/components/admin/ui";
import type { ImageDTO } from "@/lib/types";
import type { ProgramDTO, UniversityDTO } from "@/lib/services/universities";
import { FIELDS, REGIONS, TAGS, TAG_LABELS } from "@/lib/universities/taxonomy";
import { cn } from "@/lib/utils/cn";

type Program = Omit<ProgramDTO, "id">;
type Form = {
  name: string;
  nameJa: string;
  type: "national" | "public" | "private";
  city: string;
  prefecture: string;
  region: string;
  fields: string[];
  tags: string[];
  tier: number;
  website: string;
  summary: string;
  strengths: string;
  programs: Program[];
  scholarships: string;
  coverImage: ImageDTO | null;
  status: "draft" | "published";
  featured: boolean;
};

const blankProgram = (): Program => ({ name: "", degree: "master", field: "", language: "english", intake: "", url: "", notes: "" });
const fromDTO = (u?: UniversityDTO): Form => ({
  name: u?.name ?? "",
  nameJa: u?.nameJa ?? "",
  type: u?.type ?? "national",
  city: u?.city ?? "",
  prefecture: u?.prefecture ?? "",
  region: u?.region ?? "",
  fields: u?.fields ?? [],
  tags: u?.tags ?? [],
  tier: u?.tier ?? 3,
  website: u?.website ?? "",
  summary: u?.summary ?? "",
  strengths: (u?.strengths ?? []).join(", "),
  programs: (u?.programs ?? []).map((p) => ({ name: p.name, degree: p.degree, field: p.field, language: p.language, intake: p.intake, url: p.url, notes: p.notes })),
  scholarships: u?.scholarships ?? "",
  coverImage: u?.coverImage ?? null,
  status: u?.status ?? "published",
  featured: u?.featured ?? false,
});

export function UniversityEditor({ university, siteUrl }: { university?: UniversityDTO; siteUrl: string }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(() => fromDTO(university));
  const [verifiedAt, setVerifiedAt] = useState(university?.lastVerifiedAt);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setProgram = (i: number, patch: Partial<Program>) => set("programs", form.programs.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  async function save(markVerified: boolean) {
    setSaving(true);
    setErrors({});
    const body = { ...form, strengths: form.strengths.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12), markVerified };
    try {
      if (university) {
        const u = await api<UniversityDTO>(`/api/admin/universities/${university.id}`, { method: "PUT", body });
        setForm(fromDTO(u));
        setVerifiedAt(u.lastVerifiedAt);
        toast.success(markVerified ? "Saved and marked as verified today." : "Saved.");
        router.refresh();
      } else {
        const u = await api<UniversityDTO>("/api/admin/universities", { body });
        toast.success("University added.");
        router.replace(`/admin/universities/${u.id}`);
      }
    } catch (e) {
      if (e instanceof ApiClientError) setErrors(e.fieldErrors);
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!university) return;
    try {
      await api(`/api/admin/universities/${university.id}`, { method: "DELETE" });
      toast.success("Deleted.");
      router.replace("/admin/universities");
    } catch (e) {
      toast.error(errorMessage(e));
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <Link href="/admin/universities" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> All universities</Link>
      <PageHeader
        title={university ? university.name : "Add university"}
        description={verifiedAt ? `Last verified ${new Date(verifiedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "Not verified yet. Add programs from official pages, then click “Save & mark verified”."}
        actions={
          university && university.status === "published" ? (
            <a href={`${siteUrl}/universities/${university.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-[#fffdf9] px-4 text-[0.88rem] font-medium hover:border-ink/40"><ExternalLink className="size-4" /> View</a>
          ) : undefined
        }
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="card min-w-0 space-y-5 p-5 md:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="u-name" error={errors.name}><input id="u-name" className="field" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Japanese name (optional)" htmlFor="u-ja"><input id="u-ja" className="field" value={form.nameJa} onChange={(e) => set("nameJa", e.target.value)} placeholder="e.g. 東北大学" /></Field>
            <Field label="Type" htmlFor="u-type">
              <select id="u-type" className="field" value={form.type} onChange={(e) => set("type", e.target.value as Form["type"])}>
                <option value="national">National</option><option value="public">Public</option><option value="private">Private</option>
              </select>
            </Field>
            <Field label="City" htmlFor="u-city"><input id="u-city" className="field" value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
          </div>
          <Field label="Official website" htmlFor="u-web" error={errors.website}><input id="u-web" className="field" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" /></Field>
          <Field label="Summary" htmlFor="u-sum" counter={{ value: form.summary.length, max: 400 }}><textarea id="u-sum" rows={3} className="field" value={form.summary} onChange={(e) => set("summary", e.target.value)} /></Field>
          <div className="rounded-2xl border border-line bg-paper-2/50 p-4">
            <p className="text-sm font-medium text-ink">Profile for JapanUniMatch</p>
            <p className="mt-0.5 text-xs text-muted">Used by the directory filters and the university recommender.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Prefecture" htmlFor="u-pref"><input id="u-pref" className="field" value={form.prefecture} onChange={(e) => set("prefecture", e.target.value)} placeholder="e.g. Miyagi" /></Field>
              <Field label="Region" htmlFor="u-region">
                <select id="u-region" className="field" value={form.region} onChange={(e) => set("region", e.target.value)}>
                  <option value="">Not set</option>
                  {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </Field>
              <Field label="Selectivity" htmlFor="u-tier" hint="For reach/match/safe labels.">
                <select id="u-tier" className="field" value={form.tier} onChange={(e) => set("tier", Number(e.target.value))}>
                  <option value={1}>1 · Most competitive</option>
                  <option value={2}>2 · Competitive</option>
                  <option value={3}>3 · Accessible</option>
                </select>
              </Field>
            </div>
            <p className="mt-3 text-xs font-medium text-ink-2">Main fields</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {FIELDS.map((x) => {
                const on = form.fields.includes(x.id);
                return <button key={x.id} type="button" aria-pressed={on} onClick={() => set("fields", on ? form.fields.filter((v) => v !== x.id) : [...form.fields, x.id])} className={cn("chip !py-1 text-xs", on && "!border-ink !bg-ink !text-cream")}>{x.label}</button>;
              })}
            </div>
            <p className="mt-3 text-xs font-medium text-ink-2">Tags</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {TAGS.map((t) => {
                const on = form.tags.includes(t);
                return <button key={t} type="button" aria-pressed={on} onClick={() => set("tags", on ? form.tags.filter((v) => v !== t) : [...form.tags, t])} className={cn("chip !py-1 text-xs", on && "!border-ink !bg-ink !text-cream")}>{TAG_LABELS[t]}</button>;
              })}
            </div>
          </div>
          <Field label="Research strengths (comma separated)" htmlFor="u-str"><input id="u-str" className="field" value={form.strengths} onChange={(e) => set("strengths", e.target.value)} placeholder="e.g. Robotics, Materials science, AI" /></Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="label !mb-0">Programs for international students</p>
              <Button size="sm" type="button" onClick={() => set("programs", [...form.programs, blankProgram()])}><Plus className="size-3.5" /> Add program</Button>
            </div>
            {form.programs.length === 0 && <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">No programs yet. Add the English-taught programs from the university&apos;s official admissions pages.</p>}
            <ul className="space-y-3">
              {form.programs.map((p, i) => (
                <li key={i} className="rounded-xl border border-line bg-paper-2/40 p-4">
                  <div className="flex items-start gap-2">
                    <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                      <input className="field sm:col-span-2" value={p.name} onChange={(e) => setProgram(i, { name: e.target.value })} placeholder="Program name, e.g. Graduate Program in Data Science" aria-label="Program name" />
                      <select className="field" value={p.degree} onChange={(e) => setProgram(i, { degree: e.target.value })} aria-label="Degree">
                        <option value="bachelor">Bachelor&apos;s</option><option value="master">Master&apos;s</option><option value="phd">PhD</option><option value="research">Research student</option><option value="exchange">Exchange</option>
                      </select>
                      <select className="field" value={p.language} onChange={(e) => setProgram(i, { language: e.target.value as Program["language"] })} aria-label="Language">
                        <option value="english">Fully in English</option><option value="mixed">English + Japanese</option><option value="japanese">Japanese</option>
                      </select>
                      <input className="field" value={p.field} onChange={(e) => setProgram(i, { field: e.target.value })} placeholder="Field, e.g. Computer Science" aria-label="Field" />
                      <input className="field" value={p.intake} onChange={(e) => setProgram(i, { intake: e.target.value })} placeholder="Intake, e.g. April / October" aria-label="Intake" />
                      <input className="field sm:col-span-2" value={p.url} onChange={(e) => setProgram(i, { url: e.target.value })} placeholder="Official program page https://…" aria-label="Official URL" />
                      <input className="field sm:col-span-2" value={p.notes} onChange={(e) => setProgram(i, { notes: e.target.value })} placeholder="Notes (optional), e.g. IELTS 6.5, supervisor acceptance needed" aria-label="Notes" />
                    </div>
                    <button type="button" onClick={() => set("programs", form.programs.filter((_, j) => j !== i))} aria-label="Remove program" className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-paper-3 hover:text-ink"><X className="size-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
            {Object.keys(errors).some((k) => k.startsWith("programs")) && <p className="mt-2 text-[0.78rem] text-accent-deep">Check the programs: each needs a name, and links must start with https://</p>}
          </div>

          <Field label="Scholarships & funding (optional)" htmlFor="u-sch" hint="e.g. MEXT university recommendation, tuition waivers. Plain text.">
            <textarea id="u-sch" rows={4} className="field text-sm" value={form.scholarships} onChange={(e) => set("scholarships", e.target.value)} />
          </Field>
          <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">Mark verified only after checking the details on official pages.</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => save(false)} loading={saving}>Save</Button>
              <Button variant="primary" onClick={() => save(true)} loading={saving} disabled={!form.programs.length} title={form.programs.length ? undefined : "Add at least one program first"}>
                <BadgeCheck className="size-4" /> Save &amp; mark verified
              </Button>
            </div>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="card p-5"><ImageField label="Image (optional)" hint="A campus photo, 16:9." value={form.coverImage} onChange={(v) => set("coverImage", v)} /></div>
          <div className="card space-y-4 p-5">
            <Toggle checked={form.status === "published"} onChange={(v) => set("status", v ? "published" : "draft")} label="Show on the website" />
            <Toggle checked={form.featured} onChange={(v) => set("featured", v)} label="Feature it" description="Listed first in the directory." />
          </div>
          {university && <div className="card p-5"><Button variant="ghost" className="w-full" onClick={() => setConfirmDelete(true)}><Trash2 className="size-4" /> Delete</Button></div>}
        </aside>
      </div>
      <ConfirmDialog open={confirmDelete} title="Delete this university?" message="It will be removed from the directory." onConfirm={remove} onClose={() => setConfirmDelete(false)} />
    </>
  );
}
