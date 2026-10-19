"use client";

import { useState } from "react";
import { Eye, EyeOff, Pin, PinOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/admin/api";
import { useApi } from "@/lib/admin/hooks";
import { AdminEmpty, Button, ConfirmDialog, LoadingBlock, PageHeader } from "@/components/admin/ui";
import { Stars } from "@/components/mentorship/Stars";
import { cn } from "@/lib/utils/cn";
import type { ReviewDTO } from "@/lib/types";

export function ReviewsManager() {
  const { data, loading, mutate } = useApi<ReviewDTO[]>("/api/admin/reviews");
  const [deleting, setDeleting] = useState<ReviewDTO | null>(null);
  const [busy, setBusy] = useState(false);

  async function patch(r: ReviewDTO, body: Partial<Pick<ReviewDTO, "status" | "featured">>) {
    mutate((list) => list?.map((x) => (x.id === r.id ? { ...x, ...body } : x)));
    try {
      await api(`/api/admin/reviews/${r.id}`, { method: "PATCH", body });
    } catch (e) {
      mutate((list) => list?.map((x) => (x.id === r.id ? r : x)));
      toast.error(errorMessage(e));
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/admin/reviews/${deleting.id}`, { method: "DELETE" });
      mutate((list) => list?.filter((x) => x.id !== deleting.id));
      toast.success("Review deleted.");
      setDeleting(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const visible = data?.filter((r) => r.status === "visible") ?? [];
  const avg = visible.length ? visible.reduce((s, r) => s + r.rating, 0) / visible.length : 0;

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Ratings students leave after a session. Visible reviews appear on the Sessions page; pinned ones show first."
      />
      {data && data.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-[#fffdf9] p-5">
          <p className="display text-5xl">{avg.toFixed(1)}</p>
          <div>
            <Stars value={avg} size="md" />
            <p className="mt-1 text-sm text-muted">{visible.length} visible review(s){data.length > visible.length ? ` · ${data.length - visible.length} hidden` : ""}</p>
          </div>
        </div>
      )}
      {loading && !data ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <AdminEmpty title="No reviews yet" description="After each session, students automatically get a personal link to rate it. For study-store purchases, send the link from Students. Reviews show up here." />
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.map((r) => (
            <li key={r.id} className={cn("card flex flex-col p-5", r.status === "hidden" && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{r.name}</p>
                  <p className="text-xs text-muted">
                    {r.productTitle ? `Study store: ${r.productTitle} · ` : r.sessionTitle ? `${r.sessionTitle} · ` : ""}
                    {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <Stars value={r.rating} />
              </div>
              <p className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-ink-2">{r.text || <span className="italic text-muted">Rating only, no written review.</span>}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                {r.featured && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.7rem] font-medium text-accent-deep">Pinned</span>}
                {r.status === "hidden" && <span className="rounded-full bg-paper-3 px-2 py-0.5 text-[0.7rem] font-medium text-ink-2">Hidden from website</span>}
                <span className="flex-1" />
                <Button size="sm" variant="ghost" onClick={() => patch(r, { featured: !r.featured })}>
                  {r.featured ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />} {r.featured ? "Unpin" : "Pin to top"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => patch(r, { status: r.status === "visible" ? "hidden" : "visible" })}>
                  {r.status === "visible" ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} {r.status === "visible" ? "Hide" : "Show"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(r)} aria-label="Delete review"><Trash2 className="size-3.5" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={!!deleting} title="Delete this review?" message="It will be removed permanently. You can hide it instead to keep it on record." loading={busy} onConfirm={remove} onClose={() => setDeleting(null)} />
    </>
  );
}
