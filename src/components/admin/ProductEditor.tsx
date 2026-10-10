"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, ExternalLink, FileUp, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ApiClientError, api, errorMessage } from "@/lib/admin/api";
import { ImageField } from "@/components/admin/ImageField";
import { Button, ConfirmDialog, Field, PageHeader, Toggle } from "@/components/admin/ui";
import { cn } from "@/lib/utils/cn";
import type { ImageDTO } from "@/lib/types";
import type { AdminProductDTO } from "@/lib/services/store";

const CATEGORIES = ["Guide", "Template", "Resource pack", "Workbook", "Course", "Checklist"];
const MAX_MB = 50;

type Form = {
  title: string;
  category: string;
  summary: string;
  description: string;
  highlights: string[];
  coverImage: ImageDTO | null;
  price: number;
  compareAtPrice: number | "";
  deliveryType: "file" | "link";
  deliveryUrl: string;
  status: "draft" | "published";
  featured: boolean;
};

const fromProduct = (p?: AdminProductDTO): Form => ({
  title: p?.title ?? "",
  category: p?.category ?? "Guide",
  summary: p?.summary ?? "",
  description: p?.description ?? "",
  highlights: p?.highlights ?? [],
  coverImage: p?.coverImage ?? null,
  price: p?.price ?? 499,
  compareAtPrice: p?.compareAtPrice ?? "",
  deliveryType: p?.delivery.type ?? "file",
  deliveryUrl: p?.delivery.url ?? "",
  status: p?.status ?? "draft",
  featured: p?.featured ?? false,
});

const bytes = (n?: number) => (!n ? "" : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export function ProductEditor({ product, siteUrl }: { product?: AdminProductDTO; siteUrl: string }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(() => fromProduct(product));
  const [current, setCurrent] = useState(product);
  const [file, setFile] = useState<File | null>(null);
  const [highlight, setHighlight] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const body = (status: Form["status"]) => ({ ...form, status, compareAtPrice: form.compareAtPrice === "" ? null : Number(form.compareAtPrice) });

  async function uploadFile(id: string) {
    if (!file) return current;
    const fd = new FormData();
    fd.append("file", file);
    const updated = await api<AdminProductDTO>(`/api/admin/products/${id}/file`, { form: fd });
    setFile(null);
    return updated;
  }

  async function save(status: Form["status"]) {
    setErrors({});
    if (file && file.size > MAX_MB * 1024 * 1024) return toast.error(`The file is larger than ${MAX_MB} MB. Use “Link” delivery for big files.`);
    setSaving(true);
    try {
      if (!current) {
        // Create as a draft first, attach the file, then publish if asked.
        let created = await api<AdminProductDTO>("/api/admin/products", { body: body("draft") });
        if (form.deliveryType === "file" && file) created = (await uploadFile(created.id))!;
        if (status === "published") created = await api<AdminProductDTO>(`/api/admin/products/${created.id}`, { method: "PUT", body: body("published") });
        toast.success(status === "published" ? "Product created and live in the store." : "Product saved as a draft.");
        router.replace(`/admin/products/${created.id}`);
        return;
      }
      if (form.deliveryType === "file" && file) setCurrent(await uploadFile(current.id));
      const updated = await api<AdminProductDTO>(`/api/admin/products/${current.id}`, { method: "PUT", body: body(status) });
      setCurrent(updated);
      setForm(fromProduct(updated));
      toast.success(status === "published" ? "Saved. The product is live in the store." : "Saved as a draft (hidden from the store).");
      router.refresh();
    } catch (e) {
      if (e instanceof ApiClientError) setErrors(e.fieldErrors);
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!current) return;
    try {
      await api(`/api/admin/products/${current.id}`, { method: "DELETE" });
      toast.success("Product deleted.");
      router.replace("/admin/products");
    } catch (e) {
      toast.error(errorMessage(e));
      setConfirmDelete(false);
    }
  }

  function addHighlight() {
    const v = highlight.trim();
    if (!v || form.highlights.length >= 12) return;
    set("highlights", [...form.highlights, v.slice(0, 160)]);
    setHighlight("");
  }

  const off = form.compareAtPrice && Number(form.compareAtPrice) > form.price ? Math.round((1 - form.price / Number(form.compareAtPrice)) * 100) : 0;

  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> All products</Link>
      <PageHeader
        title={current ? current.title : "New product"}
        description={current ? `${current.salesCount} sold · ${current.status === "published" ? "live in the store" : "draft"}` : "A digital product students can buy and download."}
        actions={
          current?.status === "published" ? (
            <a href={`${siteUrl}/store/${current.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-[#fffdf9] px-4 text-[0.88rem] font-medium hover:border-ink/40">
              <ExternalLink className="size-4" /> View in store
            </a>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="card min-w-0 space-y-5 p-5 md:p-6">
          <Field label="Title" htmlFor="p-title" error={errors.title} counter={{ value: form.title.length, max: 140 }}>
            <input id="p-title" className="field" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. MEXT Research Proposal Template Pack" />
          </Field>
          <Field label="Category" error={errors.category}>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => set("category", c)} className={cn("chip", form.category === c && "!border-ink !bg-ink !text-cream")}>{c}</button>
              ))}
              <input className="field !h-9 !w-40" value={CATEGORIES.includes(form.category) ? "" : form.category} onChange={(e) => set("category", e.target.value)} placeholder="Other…" aria-label="Custom category" />
            </div>
          </Field>
          <Field label="Short summary" htmlFor="p-summary" hint="Shown on the product card." error={errors.summary} counter={{ value: form.summary.length, max: 300 }}>
            <textarea id="p-summary" rows={2} className="field" value={form.summary} onChange={(e) => set("summary", e.target.value)} />
          </Field>
          <Field label="What's inside (key points)" hint="Short bullets, up to 12. Shown as a checklist.">
            <ul className="mb-2 space-y-1.5">
              {form.highlights.map((h, i) => (
                <li key={`${h}-${i}`} className="flex items-center gap-2 rounded-lg bg-paper-2 px-3 py-2 text-sm">
                  <span className="flex-1">{h}</span>
                  <button type="button" aria-label="Remove" onClick={() => set("highlights", form.highlights.filter((_, j) => j !== i))} className="grid size-6 place-items-center rounded-full hover:bg-paper-3"><X className="size-3.5" /></button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input className="field" value={highlight} onChange={(e) => setHighlight(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHighlight(); } }} placeholder="e.g. 3 real proposals that got accepted" />
              <Button type="button" onClick={addHighlight} aria-label="Add point"><Plus className="size-4" /></Button>
            </div>
          </Field>
          <Field label="Description" htmlFor="p-desc" hint="Plain text, blank lines start a new paragraph." error={errors.description}>
            <textarea id="p-desc" rows={7} className="field" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Price (₹)" htmlFor="p-price" hint="0 = free (still needs an account)." error={errors.price}>
              <input id="p-price" type="number" min={0} className="field" value={form.price} onChange={(e) => set("price", Number(e.target.value))} />
            </Field>
            <Field label="Original price (₹, optional)" htmlFor="p-cmp" hint={off ? `Shown struck through · ${off}% off` : "Shown struck through, for a sale."} error={errors.compareAtPrice}>
              <input id="p-cmp" type="number" min={0} className="field" value={form.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value === "" ? "" : Number(e.target.value))} />
            </Field>
          </div>

          <div className="rounded-xl border border-line p-4">
            <p className="label">How buyers get it</p>
            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(["file", "link"] as const).map((t) => (
                <label key={t} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm", form.deliveryType === t ? "border-ink bg-paper-2" : "border-line")}>
                  <input type="radio" checked={form.deliveryType === t} onChange={() => set("deliveryType", t)} className="mt-0.5 accent-[var(--color-accent)]" />
                  <span>
                    <span className="font-medium">{t === "file" ? "Upload a file" : "Share a link"}</span>
                    <span className="block text-xs text-muted">{t === "file" ? `PDF, ZIP, DOCX… up to ${MAX_MB} MB. Only buyers can download it.` : "Google Drive, Notion, a course page… revealed after purchase."}</span>
                  </span>
                </label>
              ))}
            </div>
            {form.deliveryType === "file" ? (
              <div className="mt-4">
                {current?.delivery.hasFile && !file && (
                  <p className="mb-2 text-sm text-ink-2">Current file: <strong className="text-ink">{current.delivery.fileName}</strong> <span className="text-muted">({bytes(current.delivery.fileSize)})</span></p>
                )}
                {file && <p className="mb-2 text-sm text-ink-2">Ready to upload: <strong className="text-ink">{file.name}</strong> <span className="text-muted">({bytes(file.size)}, uploads when you save)</span></p>}
                <input ref={fileInput} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <Button type="button" onClick={() => fileInput.current?.click()}><FileUp className="size-4" /> {current?.delivery.hasFile || file ? "Replace file" : "Choose file"}</Button>
                {errors.deliveryType && <p className="mt-2 text-[0.78rem] text-accent-deep">{errors.deliveryType}</p>}
              </div>
            ) : (
              <Field label="Link buyers receive" htmlFor="p-url" error={errors.deliveryUrl} className="mt-4">
                <input id="p-url" className="field" value={form.deliveryUrl} onChange={(e) => set("deliveryUrl", e.target.value)} placeholder="https://drive.google.com/…" />
              </Field>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">{form.status === "published" ? "Live in the store." : "Draft: hidden from the store."}</p>
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
            <ImageField label="Cover image" hint="4:3 works best. Shown on the card and product page." value={form.coverImage} onChange={(v) => set("coverImage", v)} aspect="aspect-[4/3]" />
          </div>
          <div className="card p-5">
            <Toggle checked={form.featured} onChange={(v) => set("featured", v)} label="Show as bestseller" description="Listed first, with a “Bestseller” badge." />
          </div>
          {current && (
            <div className="card p-5">
              <p className="kicker mb-3 text-muted">Sales</p>
              <p className="text-sm text-ink-2">{current.salesCount} sold · ₹{current.revenue.toLocaleString("en-IN")} collected</p>
              <Link href="/admin/payments" className="mt-2 inline-block text-sm font-medium text-accent-deep hover:underline">See payments</Link>
              <Button variant="ghost" className="mt-4 w-full" onClick={() => setConfirmDelete(true)} disabled={current.salesCount > 0} title={current.salesCount > 0 ? "Bought products can't be deleted. Unpublish instead." : undefined}>
                <Trash2 className="size-4" /> Delete product
              </Button>
            </div>
          )}
        </aside>
      </div>
      <ConfirmDialog open={confirmDelete} title="Delete this product?" message="It will be removed permanently, with its file." onConfirm={remove} onClose={() => setConfirmDelete(false)} />
    </>
  );
}
