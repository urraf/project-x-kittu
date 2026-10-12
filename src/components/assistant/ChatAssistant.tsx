"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowUp, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "kk-chat-v1";
const GREETING: Msg = {
  role: "assistant",
  content: "こんにちは! I'm **Kittu**, your study-in-Japan senpai. Ask me about internships, scholarships, universities, applications or anything on this site.",
};

/** Suggested questions that fit the page the visitor is on. */
function suggestionsFor(path: string): string[] {
  if (path.startsWith("/universities/")) return ["Is this university a good fit for me?", "Does it have English-taught programs?", "How do I apply with MEXT here?"];
  if (path.startsWith("/universities")) return ["Which universities fit a 7.5 CGPA CS student?", "National vs private universities?", "How does the shortlist tool work?"];
  if (path.startsWith("/opportunities/")) return ["Am I eligible for this?", "How should I prepare my application?", "What documents will I need?"];
  if (path.startsWith("/opportunities")) return ["Which internships close soonest?", "Fully funded options for bachelor's students?", "MEXT vs university scholarships?"];
  if (path.startsWith("/sessions/")) return ["Is this session right for me?", "How do I join after booking?", "Can I get a refund?"];
  if (path.startsWith("/sessions")) return ["Which session should I start with?", "How do live sessions work?", "Are there free sessions?"];
  if (path.startsWith("/store/")) return ["What's inside this?", "How do I download after buying?", "Is this useful for MEXT?"];
  if (path.startsWith("/store")) return ["Which guide helps with MEXT?", "How do downloads work?", "Is there anything free?"];
  if (path.startsWith("/blog/")) return ["Summarise this guide for me", "What should I do next?", "Any related sessions?"];
  if (path.startsWith("/account")) return ["Where is my join link?", "Where are my downloads?", "How do I reset my password?"];
  return ["How do I get a research internship in Japan?", "Which opportunities close soon?", "Where do I start as a 2nd-year student?"];
}

/** When the model uses a raw URL as link text, show something readable instead. */
function friendlyLabel(href: string) {
  const section = href.startsWith("/") ? href.split("/")[1] : "";
  const hasSlug = href.split("/").filter(Boolean).length > 1;
  const map: Record<string, [string, string]> = {
    sessions: ["View session", "Browse sessions"],
    opportunities: ["View opportunity", "Find opportunities"],
    store: ["View in store", "Open the store"],
    blog: ["Read the guide", "Read the blog"],
    universities: ["View university", "Find universities"],
    account: ["Open your account", "Open your account"],
    videos: ["Watch the video", "Watch videos"],
  };
  const pair = map[section ?? ""];
  if (pair) return hasSlug ? pair[0] : pair[1];
  return href.startsWith("/") ? "Open page" : "Official page";
}

/** Tiny, safe markdown: **bold**, [links](/path), bullets, numbered steps and a "Next step:" callout. No HTML is ever injected. */
function Rich({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  const inline = (line: string, key: string) => {
    const parts: React.ReactNode[] = [];
    const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|\[(\/[^\]\s]+)\](?!\()/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(line))) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      if (m[1]) parts.push(<strong key={`${key}-${i++}`} className="font-semibold text-ink">{m[1]}</strong>);
      else {
        // [text](href), or a bare [/path] the model sometimes writes.
        const href = m[3] ?? m[4]!;
        const label = !m[2] || /^(\/|https?:)/.test(m[2]) ? friendlyLabel(href) : m[2];
        const chip = "mx-0.5 rounded-md bg-accent-soft px-1.5 py-0.5 text-[0.85rem] font-medium text-accent-deep no-underline [box-decoration-break:clone] transition-colors hover:bg-accent hover:text-white";
        if (href.startsWith("/") && !href.startsWith("//")) parts.push(<Link key={`${key}-${i++}`} href={href} onClick={onNavigate} className={chip}>{label} <span aria-hidden>→</span></Link>);
        else if (/^https:\/\//.test(href)) parts.push(<a key={`${key}-${i++}`} href={href} target="_blank" rel="noopener noreferrer nofollow" className={chip}>{label} <span aria-hidden>↗</span></a>);
        else parts.push(label);
      }
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return parts;
  };

  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;
  const flush = (k: number) => {
    if (!list) return;
    const items = list.items.map((l, j) => <li key={j} className="pl-0.5">{inline(l, `li-${k}-${j}`)}</li>);
    blocks.push(
      list.kind === "ol" ? (
        <ol key={`ol-${k}`} className="my-1.5 list-decimal space-y-1 pl-5 marker:font-semibold marker:text-accent">{items}</ol>
      ) : (
        <ul key={`ul-${k}`} className="my-1.5 list-disc space-y-1 pl-5 marker:text-accent">{items}</ul>
      ),
    );
    list = null;
  };
  lines.forEach((raw, k) => {
    const line = raw.trimEnd();
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const ul = line.match(/^\s*[-*•]\s+(.*)$/);
    if (ol || ul) {
      const kind = ol ? "ol" : "ul";
      if (list && list.kind !== kind) flush(k);
      list ??= { kind, items: [] };
      list.items.push((ol ?? ul)![1]!);
      return;
    }
    flush(k);
    const t = line.trim().replace(/^#+\s*/, "");
    if (!t) return;
    const next = t.match(/^\**next step:?\**:?\s*(.*)$/i);
    if (next) {
      blocks.push(
        <p key={`n-${k}`} className="mt-2 rounded-xl border-l-[3px] border-accent bg-accent-soft/50 px-3 py-2 text-[0.86rem]">
          <span className="jp mr-1 text-accent">次</span><strong className="font-semibold text-ink">Next step:</strong> {inline(next[1]!, `n-${k}`)}
        </p>,
      );
      return;
    }
    blocks.push(<p key={`p-${k}`} className={blocks.length === 0 ? "mb-1" : "my-1"}>{inline(t, `p-${k}`)}</p>);
  });
  flush(lines.length);
  return <>{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</>;
}

export function ChatAssistant() {
  const path = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Restore this tab's conversation.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as Msg[] | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from sessionStorage after mount
      if (Array.isArray(saved) && saved.length) setMessages(saved.slice(-30));
    } catch {
      /* storage unavailable */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      /* storage unavailable */
    }
  }, [messages]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, open]);
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text: string) {
    const content = text.trim().slice(0, 1500);
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m !== GREETING).slice(-12), path }),
      });
      const json = (await res.json().catch(() => null)) as { data?: { reply: string }; error?: { message?: string } } | null;
      if (!res.ok || !json?.data) throw new Error(json?.error?.message ?? "Kittu couldn't answer right now. Please try again.");
      setMessages((m) => [...m, { role: "assistant", content: json.data!.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const fresh = messages.length <= 1;

  return (
    <div className="print:hidden">
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="kittu-chat"
        aria-label={open ? "Close chat with Kittu" : "Chat with Kittu, the study assistant"}
        className={cn(
          "group fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-full border border-line bg-[#fffdf9] py-1.5 pl-1.5 pr-4 shadow-[0_18px_40px_-18px_rgba(29,43,69,0.55)] transition-all hover:-translate-y-0.5 sm:bottom-6 sm:right-6",
          open && "max-sm:hidden",
        )}
      >
        <span className="relative size-11 overflow-hidden rounded-full bg-sakura ring-2 ring-accent">
          <Image src="/images/mascot/kittu-avatar.webp" alt="" fill sizes="44px" className="object-cover" />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-[0.65rem] text-muted"><span className="jp text-accent">質問?</span> Need help?</span>
          <span className="block text-sm font-medium text-ink">{open ? "Close chat" : "Ask Kittu"}</span>
        </span>
        {!open && <span aria-hidden className="absolute -right-0.5 -top-0.5 size-3 animate-pulse rounded-full border-2 border-[#fffdf9] bg-accent" />}
      </button>

      {/* Panel */}
      {open && (
        <section
          id="kittu-chat"
          role="dialog"
          aria-label="Ask Kittu"
          className="fixed inset-x-2 bottom-2 top-16 z-[61] flex flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-[0_30px_80px_-30px_rgba(29,43,69,0.6)] sm:inset-x-auto sm:bottom-24 sm:right-6 sm:top-auto sm:h-[min(36rem,calc(100dvh-8rem))] sm:w-[24rem]"
        >
          {/* Header: vermilion with a seigaiha wave */}
          <header className="relative shrink-0 overflow-hidden bg-accent px-4 py-3.5 text-white">
            <span aria-hidden className="seigaiha absolute inset-0 opacity-30 mix-blend-soft-light" />
            <div className="relative flex items-center gap-3">
              <span className="relative size-11 shrink-0 overflow-hidden rounded-full bg-[#fffdf9] ring-2 ring-white/70">
                <Image src="/images/mascot/kittu-avatar.webp" alt="" fill sizes="44px" className="object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">Kittu <span className="jp text-sm text-white/80">先輩</span></p>
                <p className="text-xs text-white/85">Your study-in-Japan assistant</p>
              </div>
              <button type="button" onClick={() => { setMessages([GREETING]); setError(null); }} title="New chat" aria-label="Start a new chat" className="grid size-8 place-items-center rounded-full text-white/90 hover:bg-white/15"><RotateCcw className="size-4" /></button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="grid size-8 place-items-center rounded-full text-white/90 hover:bg-white/15"><X className="size-4" /></button>
            </div>
          </header>

          {/* Messages */}
          <div ref={listRef} className="asanoha flex-1 space-y-3 overflow-y-auto overscroll-contain px-3.5 py-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <span className="relative mt-0.5 size-7 shrink-0 overflow-hidden rounded-full bg-sakura ring-1 ring-line">
                    <Image src="/images/mascot/kittu-avatar.webp" alt="" fill sizes="28px" className="object-cover" />
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-[0.9rem] leading-relaxed",
                    m.role === "user" ? "rounded-br-md bg-ink text-cream" : "rounded-tl-md border border-line bg-[#fffdf9] text-ink-2 shadow-sm",
                  )}
                >
                  {m.role === "assistant" ? <Rich text={m.content} onNavigate={() => setOpen(false)} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2" aria-live="polite">
                <span className="relative size-7 shrink-0 overflow-hidden rounded-full bg-sakura ring-1 ring-line">
                  <Image src="/images/mascot/kittu-avatar.webp" alt="" fill sizes="28px" className="object-cover" />
                </span>
                <span className="inline-flex items-center gap-1 rounded-2xl border border-line bg-[#fffdf9] px-3 py-2.5" aria-label="Kittu is typing">
                  {[0, 1, 2].map((d) => <span key={d} className="size-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: `${d * 150}ms` }} />)}
                </span>
              </div>
            )}
            {error && <p role="alert" className="rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent-deep">{error}</p>}
            {fresh && !busy && (
              <div className="space-y-1.5 pt-1">
                <p className="px-1 text-xs text-muted">Try asking:</p>
                {suggestionsFor(path).map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="block w-full rounded-xl border border-line bg-[#fffdf9] px-3 py-2 text-left text-sm text-ink transition-colors hover:border-accent/50 hover:bg-accent-soft/40">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="shrink-0 border-t border-line bg-[#fffdf9] p-2.5"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-line bg-paper px-3 py-1.5 focus-within:border-ink/40">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                rows={1}
                maxLength={1500}
                placeholder="Ask about internships, scholarships…"
                aria-label="Your question"
                className="max-h-28 min-h-[2.25rem] flex-1 resize-none bg-transparent py-1.5 text-[0.92rem] text-ink outline-none placeholder:text-muted"
              />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="mb-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent text-white transition-colors hover:bg-accent-deep disabled:bg-paper-3 disabled:text-muted">
                <ArrowUp className="size-4" />
              </button>
            </div>
            <p className="mt-1.5 px-1 text-center text-[0.65rem] text-muted">Kittu can make mistakes. Check official pages for deadlines and requirements.</p>
          </form>
        </section>
      )}
    </div>
  );
}
