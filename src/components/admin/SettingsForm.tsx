"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiClientError, errorMessage } from "@/lib/admin/api";
import { AccountSettings, type AccountInfo } from "@/components/admin/AccountSettings";
import { IntegrationNotice, type PaymentStatus } from "@/components/admin/IntegrationNotice";
import { Button, Card, Field, PageHeader, Toggle } from "@/components/admin/ui";
import { cn } from "@/lib/utils/cn";
import type { SiteSettings } from "@/lib/validation/settings";

const TABS = [
  { id: "profile", label: "Profile & homepage" },
  { id: "about", label: "About & story" },
  { id: "social", label: "Social links" },
  { id: "ai", label: "AI writing" },
  { id: "sessions", label: "Sessions" },
  { id: "comments", label: "Comments" },
  { id: "automation", label: "Automation" },
  { id: "password", label: "Login & password" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

function PairList<T extends Record<string, string>>({
  items, onChange, fields, max, addLabel, stacked = false,
}: {
  items: T[]; onChange: (v: T[]) => void; fields: { key: keyof T; placeholder: string; className?: string; multiline?: boolean }[]; max: number; addLabel: string; stacked?: boolean;
}) {
  return (
    <div className={stacked ? "space-y-4" : "space-y-2"}>
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className={cn("flex min-w-0 flex-1 gap-2", stacked ? "flex-col" : "items-start")}>
            {fields.map((f) =>
              f.multiline ? (
                <textarea key={String(f.key)} rows={2} value={item[f.key]} placeholder={f.placeholder} className={cn("field text-sm", f.className)} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))} />
              ) : (
                <input key={String(f.key)} value={item[f.key]} placeholder={f.placeholder} className={cn("field text-sm", f.className)} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))} />
              ),
            )}
          </div>
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove" className="mt-1.5 grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-paper-2 hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
      ))}
      {items.length < max && (
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange([...items, Object.fromEntries(fields.map((f) => [f.key, ""])) as T])}>
          <Plus className="size-3.5" /> {addLabel}
        </Button>
      )}
    </div>
  );
}

type Integrations = { payments: PaymentStatus; email: boolean; googleMeet: boolean };

export function SettingsForm({ initial, initialTab, account, integrations }: { initial: SiteSettings; initialTab?: string; account: AccountInfo; integrations: Integrations }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === initialTab) ? (initialTab as Tab) : "profile");
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Line-based textareas keep their own text so blank lines don't vanish mid-typing.
  const [topicsText, setTopicsText] = useState(initial.ai.topics.join("\n"));
  const [bannedText, setBannedText] = useState(initial.ai.bannedPhrases.join("\n"));
  const [catsText, setCatsText] = useState(initial.ai.categories.join("\n"));
  const [interestsText, setInterestsText] = useState(initial.profile.interests.join(", "));
  const [benefitsText, setBenefitsText] = useState(initial.mentorship.benefits.join("\n"));

  const current = useMemo<SiteSettings>(
    () => ({
      ...s,
      profile: { ...s.profile, interests: interestsText.split(",").map((t) => t.trim()).filter(Boolean) },
      ai: { ...s.ai, topics: lines(topicsText), bannedPhrases: lines(bannedText), categories: lines(catsText) },
      mentorship: { ...s.mentorship, benefits: lines(benefitsText) },
    }),
    [s, topicsText, bannedText, catsText, interestsText, benefitsText],
  );
  const dirty = JSON.stringify(current) !== JSON.stringify(saved);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => dirty && e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const p = <K extends keyof SiteSettings["profile"]>(k: K, v: SiteSettings["profile"][K]) => setS((x) => ({ ...x, profile: { ...x.profile, [k]: v } }));
  const so = <K extends keyof SiteSettings["social"]>(k: K, v: string) => setS((x) => ({ ...x, social: { ...x.social, [k]: v } }));
  const ai = <K extends keyof SiteSettings["ai"]>(k: K, v: SiteSettings["ai"][K]) => setS((x) => ({ ...x, ai: { ...x.ai, [k]: v } }));
  const cm = <K extends keyof SiteSettings["comments"]>(k: K, v: SiteSettings["comments"][K]) => setS((x) => ({ ...x, comments: { ...x.comments, [k]: v } }));
  const au = <K extends keyof SiteSettings["automation"]>(k: K, v: SiteSettings["automation"][K]) => setS((x) => ({ ...x, automation: { ...x.automation, [k]: v } }));
  const mt = <K extends keyof SiteSettings["mentorship"]>(k: K, v: SiteSettings["mentorship"][K]) => setS((x) => ({ ...x, mentorship: { ...x.mentorship, [k]: v } }));
  const err = (k: string) => errors[k];

  async function save() {
    setSaving(true);
    setErrors({});
    try {
      const next = await api<SiteSettings>("/api/admin/settings", { method: "PATCH", body: current });
      setS(next);
      setSaved(next);
      setTopicsText(next.ai.topics.join("\n"));
      setBannedText(next.ai.bannedPhrases.join("\n"));
      setCatsText(next.ai.categories.join("\n"));
      setInterestsText(next.profile.interests.join(", "));
      setBenefitsText(next.mentorship.benefits.join("\n"));
      toast.success("Settings saved. The website updates within a moment.");
      router.refresh();
    } catch (e) {
      if (e instanceof ApiClientError) {
        setErrors(e.fieldErrors);
        const first = Object.keys(e.fieldErrors)[0] ?? "";
        const t = first.startsWith("social") ? "social" : first.startsWith("ai") ? "ai" : first.startsWith("automation") ? "automation" : first.startsWith("comments") ? "comments" : first.startsWith("mentorship") ? "sessions" : first.match(/longBio|quickFacts|interests|principles/) ? "about" : first ? "profile" : null;
        if (t) setTab(t as Tab);
      }
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Everything visitors read about you, plus how the AI writes and when it posts."
        actions={tab === "password" ? undefined : <Button variant="primary" onClick={save} loading={saving} disabled={!dirty}>{dirty ? "Save changes" : "Saved"}</Button>}
      />
      <div className="no-scrollbar mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn("-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm", tab === t.id ? "border-accent text-ink" : "border-transparent text-ink-2 hover:text-ink")}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="space-y-5">
            <h2 className="font-medium">Identity</h2>
            <Field label="Your name" error={err("profile.name")}><input className="field" value={s.profile.name} onChange={(e) => p("name", e.target.value)} /></Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Channel name" error={err("profile.channelName")}><input className="field" value={s.profile.channelName} onChange={(e) => p("channelName", e.target.value)} /></Field>
              <Field label="YouTube handle"><input className="field" value={s.profile.handle} onChange={(e) => p("handle", e.target.value)} /></Field>
            </div>
            <Field label="Current role" hint="Shown in structured data for search engines."><input className="field" value={s.profile.currentRole} onChange={(e) => p("currentRole", e.target.value)} /></Field>
            <Field label="Location"><input className="field" value={s.profile.location} onChange={(e) => p("location", e.target.value)} /></Field>
            <Field label="Profile photo URL" hint="Your YouTube profile picture works well. Upload images in the Media library and paste the URL here." error={err("profile.avatarUrl")}>
              <input className="field" value={s.profile.avatarUrl} onChange={(e) => p("avatarUrl", e.target.value)} />
            </Field>
            <Field label="Portrait photo URL (optional)" hint="A larger photo for the homepage and Journey page. Falls back to the profile photo." error={err("profile.portraitUrl")}>
              <input className="field" value={s.profile.portraitUrl} onChange={(e) => p("portraitUrl", e.target.value)} />
            </Field>
          </Card>
          <Card className="space-y-5">
            <h2 className="font-medium">Homepage hero</h2>
            <Field label="Small line above the headline"><input className="field" value={s.profile.heroEyebrow} onChange={(e) => p("heroEyebrow", e.target.value)} /></Field>
            <Field label="Headline" hint="The part after the first comma is shown in red italics." error={err("profile.heroTitle")} counter={{ value: s.profile.heroTitle.length, max: 160, ideal: [20, 70] }}>
              <input className="field" value={s.profile.heroTitle} onChange={(e) => p("heroTitle", e.target.value)} maxLength={160} />
            </Field>
            <Field label="Introduction under the headline" counter={{ value: s.profile.heroSubtitle.length, max: 500 }}>
              <textarea rows={4} className="field" value={s.profile.heroSubtitle} onChange={(e) => p("heroSubtitle", e.target.value)} maxLength={500} />
            </Field>
            <Field label="Stats (up to 4)" hint="e.g. 20.8K · Subscribers">
              <PairList items={s.profile.stats} onChange={(v) => p("stats", v)} max={4} addLabel="Add stat" fields={[{ key: "value", placeholder: "20.8K", className: "w-28" }, { key: "label", placeholder: "Subscribers" }]} />
            </Field>
          </Card>
        </div>
      )}

      {tab === "about" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="space-y-5">
            <Field label="Greeting headline" hint="The big sentence in the “Hello there” section."><textarea rows={2} className="field" value={s.profile.introTitle} onChange={(e) => p("introTitle", e.target.value)} /></Field>
            <Field label="Short bio" hint="Used on the homepage, author boxes and by the AI writer." counter={{ value: s.profile.shortBio.length, max: 600 }}>
              <textarea rows={4} className="field" value={s.profile.shortBio} onChange={(e) => p("shortBio", e.target.value)} maxLength={600} />
            </Field>
            <Field label="Your story (Journey page)" hint="Leave a blank line between paragraphs. The first paragraph is shown large." counter={{ value: s.profile.longBio.length, max: 6000 }}>
              <textarea rows={12} className="field text-sm leading-relaxed" value={s.profile.longBio} onChange={(e) => p("longBio", e.target.value)} maxLength={6000} />
            </Field>
          </Card>
          <div className="space-y-6">
            <Card className="space-y-4">
              <h2 className="font-medium">Quick facts</h2>
              <PairList items={s.profile.quickFacts} onChange={(v) => p("quickFacts", v)} max={10} addLabel="Add fact" fields={[{ key: "label", placeholder: "Based in", className: "w-36" }, { key: "value", placeholder: "Lucknow, India" }]} />
            </Card>
            <Card className="space-y-4">
              <Field label="Things you love" hint="Separate with commas."><textarea rows={2} className="field" value={interestsText} onChange={(e) => setInterestsText(e.target.value)} /></Field>
            </Card>
            <Card className="space-y-4">
              <h2 className="font-medium">What you believe (up to 6)</h2>
              <PairList items={s.profile.principles} onChange={(v) => p("principles", v)} max={6} addLabel="Add principle" fields={[{ key: "title", placeholder: "Honest over hype", className: "w-44" }, { key: "text", placeholder: "One or two sentences", multiline: true }]} />
            </Card>
          </div>
        </div>
      )}

      {tab === "social" && (
        <Card className="max-w-2xl space-y-5">
          {(["youtube", "instagram", "linkedin", "x"] as const).map((k) => (
            <Field key={k} label={k === "x" ? "X (Twitter)" : k[0]!.toUpperCase() + k.slice(1)} error={err(`social.${k}`)} hint="Full link, or leave empty to hide.">
              <input className="field" value={s.social[k]} onChange={(e) => so(k, e.target.value)} placeholder="https://…" />
            </Field>
          ))}
          <Field label="Public contact email (optional)" error={err("social.email")}><input className="field" type="email" value={s.social.email} onChange={(e) => so("email", e.target.value)} /></Field>
        </Card>
      )}

      {tab === "ai" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="space-y-5">
            <h2 className="font-medium">What you write about</h2>
            <Field label="Your field & niche" hint="The more specific, the better the articles."><textarea rows={5} className="field text-sm" value={s.ai.niche} onChange={(e) => ai("niche", e.target.value)} /></Field>
            <Field label="Who you write for"><textarea rows={4} className="field text-sm" value={s.ai.audience} onChange={(e) => ai("audience", e.target.value)} /></Field>
            <Field label="Your voice"><textarea rows={4} className="field text-sm" value={s.ai.voice} onChange={(e) => ai("voice", e.target.value)} /></Field>
            <Field label="Writing guidelines" hint="Rules the AI must follow."><textarea rows={9} className="field text-sm" value={s.ai.guidelines} onChange={(e) => ai("guidelines", e.target.value)} /></Field>
          </Card>
          <div className="space-y-6">
            <Card className="space-y-5">
              <Field label={`Topic ideas (${lines(topicsText).length})`} hint="One per line. Automated posts rotate through these, covering the least recently used first." error={err("ai.topics")}>
                <textarea rows={12} className="field text-sm" value={topicsText} onChange={(e) => setTopicsText(e.target.value)} />
              </Field>
              <Field label="Blog categories" hint="One per line. Used by the editor and the AI." error={err("ai.categories")}><textarea rows={5} className="field text-sm" value={catsText} onChange={(e) => setCatsText(e.target.value)} /></Field>
            </Card>
            <Card className="space-y-5">
              <Field label="Words & phrases to avoid" hint="One per line. Keeps the writing human."><textarea rows={5} className="field text-sm" value={bannedText} onChange={(e) => setBannedText(e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Minimum words" error={err("ai.minWords")}><input type="number" min={300} max={3000} step={50} className="field" value={s.ai.minWords} onChange={(e) => ai("minWords", Number(e.target.value))} /></Field>
                <Field label="Maximum words" error={err("ai.maxWords")}><input type="number" min={500} max={4000} step={50} className="field" value={s.ai.maxWords} onChange={(e) => ai("maxWords", Number(e.target.value))} /></Field>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "password" && <AccountSettings initial={account} />}

      {tab === "sessions" && (
        <>
          <IntegrationNotice {...integrations} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="space-y-5">
              <Toggle checked={s.mentorship.enabled} onChange={(v) => mt("enabled", v)} label="Show Sessions on the website" description="When off, the Sessions page and homepage section are hidden. Existing bookings still work." />
              <Field label="Sessions page headline" error={err("mentorship.headline")} counter={{ value: s.mentorship.headline.length, max: 160 }}>
                <input className="field" value={s.mentorship.headline} onChange={(e) => mt("headline", e.target.value)} />
              </Field>
              <Field label="Introduction" error={err("mentorship.intro")} counter={{ value: s.mentorship.intro.length, max: 800 }}>
                <textarea rows={4} className="field" value={s.mentorship.intro} onChange={(e) => mt("intro", e.target.value)} />
              </Field>
              <Field label="What students get" hint="One per line, up to 8. Shown as a checklist on the Sessions page." error={err("mentorship.benefits")}>
                <textarea rows={5} className="field text-sm" value={benefitsText} onChange={(e) => setBenefitsText(e.target.value)} />
              </Field>
              <Field label="Send new-booking emails to" hint={account.email ? `Leave empty to use your login email (${account.email}).` : "Where you want to hear about new bookings."} error={err("mentorship.notifyEmail")}>
                <input type="email" className="field" value={s.mentorship.notifyEmail} onChange={(e) => mt("notifyEmail", e.target.value)} placeholder={account.email ?? "you@example.com"} />
              </Field>
            </Card>
            <div className="space-y-6">
              <Card className="space-y-4">
                <div>
                  <h2 className="font-medium text-ink">Sessions before this website</h2>
                  <p className="mt-1 text-sm text-muted">Added to the public counters (“sessions taken”, “students guided”). Sessions booked here are counted automatically.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Past sessions" error={err("mentorship.pastSessions")}><input type="number" min={0} className="field" value={s.mentorship.pastSessions} onChange={(e) => mt("pastSessions", Number(e.target.value))} /></Field>
                  <Field label="Past students" error={err("mentorship.pastStudents")}><input type="number" min={0} className="field" value={s.mentorship.pastStudents} onChange={(e) => mt("pastStudents", Number(e.target.value))} /></Field>
                </div>
              </Card>
              <Card className="space-y-3">
                <h2 className="font-medium text-ink">Questions & answers</h2>
                <p className="text-sm text-muted">Shown at the bottom of the Sessions page.</p>
                <PairList
                  items={s.mentorship.faqs}
                  onChange={(v) => mt("faqs", v)}
                  max={10}
                  addLabel="Add a question"
                  stacked
                  fields={[{ key: "q", placeholder: "Question", className: "font-medium" }, { key: "a", placeholder: "Answer", multiline: true }]}
                />
                {Object.keys(errors).some((k) => k.startsWith("mentorship.faqs")) && <p className="text-[0.78rem] text-accent-deep">Fill in both the question and the answer, or remove the empty row.</p>}
              </Card>
            </div>
          </div>
        </>
      )}

      {tab === "comments" && (
        <Card className="max-w-2xl space-y-6">
          <Toggle checked={s.comments.enabled} onChange={(v) => cm("enabled", v)} label="Allow comments on blog posts" description="Readers can comment without an account. They answer a quick math question to keep bots out." />
          <Toggle checked={s.comments.requireApproval} onChange={(v) => cm("requireApproval", v)} label="Approve comments before they appear" description="New comments wait in Comments → Needs review until you approve them. Comments with lots of links are always held for review." />
        </Card>
      )}

      {tab === "automation" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="space-y-6">
            <Toggle checked={s.automation.enabled} onChange={(v) => au("enabled", v)} label="Write new posts automatically" description="When off, no posts are written automatically. You can still write with AI from the AI writer page." />
            <Field label="When a post is generated automatically">
              <div className="grid gap-2">
                {(["publish", "draft"] as const).map((m) => (
                  <label key={m} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm", s.automation.publishMode === m ? "border-ink bg-paper-2" : "border-line")}>
                    <input type="radio" checked={s.automation.publishMode === m} onChange={() => au("publishMode", m)} className="mt-0.5 accent-[var(--color-accent)]" />
                    <span>
                      <span className="font-medium">{m === "publish" ? "Publish it immediately" : "Save it as a draft for me to review"}</span>
                      <span className="block text-xs text-muted">{m === "publish" ? "Fully hands-off." : "Safer: nothing goes live until you press Publish."}</span>
                    </span>
                  </label>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Max posts per day" error={err("automation.maxPerDay")}><input type="number" min={1} max={10} className="field" value={s.automation.maxPerDay} onChange={(e) => au("maxPerDay", Number(e.target.value))} /></Field>
              <Field label="Min. hours between posts" error={err("automation.minHoursBetweenRuns")}><input type="number" min={0} max={720} className="field" value={s.automation.minHoursBetweenRuns} onChange={(e) => au("minHoursBetweenRuns", Number(e.target.value))} /></Field>
            </div>
            <Field label="Cover images for AI posts">
              <select className="field" value={s.automation.coverStrategy} onChange={(e) => au("coverStrategy", e.target.value as SiteSettings["automation"]["coverStrategy"])}>
                <option value="auto">Automatic (stock photo → video thumbnail → branded design)</option>
                <option value="generated">Always a branded typographic design</option>
                <option value="video">Related video thumbnail (falls back to design)</option>
                <option value="unsplash">Stock photo from Unsplash (falls back to design)</option>
              </select>
            </Field>
          </Card>
          <Card className="space-y-3 text-sm text-ink-2">
            <h2 className="font-medium text-ink">How automatic posting works</h2>
            <p>On a regular schedule, the website writes a new article for you, following the rules on the left.</p>
            <p>Each time, it picks the topic from your list that hasn&apos;t been covered for the longest time, writes it in your voice using your guidelines, adds a cover image, checks that it&apos;s complete and not a repeat of an earlier post, then publishes it or saves it as a draft.</p>
            <p>You&apos;ll find every automatically written post in <Link href="/admin/posts" className="underline">Blog posts</Link> (marked “Auto”) and in the <Link href="/admin/ai" className="underline">AI writer</Link> history.</p>
          </Card>
        </div>
      )}

      {dirty && (
        <div className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-between gap-3 rounded-full border border-line bg-ink px-5 py-2.5 text-sm text-cream shadow-2xl lg:left-[calc(16rem+2rem)] lg:right-8">
          <span>You have unsaved changes</span>
          <div className="flex gap-2">
            <button type="button" className="rounded-full px-3 py-1.5 text-cream-muted hover:text-cream" onClick={() => { setS(saved); setTopicsText(saved.ai.topics.join("\n")); setBannedText(saved.ai.bannedPhrases.join("\n")); setCatsText(saved.ai.categories.join("\n")); setInterestsText(saved.profile.interests.join(", ")); setBenefitsText(saved.mentorship.benefits.join("\n")); }}>Discard</button>
            <Button variant="accent" size="sm" onClick={save} loading={saving}>Save</Button>
          </div>
        </div>
      )}
    </>
  );
}
