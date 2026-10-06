"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNow } from "@/lib/admin/hooks";
import { ArrowLeft, CalendarClock, ChevronDown, ExternalLink, Eye, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiClientError, errorMessage } from "@/lib/admin/api";
import { ImageField } from "@/components/admin/ImageField";
import { RichEditor } from "@/components/admin/RichEditor";
import { TagInput } from "@/components/admin/TagInput";
import { Button, Card, ConfirmDialog, Field, StatusBadge, Toggle } from "@/components/admin/ui";
import { slugify, stripHtml, truncate } from "@/lib/utils/text";
import { parseYouTubeId, youtubeThumb } from "@/lib/utils/youtube";
import { cn } from "@/lib/utils/cn";
import type { ImageDTO, PostFull } from "@/lib/types";

type Form = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  coverImage: ImageDTO | null;
  thumbnail: ImageDTO | null;
  featured: boolean;
  videoId: string;
  status: "draft" | "published";
  publishedAt: string; // datetime-local value
  author: { name: string; avatar: string; bio: string };
  seo: { title: string; description: string; canonicalUrl: string; ogImage: string; noIndex: boolean };
};

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromPost(p?: PostFull): Form {
  return {
    title: p?.title ?? "",
    slug: p?.slug ?? "",
    excerpt: p?.excerpt ?? "",
    content: p?.content ?? "",
    category: p?.category ?? "",
    tags: p?.tags ?? [],
    coverImage: p?.coverImage ?? null,
    thumbnail: p && p.thumbnail?.url !== p.coverImage?.url ? (p.thumbnail ?? null) : null,
    featured: p?.featured ?? false,
    videoId: p?.videoId ?? "",
    status: p?.status ?? "draft",
    publishedAt: toLocalInput(p?.publishedAt),
    author: { name: p?.author.name ?? "", avatar: p?.author.avatar ?? "", bio: p?.author.bio ?? "" },
    seo: {
      title: p?.seo.title ?? "",
      description: p?.seo.description ?? "",
      canonicalUrl: p?.seo.canonicalUrl ?? "",
      ogImage: p?.seo.ogImage ?? "",
      noIndex: p?.seo.noIndex ?? false,
    },
  };
}

function toPayload(f: Form, status: "draft" | "published") {
  return {
    title: f.title.trim(),
    slug: f.slug.trim() || undefined,
    excerpt: f.excerpt.trim(),
    content: f.content,
    category: f.category.trim() || "Stories",
    tags: f.tags,
    coverImage: f.coverImage,
    thumbnail: f.thumbnail,
    featured: f.featured,
    videoId: f.videoId.trim() || null,
    status,
    publishedAt: f.publishedAt ? new Date(f.publishedAt).toISOString() : status === "published" ? undefined : null,
    author: f.author,
    seo: f.seo,
  };
}

export function PostEditor({
  post,
  categories,
  tagSuggestions = [],
  defaultAuthor,
  siteUrl,
}: {
  post?: PostFull;
  categories: string[];
  tagSuggestions?: string[];
  defaultAuthor: { name: string; avatar: string; bio: string };
  siteUrl: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(() => fromPost(post));
  const [saved, setSaved] = useState<Form>(() => fromPost(post));
  const [current, setCurrent] = useState<PostFull | undefined>(post);
  const [saving, setSaving] = useState<null | "draft" | "published">(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const isNew = !current;
  const isPublished = current?.status === "published";
  const now = useNow();
  const scheduled = form.publishedAt && new Date(form.publishedAt).getTime() > now;

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const save = useCallback(
    async (status: "draft" | "published", opts: { quiet?: boolean } = {}) => {
      if (form.title.trim().length < 3) {
        setErrors({ title: "Give your post a title (at least 3 characters)." });
        toast.error("Your post needs a title first.");
        return null;
      }
      if (status === "published" && stripHtml(form.content).length < 50) {
        toast.error("Add some content before publishing.");
        return null;
      }
      setSaving(status);
      setErrors({});
      try {
        const payload = toPayload(form, status);
        const result = current
          ? await api<PostFull>(`/api/admin/posts/${current.id}`, { method: "PATCH", body: payload })
          : await api<PostFull>("/api/admin/posts", { body: payload });
        const next = fromPost(result);
        setCurrent(result);
        setForm(next);
        setSaved(next);
        setSlugTouched(true);
        if (!opts.quiet) {
          const msg =
            status === "published"
              ? result.publishedAt && new Date(result.publishedAt).getTime() > Date.now()
                ? "Scheduled! It will go live automatically."
                : isPublished ? "Changes are live." : "Published! Your post is live."
              : isPublished ? "Moved back to drafts." : "Draft saved.";
          toast.success(msg, status === "published" ? { action: { label: "View", onClick: () => window.open(`/blog/${result.slug}`, "_blank") } } : undefined);
        }
        if (!current) router.replace(`/admin/posts/${result.id}`);
        else router.refresh();
        return result;
      } catch (e) {
        if (e instanceof ApiClientError) setErrors(e.fieldErrors);
        toast.error(errorMessage(e));
        return null;
      } finally {
        setSaving(null);
      }
    },
    [form, current, isPublished, router],
  );

  // Ctrl/Cmd + S saves (keeps the current status).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save(current?.status ?? "draft");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, current]);

  async function preview() {
    // Open the tab synchronously (avoids popup blockers), then point it at the preview once saved.
    const win = window.open("about:blank", "_blank");
    let target = current;
    if (!target || dirty) target = (await save(current?.status ?? "draft", { quiet: true })) ?? undefined;
    if (target && win) win.location.href = `/admin/posts/${target.id}/preview`;
    else win?.close();
  }

  async function suggestSeo() {
    if (stripHtml(form.content).length < 50) return toast.error("Write some content first, then I can suggest SEO details.");
    setSuggesting(true);
    try {
      const s = await api<{ excerpt: string; seoTitle: string; seoDescription: string; tags: string[]; category: string }>("/api/admin/ai/metadata", {
        body: { title: form.title || "Untitled", content: form.content },
      });
      setForm((f) => ({
        ...f,
        excerpt: f.excerpt || s.excerpt,
        category: f.category || s.category,
        tags: f.tags.length ? f.tags : s.tags,
        seo: { ...f.seo, title: s.seoTitle, description: s.seoDescription },
      }));
      toast.success("SEO suggestions added. Review them before saving.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function doDelete() {
    if (!current) return;
    setDeleting(true);
    try {
      await api(`/api/admin/posts/${current.id}`, { method: "DELETE" });
      setSaved(form);
      toast.success("Post deleted");
      router.push("/admin/posts");
    } catch (e) {
      toast.error(errorMessage(e));
      setDeleting(false);
    }
  }

  const videoId = parseYouTubeId(form.videoId);
  const seoTitle = form.seo.title || form.title || "Your post title";
  const seoDesc = form.seo.description || form.excerpt || truncate(stripHtml(form.content), 155) || "A short summary of your article appears here in Google.";
  const urlSlug = form.slug || slugify(form.title || "your-post");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/posts" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" /> All posts
        </Link>
        <div className="flex items-center gap-3 text-xs text-muted">
          {current && <StatusBadge status={current.status} publishedAt={current.publishedAt} />}
          {current?.generation && (
            <span className="inline-flex items-center gap-1 text-accent-deep"><Sparkles className="size-3.5" /> AI-assisted</span>
          )}
          <span className={cn(dirty ? "text-[#a8741a]" : "text-moss")}>{dirty ? "Unsaved changes" : current ? "All changes saved" : "New post"}</span>
        </div>
      </div>

      {current?.generation?.warnings?.length ? (
        <div className="mb-6 rounded-xl border border-[#e8d3a5] bg-[#faf1dc] px-4 py-3 text-sm text-[#6d4c0f]">
          <p className="font-medium">AI draft notes. Please review before publishing:</p>
          <ul className="mt-1 list-disc pl-5">{current.generation.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_21rem]">
        {/* Main column */}
        <div className="min-w-0 space-y-6">
          <div>
            <label htmlFor="title" className="sr-only">Title</label>
            <textarea
              id="title"
              rows={1}
              value={form.title}
              onChange={(e) => {
                const title = e.target.value.replace(/\n/g, " ");
                setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              placeholder="Post title"
              className="display w-full resize-none overflow-hidden bg-transparent text-[2.6rem] leading-[1.05] outline-none placeholder:text-muted/50 md:text-[3.4rem]"
              aria-invalid={!!errors.title}
              maxLength={180}
            />
            {errors.title && <p className="text-sm text-accent-deep">{errors.title}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-1 text-[0.8rem] text-muted">
              <span>{siteUrl.replace(/^https?:\/\//, "")}/blog/</span>
              <input
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                }}
                onBlur={() => set("slug", slugify(form.slug || form.title))}
                className="min-w-[10rem] flex-1 rounded-md bg-transparent px-1 py-0.5 font-mono text-ink outline-none hover:bg-paper-2 focus:bg-paper-2"
                aria-label="URL slug"
              />
              {isPublished && current && (
                <a href={`/blog/${current.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
                  View live <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            {errors.slug && <p className="text-sm text-accent-deep">{errors.slug}</p>}
          </div>

          <Field label="Short description" hint="Shown on blog cards and under the title. 1–2 sentences." htmlFor="excerpt" counter={{ value: form.excerpt.length, max: 400, ideal: [120, 240] }} error={errors.excerpt}>
            <textarea id="excerpt" rows={2} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} className="field" maxLength={400} placeholder="What will readers get from this post?" />
          </Field>

          <RichEditor value={form.content} onChange={(html) => set("content", html)} />
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 xl:sticky xl:top-6 xl:max-h-[calc(100svh-3rem)] xl:self-start xl:overflow-y-auto xl:pb-6">
          <Card className="!p-5">
            <h2 className="font-medium">Publish</h2>
            <div className="mt-4">
              <label htmlFor="publishedAt" className="label flex items-center gap-1.5"><CalendarClock className="size-3.5" /> Publish date</label>
              <input id="publishedAt" type="datetime-local" value={form.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} className="field !py-2 text-sm" />
              <p className="hint">{scheduled ? "In the future: the post goes live automatically then." : "Leave empty to publish immediately."}</p>
            </div>
            <div className="mt-5 grid gap-2">
              <Button variant="accent" onClick={() => save("published")} loading={saving === "published"} disabled={!!saving}>
                {isPublished ? (dirty ? "Update live post" : "Published ✓") : scheduled ? "Schedule" : "Publish"}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => save("draft")} loading={saving === "draft"} disabled={!!saving}>
                  {isPublished ? "Unpublish" : "Save draft"}
                </Button>
                <Button onClick={preview} disabled={!!saving || !form.title.trim()}>
                  <Eye className="size-4" /> Preview
                </Button>
              </div>
            </div>
            <p className="mt-3 text-center text-[0.72rem] text-muted">Tip: press Ctrl/⌘ + S to save</p>
          </Card>

          <Card className="!p-5 space-y-5">
            <Field label="Category" htmlFor="category" error={errors.category}>
              <input id="category" list="category-options" value={form.category} onChange={(e) => set("category", e.target.value)} className="field" placeholder="Choose or type a category" />
              <datalist id="category-options">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {categories.slice(0, 8).map((c) => (
                  <button key={c} type="button" onClick={() => set("category", c)} className={cn("rounded-full border px-2.5 py-0.5 text-[0.75rem]", form.category === c ? "border-ink bg-ink text-cream" : "border-line text-ink-2 hover:border-ink/40")}>
                    {c}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Tags" hint="Press Enter or comma after each tag.">
              <TagInput value={form.tags} onChange={(t) => set("tags", t)} suggestions={tagSuggestions} />
            </Field>
            <Toggle checked={form.featured} onChange={(v) => set("featured", v)} label="Feature this post" description="Highlight it at the top of the blog." />
          </Card>

          <Card className="!p-5 space-y-5">
            <ImageField label="Cover image" hint="Wide images (16:9) look best. Shown at the top of the article and when shared." value={form.coverImage} onChange={(v) => set("coverImage", v)} />
            <ImageField label="Card thumbnail (optional)" hint="Use a different image for blog cards. Defaults to the cover." value={form.thumbnail} onChange={(v) => set("thumbnail", v)} aspect="aspect-[3/2]" />
          </Card>

          <Card className="!p-5">
            <Field label="Related YouTube video (optional)" hint="Shown as a companion video inside the article." error={errors.videoId}>
              <input value={form.videoId} onChange={(e) => set("videoId", e.target.value)} className="field" placeholder="Paste a YouTube link" />
            </Field>
            {videoId && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={youtubeThumb(videoId, "mq")} alt="" className="mt-3 aspect-video w-full rounded-lg object-cover" />
            )}
          </Card>

          <Card className="!p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">Search & sharing</h2>
              <Button size="sm" onClick={suggestSeo} loading={suggesting}>
                {!suggesting && <Wand2 className="size-3.5" />} Suggest
              </Button>
            </div>
            <div className="rounded-xl border border-line bg-white p-3.5" aria-label="Google preview">
              <p className="truncate text-[0.75rem] text-[#4d5156]">{siteUrl.replace(/^https?:\/\//, "")} › blog › {urlSlug}</p>
              <p className="mt-1 line-clamp-1 text-[1.05rem] leading-snug text-[#1a0dab]">{seoTitle}</p>
              <p className="mt-1 line-clamp-2 text-[0.8rem] leading-snug text-[#4d5156]">{seoDesc}</p>
            </div>
            <Field label="SEO title" htmlFor="seo-title" counter={{ value: form.seo.title.length, max: 90, ideal: [30, 60] }} hint="Defaults to the post title." error={errors["seo.title"]}>
              <input id="seo-title" value={form.seo.title} onChange={(e) => set("seo", { ...form.seo, title: e.target.value })} className="field" maxLength={90} />
            </Field>
            <Field label="SEO description" htmlFor="seo-desc" counter={{ value: form.seo.description.length, max: 200, ideal: [110, 160] }} hint="Defaults to the short description." error={errors["seo.description"]}>
              <textarea id="seo-desc" rows={3} value={form.seo.description} onChange={(e) => set("seo", { ...form.seo, description: e.target.value })} className="field" maxLength={200} />
            </Field>
            <button type="button" onClick={() => setShowAdvanced((s) => !s)} className="flex w-full items-center justify-between text-sm text-ink-2 hover:text-ink">
              Advanced (author, canonical, indexing)
              <ChevronDown className={cn("size-4 transition-transform", showAdvanced && "rotate-180")} />
            </button>
            {showAdvanced && (
              <div className="space-y-4 border-t border-line pt-4">
                <Field label="Author name" hint={`Defaults to ${defaultAuthor.name}.`}>
                  <input value={form.author.name} onChange={(e) => set("author", { ...form.author, name: e.target.value })} className="field" placeholder={defaultAuthor.name} />
                </Field>
                <Field label="Author bio" hint="Defaults to your profile bio.">
                  <textarea rows={3} value={form.author.bio} onChange={(e) => set("author", { ...form.author, bio: e.target.value })} className="field text-sm" placeholder={defaultAuthor.bio} maxLength={400} />
                </Field>
                <Field label="Author photo URL" hint="Defaults to your profile photo.">
                  <input value={form.author.avatar} onChange={(e) => set("author", { ...form.author, avatar: e.target.value })} className="field" placeholder="https://…" />
                </Field>
                <Field label="Canonical URL" hint="Only if this article was first published elsewhere." error={errors["seo.canonicalUrl"]}>
                  <input value={form.seo.canonicalUrl} onChange={(e) => set("seo", { ...form.seo, canonicalUrl: e.target.value })} className="field" placeholder="https://…" />
                </Field>
                <Field label="Social share image URL" hint="Defaults to the cover image." error={errors["seo.ogImage"]}>
                  <input value={form.seo.ogImage} onChange={(e) => set("seo", { ...form.seo, ogImage: e.target.value })} className="field" placeholder="https://…" />
                </Field>
                <Toggle checked={form.seo.noIndex} onChange={(v) => set("seo", { ...form.seo, noIndex: v })} label="Hide from search engines" description="Adds noindex. Rarely needed." />
              </div>
            )}
          </Card>

          {!isNew && (
            <Button variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" /> Delete post
            </Button>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this post?"
        message={<>“{form.title}” will be permanently removed. This can&apos;t be undone.</>}
        onConfirm={doDelete}
        onClose={() => setConfirmDelete(false)}
        loading={deleting}
      />
    </div>
  );
}
