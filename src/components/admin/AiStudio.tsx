"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, CircleAlert, Loader2, Play, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/admin/api";
import { TagInput } from "@/components/admin/TagInput";
import { Button, Card, Field, PageHeader, Toggle } from "@/components/admin/ui";
import { timeAgo } from "@/lib/utils/text";
import { cn } from "@/lib/utils/cn";
import type { AutomationRunDTO, PostFull } from "@/lib/types";
import type { SiteSettings } from "@/lib/validation/settings";

const COVER_LABELS: Record<string, string> = { auto: "Automatic", generated: "Branded design", video: "Video thumbnail", unsplash: "Stock photo" };
const RUN_LABELS: Record<string, string> = { succeeded: "Done", failed: "Failed", running: "Writing…" };

const STEPS = ["Choosing an angle and outline", "Writing the article", "Checking quality and duplicates", "Preparing the cover image", "Saving your draft"];

export function AiStudio({
  topics,
  categories,
  automation,
  initialRuns,
  config,
}: {
  topics: string[];
  categories: string[];
  automation: SiteSettings["automation"];
  initialRuns: AutomationRunDTO[];
  config: { aiReady: boolean; autoReady: boolean };
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "custom">(topics.length ? "list" : "custom");
  const [topic, setTopic] = useState("");
  const [custom, setCustom] = useState("");
  const [category, setCategory] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [runs, setRuns] = useState(initialRuns);
  const [running, setRunning] = useState(false);
  const [runPublish, setRunPublish] = useState(automation.publishMode === "publish");

  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 9000);
    return () => clearInterval(t);
  }, [generating]);

  async function generate() {
    setStep(0);
    setGenerating(true);
    try {
      const chosen = mode === "custom" ? custom.trim() : topic;
      const res = await api<{ post: PostFull; warnings: string[] }>("/api/admin/ai/generate", {
        body: { topic: chosen || undefined, category: category || undefined, keywords: keywords.length ? keywords : undefined, notes: notes.trim() || undefined },
      });
      toast.success("Draft ready! Review and edit it before publishing.");
      router.push(`/admin/posts/${res.post.id}`);
    } catch (e) {
      toast.error(errorMessage(e), { duration: 8000 });
      setGenerating(false);
    }
  }

  async function refreshRuns() {
    try {
      const r = await api<{ runs: AutomationRunDTO[] }>("/api/admin/automation");
      setRuns(r.runs);
    } catch {
      /* non-critical */
    }
  }

  async function runNow() {
    setRunning(true);
    try {
      const r = await api<{ status: string; post?: { id: string; title: string }; reason?: string }>("/api/admin/automation", { body: { publish: runPublish } });
      if (r.post?.id) toast.success(`${r.status === "published" ? "Published" : "Drafted"}: “${r.post.title}”`, { action: { label: "Open", onClick: () => router.push(`/admin/posts/${r.post!.id}`) } });
      else toast(r.reason ?? r.status);
    } catch (e) {
      toast.error(errorMessage(e), { duration: 8000 });
    } finally {
      setRunning(false);
      refreshRuns();
    }
  }



  return (
    <>
      <PageHeader
        title={<>AI <em className="text-accent">writer</em></>}
        description="Generate thoughtful, on-brand drafts in your voice. Nothing is published from here without your review."
      />

      {!config.aiReady && (
        <div className="mb-6 flex gap-3 rounded-xl border border-[#e8d3a5] bg-[#faf1dc] p-4 text-sm text-[#6d4c0f]">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <p>The AI writer isn&apos;t connected yet. Ask your developer to connect the AI service, then reload this page.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="display text-3xl">Draft a new article</h2>
          <p className="mt-1 text-sm text-ink-2">Pick a topic from your list, or describe your own idea.</p>

          <div className="mt-6 inline-flex rounded-full border border-line p-1 text-sm">
            {(["list", "custom"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={cn("rounded-full px-4 py-1.5", mode === m ? "bg-ink text-cream" : "text-ink-2")}>
                {m === "list" ? "From my topics" : "My own idea"}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-5">
            {mode === "list" ? (
              <div>
                <p className="label">Topic</p>
                <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                  <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 text-sm", topic === "" ? "border-ink bg-paper-2" : "border-line hover:border-ink/30")}>
                    <input type="radio" name="topic" checked={topic === ""} onChange={() => setTopic("")} className="mt-0.5 accent-[var(--color-accent)]" />
                    <span><span className="font-medium">Surprise me</span><span className="block text-xs text-muted">Picks the topic you haven&apos;t covered in the longest time.</span></span>
                  </label>
                  {topics.map((t) => (
                    <label key={t} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 text-sm", topic === t ? "border-ink bg-paper-2" : "border-line hover:border-ink/30")}>
                      <input type="radio" name="topic" checked={topic === t} onChange={() => setTopic(t)} className="mt-0.5 accent-[var(--color-accent)]" />
                      {t}
                    </label>
                  ))}
                </div>
                <p className="hint">Edit this list in <Link href="/admin/settings?tab=ai" className="underline">Settings → AI writing</Link>.</p>
              </div>
            ) : (
              <Field label="What should the article be about?" htmlFor="custom-topic">
                <textarea id="custom-topic" rows={3} value={custom} onChange={(e) => setCustom(e.target.value)} className="field" placeholder="e.g. How I'd prepare for the MEXT interview if I had one month" maxLength={300} />
              </Field>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Category" htmlFor="ai-cat">
                <select id="ai-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="field">
                  <option value="">Let the AI choose</option>
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Keywords (optional)">
                <TagInput value={keywords} onChange={setKeywords} max={10} />
              </Field>
            </div>
            <Field label="Extra notes for the writer (optional)" htmlFor="ai-notes" hint="Personal details, points to include, things to avoid.">
              <textarea id="ai-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="field" maxLength={1500} placeholder="e.g. Mention that most replies come in the second week. Keep it under 1,500 words." />
            </Field>

            {generating ? (
              <div className="rounded-xl border border-line bg-paper-2 p-4" aria-live="polite">
                <ul className="space-y-2 text-sm">
                  {STEPS.map((s, i) => (
                    <li key={s} className={cn("flex items-center gap-2.5", i > step && "text-muted")}>
                      {i < step ? <Check className="size-4 text-moss" /> : i === step ? <Loader2 className="size-4 animate-spin text-accent" /> : <span className="size-4 rounded-full border border-line" />}
                      {s}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted">This usually takes 20–60 seconds. Keep this tab open.</p>
              </div>
            ) : (
              <Button variant="primary" onClick={generate} disabled={!config.aiReady || (mode === "custom" && custom.trim().length < 5)} className="!h-11 w-full sm:w-auto">
                <Wand2 className="size-4" /> Generate draft
              </Button>
            )}
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Automatic posting</h2>
              <span className={cn("rounded-full px-2.5 py-1 text-[0.72rem] font-medium", automation.enabled ? "bg-[#dde8de] text-moss" : "bg-paper-3 text-ink-2")}>{automation.enabled ? "On" : "Off"}</span>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">New posts are</dt><dd>{automation.publishMode === "publish" ? "published automatically" : "saved as drafts"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">At most</dt><dd>{automation.maxPerDay} per day</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Minimum gap</dt><dd>{automation.minHoursBetweenRuns} hours</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Cover images</dt><dd>{COVER_LABELS[automation.coverStrategy]}</dd></div>
            </dl>
            <Link href="/admin/settings?tab=automation" className="mt-3 inline-block text-sm underline">Change these settings</Link>
            {!config.autoReady && (
              <p className="mt-3 rounded-xl bg-[#faf1dc] px-3 py-2 text-xs text-[#6d4c0f]">Automatic posting needs a one-time setup from your developer before it can run on its own. You can still create posts below.</p>
            )}

            <div className="mt-5 border-t border-line pt-5">
              <Toggle checked={runPublish} onChange={setRunPublish} label="Publish immediately" description="Off = it's saved as a draft for you to review." />
              <Button className="mt-4 w-full" onClick={runNow} loading={running} disabled={!config.aiReady}>
                {!running && <Play className="size-4" />} Write &amp; post one now
              </Button>
            </div>
          </Card>

        </div>
      </div>

      <Card className="mt-6 !p-0">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-medium">History</h2>
          <Button size="sm" variant="ghost" onClick={refreshRuns}>Refresh</Button>
        </div>
        {runs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="px-6 py-2.5 font-medium">When</th>
                  <th className="px-3 py-2.5 font-medium">Started by</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Result</th>
                  <th className="px-6 py-2.5 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {runs.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="whitespace-nowrap px-6 py-3 text-ink-2">{timeAgo(r.startedAt)}</td>
                    <td className="px-3 py-3 text-ink-2">{r.trigger === "manual" ? "You" : "Automatic"}</td>
                    <td className="px-3 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.72rem] font-medium", r.status === "succeeded" ? "bg-[#dde8de] text-moss" : r.status === "failed" ? "bg-accent-soft text-accent-deep" : r.status === "running" ? "bg-[#f3e6c8] text-[#7a5410]" : "bg-paper-3 text-ink-2")}>
                        {RUN_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="max-w-md px-3 py-3">
                      {r.postId ? <Link href={`/admin/posts/${r.postId}`} className="underline-offset-2 hover:underline">{r.message}</Link> : <span className="text-ink-2">{r.message}</span>}
                      {r.warnings?.length ? <p className="mt-1 text-xs text-[#a8741a]">{r.warnings.length} note{r.warnings.length > 1 ? "s" : ""}</p> : null}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right font-mono text-xs text-muted">{r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-8 text-sm text-ink-2"><Sparkles className="mr-1 inline size-4 text-accent" /> Nothing yet. Posts written automatically or with the button above will be listed here.</p>
        )}
      </Card>
    </>
  );
}
