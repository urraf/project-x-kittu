"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, CornerDownRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiClientError, api, errorMessage } from "@/lib/admin/api";
import { useApi } from "@/lib/admin/hooks";
import { Button, ConfirmDialog, Dialog, Field, LoadingBlock, PageHeader } from "@/components/admin/ui";

type Cat = { id: string; name: string; slug: string; parentId: string | null; order: number; used: number };
type Node = Cat & { children: Cat[] };
type Edit = { id?: string; name: string; parentId: string | null; hasChildren?: boolean };

/** Studio → Opportunities → Categories: categories with one level of subcategories. */
export function OpportunityCategoriesManager() {
  const { data, loading, reload } = useApi<Node[]>("/api/admin/opportunity-categories");
  const [edit, setEdit] = useState<Edit | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Cat | null>(null);

  async function save() {
    if (!edit) return;
    setSaving(true);
    setErrors({});
    try {
      const body = { name: edit.name, parentId: edit.parentId };
      if (edit.id) await api(`/api/admin/opportunity-categories/${edit.id}`, { method: "PATCH", body });
      else await api("/api/admin/opportunity-categories", { body });
      toast.success(edit.id ? "Category updated" : "Category added");
      setEdit(null);
      reload();
    } catch (e) {
      if (e instanceof ApiClientError) setErrors(e.fieldErrors);
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function move(c: Cat, direction: "up" | "down") {
    try {
      await api(`/api/admin/opportunity-categories/${c.id}`, { method: "PATCH", body: { move: direction } });
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await api(`/api/admin/opportunity-categories/${deleting.id}`, { method: "DELETE" });
      toast.success("Category deleted");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(null);
    }
  }

  const row = (c: Cat, i: number, siblings: Cat[], child: boolean, hasChildren = false) => (
    <div className={child ? "flex items-center gap-3 py-2.5 pl-10 pr-4" : "flex items-center gap-3 px-4 py-3"}>
      {child && <CornerDownRight className="-ml-6 size-4 shrink-0 text-muted" />}
      <div className="min-w-0 flex-1">
        <p className={child ? "text-sm text-ink" : "font-medium text-ink"}>{c.name}</p>
        <p className="text-xs text-muted">{c.used} opportunit{c.used === 1 ? "y" : "ies"} · /opportunities?category={c.slug}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(c, "up")}><ArrowUp className="size-3.5" /></Button>
        <Button size="sm" variant="ghost" aria-label="Move down" disabled={i === siblings.length - 1} onClick={() => move(c, "down")}><ArrowDown className="size-3.5" /></Button>
        {!child && <Button size="sm" variant="ghost" onClick={() => { setErrors({}); setEdit({ name: "", parentId: c.id }); }}><Plus className="size-3.5" /> Sub</Button>}
        <Button size="sm" variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => { setErrors({}); setEdit({ id: c.id, name: c.name, parentId: c.parentId, hasChildren }); }}><Pencil className="size-3.5" /></Button>
        <Button size="sm" variant="ghost" aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)}><Trash2 className="size-3.5" /></Button>
      </div>
    </div>
  );

  return (
    <>
      <Link href="/admin/opportunities" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> All opportunities</Link>
      <PageHeader
        title="Opportunity categories"
        description="Categories and subcategories students filter by in the Opportunity finder. An opportunity can be in several. Choosing a category also shows everything in its subcategories."
        actions={<Button variant="primary" onClick={() => { setErrors({}); setEdit({ name: "", parentId: null }); }}><Plus className="size-4" /> Add category</Button>}
      />
      {loading && !data ? (
        <LoadingBlock />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {data?.map((top, i) => (
            <li key={top.id}>
              {row(top, i, data, false, top.children.length > 0)}
              {top.children.length > 0 && (
                <ul className="border-t border-dashed border-line bg-paper-2/40">
                  {top.children.map((c, j) => <li key={c.id}>{row(c, j, top.children, true)}</li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? "Edit category" : edit?.parentId ? "Add subcategory" : "Add category"}
        footer={
          <>
            <Button onClick={() => setEdit(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={save}>{edit?.id ? "Save" : "Add"}</Button>
          </>
        }
      >
        {edit && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <Field label="Name" htmlFor="cat-name" error={errors.name} hint="e.g. Masters scholarships, International internships">
              <input id="cat-name" className="field" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={60} autoFocus />
            </Field>
            <Field label="Inside" htmlFor="cat-parent" error={errors.parentId} hint={edit.hasChildren ? "This category has subcategories, so it stays top-level." : "Top level, or a subcategory of another category."}>
              <select id="cat-parent" className="field" value={edit.parentId ?? ""} disabled={edit.hasChildren} onChange={(e) => setEdit({ ...edit, parentId: e.target.value || null })}>
                <option value="">Top level (no parent)</option>
                {data?.filter((t) => t.id !== edit.id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
          </form>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        title={`Delete “${deleting?.name ?? ""}”?`}
        message={
          deleting?.used
            ? `${deleting.used} opportunit${deleting.used === 1 ? "y uses" : "ies use"} it. ${deleting.parentId ? "They'll move to the parent category." : "They'll stay published, just without this category."}`
            : "Nothing uses this category."
        }
        confirmLabel="Delete"
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
