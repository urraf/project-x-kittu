"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import {
  Bold, Code2, Heading2, Heading3, ImagePlus, Italic, Library, Link2, List, ListOrdered, Loader2, Minus, Pilcrow, Quote, Redo2, Strikethrough, Underline, Undo2, Unlink, MonitorPlay,
} from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/admin/api";
import { MediaPickerDialog, uploadImage } from "@/components/admin/MediaLibrary";
import { Button, Dialog } from "@/components/admin/ui";
import { parseYouTubeId } from "@/lib/utils/youtube";
import { cn } from "@/lib/utils/cn";

function ToolButton({ active, onClick, label, children, disabled }: { active?: boolean; onClick: () => void; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn("grid size-8 place-items-center rounded-lg transition-colors disabled:opacity-30", active ? "bg-ink text-cream" : "text-ink-2 hover:bg-paper-2 hover:text-ink")}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px bg-line" aria-hidden />;

export function RichEditor({ value, onChange, placeholder = "Start writing your story…" }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const [uploading, setUploading] = useState(0);
  const [picker, setPicker] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [ytOpen, setYtOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  async function insertFiles(files: File[], pos?: number) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return false;
    setUploading((n) => n + images.length);
    for (const f of images) {
      try {
        const m = await uploadImage(f);
        const chain = editorRef.current?.chain().focus();
        if (pos != null) chain?.insertContentAt(pos, { type: "image", attrs: { src: m.url, alt: m.alt || "" } }).run();
        else chain?.setImage({ src: m.url, alt: m.alt || "" }).run();
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setUploading((n) => n - 1);
      }
    }
    return true;
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", HTMLAttributes: { rel: "noopener noreferrer" } },
      }),
      ImageExt.configure({ allowBase64: false }),
      Youtube.configure({ nocookie: true, controls: true, modestBranding: true, width: 640, height: 360 }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: { class: "prose-kk editor-content-inner focus:outline-none" },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.some((f) => f.type.startsWith("image/"))) {
          insertFiles(files);
          return true;
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!files.some((f) => f.type.startsWith("image/"))) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        insertFiles(files, pos);
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Sync external value changes (e.g. AI regenerate) without clobbering typing.
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            p: e.isActive("paragraph"),
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            link: e.isActive("link"),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            code: e.isActive("codeBlock"),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
            words: e.getText().trim().split(/\s+/).filter(Boolean).length,
          }
        : null,
  });

  if (!editor || !s) return <div className="min-h-[460px] animate-pulse rounded-xl bg-paper-2" />;
  const c = () => editor.chain().focus();

  return (
    <div className="rounded-2xl border border-line bg-[#fffdf9]">
      <div className="sticky top-14 z-20 flex flex-wrap items-center gap-0.5 rounded-t-2xl border-b border-line bg-[#fffdf9]/95 px-2 py-1.5 backdrop-blur lg:top-0">
        <ToolButton label="Paragraph" active={s.p} onClick={() => c().setParagraph().run()}><Pilcrow className="size-4" /></ToolButton>
        <ToolButton label="Heading" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></ToolButton>
        <ToolButton label="Subheading" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></ToolButton>
        <Sep />
        <ToolButton label="Bold (Ctrl+B)" active={s.bold} onClick={() => c().toggleBold().run()}><Bold className="size-4" /></ToolButton>
        <ToolButton label="Italic (Ctrl+I)" active={s.italic} onClick={() => c().toggleItalic().run()}><Italic className="size-4" /></ToolButton>
        <ToolButton label="Underline (Ctrl+U)" active={s.underline} onClick={() => c().toggleUnderline().run()}><Underline className="size-4" /></ToolButton>
        <ToolButton label="Strikethrough" active={s.strike} onClick={() => c().toggleStrike().run()}><Strikethrough className="size-4" /></ToolButton>
        <ToolButton label={s.link ? "Edit link" : "Add link"} active={s.link} onClick={() => setLinkOpen(true)}><Link2 className="size-4" /></ToolButton>
        {s.link && <ToolButton label="Remove link" onClick={() => c().unsetLink().run()}><Unlink className="size-4" /></ToolButton>}
        <Sep />
        <ToolButton label="Bulleted list" active={s.bullet} onClick={() => c().toggleBulletList().run()}><List className="size-4" /></ToolButton>
        <ToolButton label="Numbered list" active={s.ordered} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="size-4" /></ToolButton>
        <ToolButton label="Quote" active={s.quote} onClick={() => c().toggleBlockquote().run()}><Quote className="size-4" /></ToolButton>
        <ToolButton label="Code block" active={s.code} onClick={() => c().toggleCodeBlock().run()}><Code2 className="size-4" /></ToolButton>
        <ToolButton label="Divider" onClick={() => c().setHorizontalRule().run()}><Minus className="size-4" /></ToolButton>
        <Sep />
        <ToolButton label="Upload image" onClick={() => fileInput.current?.click()}>{uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}</ToolButton>
        <ToolButton label="Image from library" onClick={() => setPicker(true)}><Library className="size-4" /></ToolButton>
        <ToolButton label="Embed YouTube video" onClick={() => setYtOpen(true)}><MonitorPlay className="size-4" /></ToolButton>
        <Sep />
        <ToolButton label="Undo" disabled={!s.canUndo} onClick={() => c().undo().run()}><Undo2 className="size-4" /></ToolButton>
        <ToolButton label="Redo" disabled={!s.canRedo} onClick={() => c().redo().run()}><Redo2 className="size-4" /></ToolButton>
        <span className="ml-auto pr-2 font-mono text-[0.7rem] text-muted">{s.words} words</span>
      </div>
      <div className="editor-content px-5 py-6 md:px-10 md:py-8">
        <EditorContent editor={editor} />
      </div>
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { insertFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />

      <MediaPickerDialog open={picker} onClose={() => setPicker(false)} onSelect={(m) => c().setImage({ src: m.url, alt: m.alt }).run()} />
      <UrlDialog
        open={linkOpen}
        title={s.link ? "Edit link" : "Add a link"}
        label="Web address"
        placeholder="https://…"
        initial={(editor.getAttributes("link").href as string) ?? ""}
        onClose={() => setLinkOpen(false)}
        onSubmit={(url) => {
          if (!url) c().extendMarkRange("link").unsetLink().run();
          else {
            const href = /^(https?:|mailto:|\/)/.test(url) ? url : `https://${url}`;
            if (editor.state.selection.empty && !s.link) c().insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href } }] }).run();
            else c().extendMarkRange("link").setLink({ href }).run();
          }
        }}
      />
      <UrlDialog
        open={ytOpen}
        title="Embed a YouTube video"
        label="YouTube link"
        placeholder="https://www.youtube.com/watch?v=…"
        onClose={() => setYtOpen(false)}
        validate={(v) => (parseYouTubeId(v) ? null : "That doesn't look like a YouTube link.")}
        onSubmit={(url) => {
          const id = parseYouTubeId(url);
          if (id) c().setYoutubeVideo({ src: `https://www.youtube.com/watch?v=${id}` }).run();
        }}
      />
    </div>
  );
}

function UrlDialog(props: {
  open: boolean; title: string; label: string; placeholder: string; initial?: string;
  onClose: () => void; onSubmit: (v: string) => void; validate?: (v: string) => string | null;
}) {
  // Dialog only renders children while open, so the form's state resets on every open.
  return (
    <Dialog open={props.open} onClose={props.onClose} title={props.title}>
      <UrlForm {...props} />
    </Dialog>
  );
}

function UrlForm({ label, placeholder, initial = "", onClose, onSubmit, validate }: { label: string; placeholder: string; initial?: string; onClose: () => void; onSubmit: (v: string) => void; validate?: (v: string) => string | null }) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    const e = v.trim() && validate ? validate(v.trim()) : null;
    if (e) return setErr(e);
    onSubmit(v.trim());
    onClose();
  };
  return (
    <div>
      <label className="label" htmlFor="url-dialog">{label}</label>
      <input id="url-dialog" autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())} placeholder={placeholder} className="field" aria-invalid={!!err} />
      {err && <p className="mt-1.5 text-sm text-accent-deep">{err}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit}>Apply</Button>
      </div>
    </div>
  );
}
