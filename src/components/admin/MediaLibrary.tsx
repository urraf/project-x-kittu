"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/admin/api";
import { AdminEmpty, Button, ConfirmDialog, Dialog, LoadingBlock } from "@/components/admin/ui";
import { cn } from "@/lib/utils/cn";
import type { MediaDTO } from "@/lib/types";

const MAX_MB = 8;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif,image/heic,image/heif";

/** Validates and uploads one file. Shared by the library, image fields and the editor. */
export async function uploadImage(file: File, alt = ""): Promise<MediaDTO> {
  if (!file.type.startsWith("image/")) throw new Error(`“${file.name}” isn't an image.`);
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`“${file.name}” is larger than ${MAX_MB} MB. Try a smaller photo.`);
  const form = new FormData();
  form.append("file", file);
  form.append("alt", alt);
  return api<MediaDTO>("/api/admin/media", { form });
}

function useUploader(onUploaded: (m: MediaDTO) => void) {
  const [uploading, setUploading] = useState(0);
  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      setUploading((n) => n + list.length);
      await Promise.all(
        list.map(async (f) => {
          try {
            const m = await uploadImage(f);
            onUploaded(m);
          } catch (e) {
            toast.error(errorMessage(e));
          } finally {
            setUploading((n) => n - 1);
          }
        }),
      );
    },
    [onUploaded],
  );
  return { uploading, upload };
}

export function MediaLibrary({ onSelect, selectable = false }: { onSelect?: (m: MediaDTO) => void; selectable?: boolean }) {
  const [items, setItems] = useState<MediaDTO[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<MediaDTO | null>(null);
  const [drag, setDrag] = useState(false);
  const [toDelete, setToDelete] = useState<MediaDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api<{ items: MediaDTO[]; pages: number }>(`/api/admin/media?page=${page}`, { signal: ctrl.signal })
      .then((res) => {
        setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items.filter((m) => !prev.some((x) => x.id === m.id))]));
        setPages(res.pages);
      })
      .catch((e: Error) => e.name !== "AbortError" && toast.error(errorMessage(e)))
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [page]);

  const { uploading, upload } = useUploader(
    useCallback((m: MediaDTO) => {
      setItems((prev) => [m, ...prev]);
      setActive(m);
      toast.success("Image uploaded and optimised");
    }, []),
  );

  async function saveAlt(m: MediaDTO, alt: string) {
    try {
      const updated = await api<MediaDTO>(`/api/admin/media/${m.id}`, { method: "PATCH", body: { alt } });
      setItems((prev) => prev.map((i) => (i.id === m.id ? updated : i)));
      setActive(updated);
      toast.success("Alt text saved");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/api/admin/media/${toDelete.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== toDelete.id));
      if (active?.id === toDelete.id) setActive(null);
      setToDelete(null);
      toast.success("Image deleted");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
      }}
    >
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          drag ? "border-accent bg-accent-soft/50" : "border-line hover:border-ink/40 hover:bg-paper-2/60",
        )}
      >
        <UploadCloud className="size-7 text-muted" />
        <span className="font-medium">{uploading ? `Uploading ${uploading} image${uploading > 1 ? "s" : ""}…` : "Drop images here or click to upload"}</span>
        <span className="text-xs text-muted">JPG, PNG, WebP, AVIF or GIF · up to {MAX_MB} MB · automatically resized & optimised</span>
      </button>
      <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => e.target.files && upload(e.target.files).then(() => (e.target.value = ""))} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_17rem]">
        <div>
          {loading && !items.length ? (
            <LoadingBlock />
          ) : !items.length ? (
            <AdminEmpty title="No images yet" description="Uploaded images appear here and can be reused across posts." />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setActive(m)}
                    onDoubleClick={() => selectable && onSelect?.(m)}
                    className={cn("group relative block aspect-square w-full overflow-hidden rounded-xl bg-paper-3 ring-offset-2 ring-offset-paper", active?.id === m.id ? "ring-2 ring-accent" : "hover:ring-2 hover:ring-ink/20")}
                  >
                    <Image src={m.thumbUrl} alt={m.alt} fill sizes="200px" className="object-cover" />
                    {active?.id === m.id && <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-accent text-white"><Check className="size-3.5" /></span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {page < pages && (
            <div className="mt-6 text-center">
              <Button onClick={() => { setLoading(true); setPage((p) => p + 1); }} loading={loading}>Load more</Button>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          {active ? (
            <MediaDetails key={active.id} media={active} onSaveAlt={saveAlt} onDelete={() => setToDelete(active)} onSelect={selectable ? () => onSelect?.(active) : undefined} />
          ) : (
            <div className="rounded-2xl border border-line p-5 text-sm text-muted">
              <ImagePlus className="mb-2 size-5" />
              {selectable ? "Pick an image, then press “Use this image”." : "Select an image to see its details."}
            </div>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete image?"
        message="If this image is used in a post, it will stop showing there. This can't be undone."
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
        loading={deleting}
      />
    </div>
  );
}

function MediaDetails({ media, onSaveAlt, onDelete, onSelect }: { media: MediaDTO; onSaveAlt: (m: MediaDTO, alt: string) => void; onDelete: () => void; onSelect?: () => void }) {
  const [alt, setAlt] = useState(media.alt);
  const [copied, setCopied] = useState(false);
  return (
    <div className="card overflow-hidden">
      <div className="relative aspect-[4/3] bg-paper-3">
        <Image src={media.thumbUrl} alt={media.alt} fill sizes="272px" className="object-contain" />
      </div>
      <div className="space-y-4 p-4">
        <p className="text-xs text-muted">
          {media.width}×{media.height} · {(media.size / 1024).toFixed(0)} KB · {media.source}
        </p>
        <div>
          <label className="label" htmlFor={`alt-${media.id}`}>Alt text (describes the image)</label>
          <textarea id={`alt-${media.id}`} rows={2} value={alt} onChange={(e) => setAlt(e.target.value)} className="field text-sm" placeholder="e.g. Students outside a university in Kyoto" />
          {alt !== media.alt && <Button size="sm" className="mt-2" onClick={() => onSaveAlt(media, alt)}>Save alt text</Button>}
        </div>
        <div className="flex flex-wrap gap-2">
          {onSelect && <Button variant="primary" size="sm" onClick={onSelect}>Use this image</Button>}
          <Button
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(new URL(media.url, window.location.origin).toString());
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Copy URL"}
          </Button>
          <Button size="sm" variant="danger" onClick={onDelete}><Trash2 className="size-3.5" /> Delete</Button>
        </div>
      </div>
    </div>
  );
}

export function MediaPickerDialog({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (m: MediaDTO) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Choose an image" size="xl">
      <MediaLibrary
        selectable
        onSelect={(m) => {
          onSelect(m);
          onClose();
        }}
      />
    </Dialog>
  );
}
