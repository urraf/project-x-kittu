"use client";

import Image from "next/image";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Eye, Heart, Loader2, MessageCircle, RefreshCw, Send } from "lucide-react";
import { formatCompact, timeAgo } from "@/lib/utils/text";
import { cn } from "@/lib/utils/cn";
import type { CommentDTO, EngagementDTO } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Shared state for one article                                        */
/* ------------------------------------------------------------------ */

type Ctx = EngagementDTO & {
  postId: string;
  interactive: boolean;
  toggleLike: () => void;
  liking: boolean;
  setCommentCount: (n: number) => void;
};

const EngagementContext = createContext<Ctx | null>(null);
const useEngagement = () => {
  const ctx = useContext(EngagementContext);
  if (!ctx) throw new Error("Engagement components must be inside <EngagementProvider>");
  return ctx;
};

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    const err = new Error(json?.error?.message ?? "Something went wrong. Please try again.") as Error & { details?: { path: string; message: string }[] };
    err.details = json?.error?.details;
    throw err;
  }
  return json.data as T;
}

/**
 * Wraps an article. Records one view per visitor per day and keeps live
 * counts (the page itself is cached, so counts are refreshed client-side).
 * `interactive={false}` (admin preview) disables tracking and likes.
 */
export function EngagementProvider({ postId, initial, interactive = true, children }: { postId: string; initial: EngagementDTO; interactive?: boolean; children: React.ReactNode }) {
  const [state, setState] = useState<EngagementDTO>(initial);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (!interactive) return;
    let cancelled = false;
    post<EngagementDTO>(`/api/posts/${postId}/view`)
      .then((data) => !cancelled && setState(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [postId, interactive]);

  const toggleLike = useCallback(async () => {
    if (!interactive || liking) return;
    setLiking(true);
    // Optimistic update, rolled back on failure.
    setState((s) => ({ ...s, liked: !s.liked, likes: Math.max(0, s.likes + (s.liked ? -1 : 1)) }));
    try {
      const res = await post<{ likes: number; liked: boolean }>(`/api/posts/${postId}/like`);
      setState((s) => ({ ...s, ...res }));
    } catch {
      setState((s) => ({ ...s, liked: !s.liked, likes: Math.max(0, s.likes + (s.liked ? -1 : 1)) }));
    } finally {
      setLiking(false);
    }
  }, [interactive, liking, postId]);

  const setCommentCount = useCallback((n: number) => setState((s) => ({ ...s, commentCount: n })), []);
  const value = useMemo(() => ({ ...state, postId, interactive, toggleLike, liking, setCommentCount }), [state, postId, interactive, toggleLike, liking, setCommentCount]);
  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>;
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

export function ViewCount() {
  const { views } = useEngagement();
  if (!views) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <Eye className="size-3.5" aria-hidden /> {formatCompact(views)} {views === 1 ? "view" : "views"}
    </span>
  );
}

export function LikeButton({ className }: { className?: string }) {
  const { likes, liked, toggleLike, interactive } = useEngagement();
  const [pop, setPop] = useState(0);
  return (
    <button
      type="button"
      onClick={() => {
        if (!liked) setPop((p) => p + 1);
        toggleLike();
      }}
      disabled={!interactive}
      aria-pressed={liked}
      aria-label={liked ? "Unlike this article" : "Like this article"}
      className={cn(
        "group inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors disabled:cursor-default",
        liked ? "border-accent bg-accent text-white" : "border-line bg-[#fffdf9] text-ink hover:border-accent hover:text-accent-deep",
        className,
      )}
    >
      <Heart key={pop} className={cn("size-4", liked && "fill-current", pop > 0 && liked && "kk-like-pop")} aria-hidden />
      <span>{likes ? formatCompact(likes) : "Like"}</span>
    </button>
  );
}

export function CommentCountLink({ className }: { className?: string }) {
  const { commentCount } = useEngagement();
  return (
    <a href="#comments" className={cn("inline-flex h-11 items-center gap-2 rounded-full border border-line bg-[#fffdf9] px-4 text-sm font-medium text-ink hover:border-ink/40", className)}>
      <MessageCircle className="size-4" aria-hidden />
      {commentCount ? `${commentCount} comment${commentCount === 1 ? "" : "s"}` : "Comment"}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Comments                                                            */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS = ["bg-[#d9482b]", "bg-[#24365a]", "bg-[#3f5a46]", "bg-[#a8741a]", "bg-[#6b3f5a]", "bg-[#2f5f6b]"];
function avatarColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

type Captcha = { question: string; token: string; expiresInSec: number };

export function CommentsSection({ author }: { author: { name: string; avatar?: string } }) {
  const { postId, interactive, setCommentCount } = useEngagement();
  const [comments, setComments] = useState<CommentDTO[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/posts/${postId}/comments`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || !j?.ok) return;
        setComments(j.data.comments);
        setEnabled(j.data.enabled);
        setRequireApproval(j.data.requireApproval);
      })
      .catch(() => !cancelled && setComments([]));
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const visible = comments ?? [];
  const shown = showAll ? visible : visible.slice(-10);

  return (
    <section id="comments" className="mt-16 scroll-mt-28 border-t border-line pt-12" aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="display text-4xl md:text-5xl">
        Comments {visible.length > 0 && <span className="text-muted">({visible.length})</span>}
      </h2>
      <p className="mt-3 text-ink-2">Questions, experiences, thank-yous: all welcome. No sign-up needed.</p>

      {enabled && interactive && (
        <CommentForm
          postId={postId}
          requireApproval={requireApproval}
          onPosted={(c) => {
            const next = [...visible, c];
            setComments(next);
            setCommentCount(next.length);
          }}
        />
      )}
      {!enabled && <p className="mt-6 rounded-xl bg-paper-2 px-4 py-3 text-sm text-ink-2">Comments are closed for now.</p>}
      {!interactive && <p className="mt-6 rounded-xl bg-paper-2 px-4 py-3 text-sm text-ink-2">Preview mode: the comment form appears on the live article.</p>}

      <div className="mt-12">
        {comments === null ? (
          <div className="flex items-center gap-3 text-sm text-muted"><Loader2 className="size-4 animate-spin" /> Loading comments…</div>
        ) : visible.length === 0 ? (
          <p className="text-ink-2">No comments yet. Be the first to share a thought.</p>
        ) : (
          <>
            {!showAll && visible.length > 10 && (
              <button type="button" onClick={() => setShowAll(true)} className="mb-8 text-sm font-medium text-ink underline underline-offset-4">
                Show {visible.length - 10} earlier comment{visible.length - 10 === 1 ? "" : "s"}
              </button>
            )}
            <ol className="space-y-9">
              {shown.map((c) => (
                <li key={c.id} className="flex gap-4">
                  <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-full font-medium text-white", avatarColor(c.name))}>
                    {c.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium text-ink">{c.name}</span>
                      <time dateTime={c.createdAt} className="text-xs text-muted">{timeAgo(c.createdAt)}</time>
                    </p>
                    <p className="mt-1.5 whitespace-pre-line break-words text-[1rem] leading-relaxed text-ink-2">{c.message}</p>
                    {c.reply && (
                      <div className="mt-4 flex gap-3 border-l-2 border-accent pl-4">
                        {author.avatar ? (
                          <span className="relative size-8 shrink-0 overflow-hidden rounded-full ring-2 ring-accent">
                            <Image src={author.avatar} alt="" fill sizes="32px" className="object-cover" />
                          </span>
                        ) : null}
                        <div className="min-w-0">
                          <p className="text-sm">
                            <span className="font-medium text-ink">{author.name}</span>
                            <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[0.68rem] font-medium uppercase tracking-wide text-accent-deep">Author</span>
                          </p>
                          <p className="mt-1 whitespace-pre-line break-words text-[0.97rem] leading-relaxed text-ink-2">{c.reply.text}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}

function CommentForm({ postId, requireApproval, onPosted }: { postId: string; requireApproval: boolean; onPosted: (c: CommentDTO) => void }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ kind: "ok" | "pending"; text: string } | null>(null);
  const website = useRef<HTMLInputElement>(null);

  const loadCaptcha = useCallback(() => {
    fetch("/api/captcha", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => j?.ok && setCaptcha(j.data))
      .catch(() => setErrors((e) => ({ ...e, form: "Couldn't load the math question. Please refresh the page." })));
  }, []);

  useEffect(() => {
    fetch("/api/captcha", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => j?.ok && setCaptcha(j.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!captcha) return;
    const t = setTimeout(loadCaptcha, Math.max(30, captcha.expiresInSec - 20) * 1000);
    return () => clearTimeout(t);
  }, [captcha, loadCaptcha]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Please add your name.";
    if (message.trim().length < 2) next.message = "Write a comment first.";
    if (!answer.trim()) next.captchaAnswer = "Please answer the math question.";
    setErrors(next);
    setNotice(null);
    if (Object.keys(next).length || !captcha) return;

    setSending(true);
    try {
      const res = await post<{ comment: CommentDTO | null; pending: boolean }>(`/api/posts/${postId}/comments`, {
        name,
        message,
        captchaToken: captcha.token,
        captchaAnswer: answer,
        website: website.current?.value ?? "",
      });
      setMessage("");
      if (res.comment) {
        onPosted(res.comment);
        setNotice({ kind: "ok", text: "Thanks! Your comment is live." });
      } else {
        setNotice({ kind: "pending", text: "Thanks! Your comment will appear once it's been reviewed." });
      }
    } catch (err) {
      const e = err as Error & { details?: { path: string; message: string }[] };
      const fieldErrors: Record<string, string> = {};
      e.details?.forEach((d) => (fieldErrors[d.path] = d.message));
      setErrors({ ...fieldErrors, form: Object.keys(fieldErrors).length ? "" : e.message });
    } finally {
      setSending(false);
      setAnswer("");
      loadCaptcha();
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 rounded-2xl border border-line bg-[#fffdf9] p-5 md:p-6">
      <div className="grid gap-5">
        <div>
          <label htmlFor="cm-name" className="label">Your name</label>
          <input id="cm-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" className="field" aria-invalid={!!errors.name} placeholder="e.g. Priya" />
          {errors.name && <p className="mt-1.5 text-sm text-accent-deep">{errors.name}</p>}
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="cm-message" className="label">Comment</label>
            <span className="font-mono text-[0.7rem] text-muted">{message.length}/2000</span>
          </div>
          <textarea id="cm-message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} className="field resize-y" aria-invalid={!!errors.message} placeholder="Share a question or your experience…" />
          {errors.message && <p className="mt-1.5 text-sm text-accent-deep">{errors.message}</p>}
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label htmlFor="cm-captcha" className="label">Quick check: what is</label>
            <div className="flex items-stretch gap-2">
              <span className="flex min-w-[6.5rem] select-none items-center justify-center rounded-[10px] border border-line bg-paper-2 px-3 font-mono text-base text-ink" aria-live="polite">
                {captcha ? `${captcha.question} =` : "…"}
              </span>
              <input
                id="cm-captcha"
                inputMode="numeric"
                autoComplete="off"
                value={answer}
                onChange={(e) => setAnswer(e.target.value.replace(/[^\d-]/g, ""))}
                className="field w-20 text-center font-mono"
                aria-invalid={!!errors.captchaAnswer}
              />
              <button type="button" onClick={loadCaptcha} aria-label="New question" className="grid w-11 place-items-center rounded-[10px] border border-line text-muted hover:text-ink">
                <RefreshCw className="size-4" />
              </button>
            </div>
            {errors.captchaAnswer && <p className="mt-1.5 text-sm text-accent-deep">{errors.captchaAnswer}</p>}
          </div>
          <button type="submit" disabled={sending || !captcha} className="btn btn-ink h-11 self-start sm:self-auto">
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {sending ? "Posting…" : "Post comment"}
          </button>
        </div>
      </div>
      {/* Honeypot: invisible to people, irresistible to bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="cm-website">Website</label>
        <input id="cm-website" ref={website} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {errors.form && <p role="alert" className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-deep">{errors.form}</p>}
      {notice && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-[#dde8de] px-4 py-3 text-sm text-moss">
          <CheckCircle2 className="size-4" /> {notice.text}
        </p>
      )}
      <p className="mt-4 text-xs text-muted">
        Your name is shown publicly. Please be kind.{requireApproval ? " Comments appear after a quick review." : ""}
      </p>
    </form>
  );
}
