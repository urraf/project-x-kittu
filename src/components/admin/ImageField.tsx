"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Library, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/admin/api";
import { MediaPickerDialog, uploadImage } from "@/components/admin/MediaLibrary";
import { Button } from "@/components/admin/ui";
import { cn } from "@/lib/utils/cn";
import type { ImageDTO, MediaDTO } from "@/lib/types";

function toImage(m: MediaDTO): ImageDTO {
  return { url: m.url, alt: m.alt, mediaId: m.id, width: m.width, height: m.height, blurDataURL: m.blurDataURL, credit: m.credit };
}

/** Cover / thumbnail picker with upload, library and alt-text editing. */
export function ImageField({
  label,
  hint,
  value,
  onChange,
  aspect = "aspect-[16/9]",
}: {
  label: string;
  hint?: string;
  value: ImageDTO | null | undefined;
  onChange: (v: ImageDTO | null) => void;
  aspect?: string;
}) {
  const [picker, setPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const m = await uploadImage(file, value?.alt ?? "");
      onChange(toImage(m));
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <p className="label">{label}</p>
      <div
        className={cn("relative overflow-hidden rounded-xl border border-line bg-paper-2", aspect)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files[0]);
        }}
      >
        {value?.url ? (
          <Image src={value.url} alt={value.alt} fill sizes="400px" className="object-cover" />
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted hover:text-ink">
            <ImagePlus className="size-6" />
            Drop an image or click to upload
          </button>
        )}
        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-paper/80">
            <Loader2 className="size-6 animate-spin text-ink" />
          </div>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button type="button" size="sm" onClick={() => input.current?.click()}><Upload className="size-3.5" /> Upload</Button>
        <Button type="button" size="sm" onClick={() => setPicker(true)}><Library className="size-3.5" /> Library</Button>
        {value?.url && <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}><Trash2 className="size-3.5" /> Remove</Button>}
      </div>
      {value?.url && (
        <input
          value={value.alt}
          onChange={(e) => onChange({ ...value, alt: e.target.value })}
          placeholder="Alt text: describe the image for screen readers & SEO"
          className="field mt-2 !py-2 text-sm"
          maxLength={300}
        />
      )}
      {hint && <p className="hint">{hint}</p>}
      <MediaPickerDialog open={picker} onClose={() => setPicker(false)} onSelect={(m) => onChange(toImage(m))} />
    </div>
  );
}
