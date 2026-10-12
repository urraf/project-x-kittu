"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AlertCircle, ArrowUpRight, BadgeCheck, Check, ChevronDown, Loader2, Sparkles } from "lucide-react";
import { Kittu } from "@/components/mascot/Kittu";
import { FIELDS, REGIONS, TAG_LABELS, regionLabel, type UniversityTag } from "@/lib/universities/taxonomy";
import { cn } from "@/lib/utils/cn";

type Result = {
  id: string;
  slug: string;
  name: string;
  type: string;
  city: string;
  region: string;
  tags: string[];
  score: number;
  label: string;
  band: "reach" | "match" | "safe";
  breakdown: { field: number; academic: number; experience: number; funding: number; language: number };
  reasons: string[];
  checks: string[];
  verifiedPrograms: { name: string; degree: string; language: string; url: string }[];
  website: string;
};
type Response = { profile: { cgpaPercent: number; level: string }; considered: number; results: Result[] };

const BANDS = {
  reach: { label: "Reach", tone: "bg-accent-soft text-accent-deep" },
  match: { label: "Match", tone: "bg-indigo-soft text-indigo" },
  safe: { label: "Safer choice", tone: "bg-matcha-soft text-moss" },
} as const;
const PARTS: { key: keyof Result["breakdown"]; label: string; max: number }[] = [
  { key: "field", label: "Field fit", max: 30 },
  { key: "academic", label: "Academic profile", max: 25 },
  { key: "experience", label: "Experience", max: 20 },
  { key: "funding", label: "Funding fit", max: 15 },
  { key: "language", label: "Language", max: 10 },
];

function Select({ label, name, value, onChange, children, hint }: { label: string; name: string; value: string; onChange: (v: string) => void; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
      <span className="relative block">
        <select name={name} value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full appearance-none rounded-xl border border-line bg-[#fffdf9] pl-3.5 pr-9 text-[0.95rem] text-ink hover:border-ink/30 focus:border-ink focus:outline-none">
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      </span>
      {hint && <span className="mt-1 block text-[0.7rem] text-muted">{hint}</span>}
    </label>
  );
}

const INITIAL = {
  degree: "master",
  field: "cs",
  cgpa: "",
  cgpaScale: "10",
  experience: "none",
  englishTest: "none",
  englishScore: "",
  jlpt: "none",
  language: "english",
  funding: "full",
  region: "any",
  city: "any",
  includeWomen: false,
};

export function UniMatch() {
  const [f, setF] = useState(INITIAL);
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const set = (k: keyof typeof INITIAL) => (v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cgpa = Number(f.cgpa);
    if (!f.cgpa || Number.isNaN(cgpa) || cgpa <= 0) return setError("Enter your CGPA (or percentage).");
    if (cgpa > Number(f.cgpaScale)) return setError(`Your CGPA can't be higher than ${f.cgpaScale}.`);
    setLoading(true);
    try {
      const res = await fetch("/api/universities/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, cgpa, cgpaScale: Number(f.cgpaScale), englishScore: f.englishScore ? Number(f.englishScore) : undefined }),
      });
      const json = (await res.json()) as { ok: boolean; data?: Response; error?: { message?: string } };
      if (!res.ok || !json.data) throw new Error(json.error?.message ?? "Couldn't build your shortlist. Please try again.");
      setData(json.data);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="relative pt-24 sm:pt-28">
        <p className="absolute left-2 top-0 z-0 max-w-[15rem] rounded-2xl rounded-br-sm border border-line bg-[#fffdf9] px-3.5 py-2 text-sm text-ink shadow-[0_12px_30px_-20px_rgba(29,43,69,0.5)] sm:left-6">
          <span className="jp mr-1 text-accent">一緒に探そう!</span> Let&apos;s find your universities.
        </p>
        <Kittu pose="think" alt="" sizes="8rem" className="pointer-events-none absolute right-4 top-0 z-20 w-24 sm:right-10 sm:w-28" />
        <form onSubmit={submit} className="relative z-10 rounded-3xl border border-line bg-[#fffdf9] p-5 shadow-[0_30px_60px_-45px_rgba(29,43,69,0.6)] md:p-7">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="I want to study" name="degree" value={f.degree} onChange={set("degree")}>
              <option value="bachelor">Bachelor&apos;s</option>
              <option value="master">Master&apos;s</option>
              <option value="phd">PhD</option>
              <option value="research">Research student</option>
              <option value="exchange">Exchange / short term</option>
            </Select>
            <Select label="Field" name="field" value={f.field} onChange={set("field")}>
              {FIELDS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </Select>
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">CGPA / score</span>
              <span className="flex gap-2">
                <input name="cgpa" inputMode="decimal" value={f.cgpa} onChange={(e) => set("cgpa")(e.target.value)} placeholder="e.g. 7.8" className="h-11 w-full min-w-0 rounded-xl border border-line bg-[#fffdf9] px-3.5 text-[0.95rem] text-ink placeholder:text-muted focus:border-ink focus:outline-none" aria-label="CGPA" />
                <span className="relative">
                  <select value={f.cgpaScale} onChange={(e) => set("cgpaScale")(e.target.value)} aria-label="CGPA scale" className="h-11 appearance-none rounded-xl border border-line bg-[#fffdf9] pl-3 pr-8 text-[0.95rem] text-ink focus:border-ink focus:outline-none">
                    <option value="10">/ 10</option>
                    <option value="4">/ 4</option>
                    <option value="5">/ 5</option>
                    <option value="100">%</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                </span>
              </span>
            </label>
            <Select label="Experience" name="experience" value={f.experience} onChange={set("experience")}>
              <option value="none">No research/work yet</option>
              <option value="internship">Research internship / project</option>
              <option value="industry">Industry experience</option>
              <option value="publication">Research publication</option>
              <option value="multiple">Several of these</option>
            </Select>

            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">English test</span>
              <span className="flex gap-2">
                <span className="relative flex-1">
                  <select value={f.englishTest} onChange={(e) => set("englishTest")(e.target.value)} aria-label="English test" className="h-11 w-full appearance-none rounded-xl border border-line bg-[#fffdf9] pl-3.5 pr-8 text-[0.95rem] text-ink focus:border-ink focus:outline-none">
                    <option value="none">Not taken yet</option>
                    <option value="ielts">IELTS</option>
                    <option value="toefl">TOEFL iBT</option>
                    <option value="duolingo">Duolingo</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                </span>
                {f.englishTest !== "none" && (
                  <input inputMode="decimal" value={f.englishScore} onChange={(e) => set("englishScore")(e.target.value)} placeholder="Score" aria-label="English test score" className="h-11 w-20 rounded-xl border border-line bg-[#fffdf9] px-3 text-[0.95rem] text-ink placeholder:text-muted focus:border-ink focus:outline-none" />
                )}
              </span>
            </label>
            <Select label="Japanese (JLPT)" name="jlpt" value={f.jlpt} onChange={set("jlpt")}>
              <option value="none">None yet</option>
              {["N5", "N4", "N3", "N2", "N1"].map((l) => <option key={l} value={l}>{l}</option>)}
            </Select>
            <Select label="Taught in" name="language" value={f.language} onChange={set("language")}>
              <option value="english">English only</option>
              <option value="either">English or Japanese</option>
            </Select>
            <Select label="Funding" name="funding" value={f.funding} onChange={set("funding")}>
              <option value="full">I need a full scholarship</option>
              <option value="partial">Partial scholarship is fine</option>
              <option value="self">I can self-fund</option>
            </Select>

            <Select label="Region" name="region" value={f.region} onChange={set("region")}>
              <option value="any">Anywhere in Japan</option>
              {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
            <Select label="City size" name="city" value={f.city} onChange={set("city")}>
              <option value="any">No preference</option>
              <option value="big">Big city</option>
              <option value="small">Smaller city</option>
            </Select>
            <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm text-ink-2 sm:col-span-2 lg:col-span-1">
              <input type="checkbox" checked={f.includeWomen} onChange={(e) => set("includeWomen")(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
              Include women&apos;s universities
            </label>
            <div className="flex items-end">
              <button type="submit" disabled={loading} className="btn btn-accent h-11 w-full !rounded-xl">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {loading ? "Matching…" : "Find my universities"}
              </button>
            </div>
          </div>
          {error && <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-accent-deep"><AlertCircle className="size-4" /> {error}</p>}
          <p className="mt-4 text-xs text-muted">Nothing you enter is saved. The score shows how well a university fits your profile and preferences; it is not a chance of admission.</p>
        </form>
      </div>

      <div ref={resultsRef} aria-live="polite" className="scroll-mt-24">
        {data && (
          <div className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="display text-3xl md:text-4xl">Your <em className="text-accent">shortlist</em></h3>
                <p className="mt-1 text-sm text-ink-2">
                  Academic profile: <strong className="text-ink">{data.profile.level}</strong> ({data.profile.cgpaPercent}%) · {data.results.length} universities ranked from {data.considered}
                </p>
              </div>
              <p className="flex flex-wrap gap-2 text-xs">
                {(Object.keys(BANDS) as (keyof typeof BANDS)[]).map((b) => <span key={b} className={cn("rounded-full px-2.5 py-1 font-medium", BANDS[b].tone)}>{BANDS[b].label}</span>)}
              </p>
            </div>

            {data.results.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center text-ink-2">No universities matched. Try &ldquo;Anywhere in Japan&rdquo; or a broader field.</p>
            ) : (
              <ol className="mt-6 space-y-4">
                {data.results.map((r, i) => (
                  <li key={r.id} className="rounded-3xl border border-line bg-[#fffdf9] p-5 md:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start">
                      <div className="flex items-center gap-4 md:w-60 md:shrink-0 md:flex-col md:items-start">
                        <span className="relative grid size-20 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--color-accent) ${r.score * 3.6}deg, var(--color-paper-3) 0)` }}>
                          <span className="grid size-16 place-items-center rounded-full bg-[#fffdf9]">
                            <span className="display text-2xl leading-none">{r.score}</span>
                          </span>
                        </span>
                        <div>
                          <p className="font-medium text-ink">{r.label}</p>
                          <span className={cn("mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", BANDS[r.band].tone)}>{BANDS[r.band].label}</span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted">#{i + 1} · {r.type === "national" ? "National" : r.type === "public" ? "Public" : "Private"} · {r.city}{r.region ? ` · ${regionLabel(r.region)}` : ""}</p>
                        <h4 className="mt-1 text-[1.2rem] font-semibold leading-snug text-ink">
                          <Link href={`/universities/${r.slug}`} className="hover:text-accent-deep">{r.name}</Link>
                        </h4>
                        {r.tags.length > 0 && (
                          <p className="mt-2 flex flex-wrap gap-1.5">
                            {r.tags.filter((t) => t !== "women").map((t) => <span key={t} className="rounded-full bg-paper-2 px-2 py-0.5 text-[0.7rem] text-ink-2">{TAG_LABELS[t as UniversityTag] ?? t}</span>)}
                          </p>
                        )}
                        <div className="mt-3 grid gap-4 lg:grid-cols-2">
                          <ul className="space-y-1.5 text-sm text-ink-2">
                            {r.reasons.map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-moss" /> {x}</li>)}
                          </ul>
                          <ul className="space-y-1.5 text-sm text-ink-2">
                            {r.checks.map((x) => <li key={x} className="flex gap-2"><AlertCircle className="mt-0.5 size-4 shrink-0 text-[#c08a1e]" /> {x}</li>)}
                          </ul>
                        </div>
                        {r.verifiedPrograms.length > 0 && (
                          <ul className="mt-3 space-y-1 text-sm">
                            {r.verifiedPrograms.map((p) => (
                              <li key={p.name} className="flex items-center gap-2 text-ink">
                                <BadgeCheck className="size-4 text-moss" />
                                {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{p.name}</a> : p.name}
                                <span className="text-xs text-muted">· {p.language === "english" ? "English" : p.language === "mixed" ? "English & Japanese" : "Japanese"}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <details className="group mt-3">
                          <summary className="cursor-pointer list-none text-xs font-medium text-muted hover:text-ink [&::-webkit-details-marker]:hidden">Score breakdown <ChevronDown className="inline size-3.5 transition-transform group-open:rotate-180" /></summary>
                          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                            {PARTS.map((p) => (
                              <div key={p.key} className="flex items-center gap-2 text-xs text-ink-2">
                                <span className="w-28 shrink-0">{p.label}</span>
                                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-3"><span className="block h-full rounded-full bg-accent" style={{ width: `${(r.breakdown[p.key] / p.max) * 100}%` }} /></span>
                                <span className="w-10 text-right font-mono">{r.breakdown[p.key]}/{p.max}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link href={`/universities/${r.slug}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm font-medium text-ink hover:border-ink/40">View university <ArrowUpRight className="size-3.5" /></Link>
                          {r.website && <a href={r.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-2 hover:border-ink/40">Official site <ArrowUpRight className="size-3.5" /></a>}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-6 text-xs text-muted">
              How it works: field fit 30 · academic profile 25 · experience 20 · funding 15 · language 10, adjusted for your region and city preferences.
              Tags come from official lists (MEXT Top Global University and Global 30). Requirements change every year, so always confirm on the official admissions page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
