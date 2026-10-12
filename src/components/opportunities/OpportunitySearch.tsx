"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { COUNTRIES, FUNDING_TYPES } from "@/lib/opportunities/constants";
import { cn } from "@/lib/utils/cn";

export type SearchValues = { type: string; country: string; funding: string; deadline: string; q?: string };

/** One-tap filters: the things students actually look for. */
const QUICK: { label: string; jp: string; patch: Partial<SearchValues> }[] = [
  { label: "Internships", jp: "研修", patch: { type: "internship" } },
  { label: "Scholarships", jp: "奨学金", patch: { type: "scholarship" } },
  { label: "Fellowships", jp: "研究", patch: { type: "fellowship" } },
  { label: "Fully funded", jp: "全額", patch: { funding: "fully-funded" } },
  { label: "Closing soon", jp: "締切", patch: { deadline: "30" } },
];

const isOn = (v: SearchValues, patch: Partial<SearchValues>) => Object.entries(patch).every(([k, val]) => v[k as keyof SearchValues] === val);

/**
 * Simple opportunity finder: a search box, one-tap filter chips, and a
 * "More filters" drawer for country and funding. Navigates to /opportunities.
 */
export function OpportunitySearch({ initial, className, withKeyword = true }: { initial?: Partial<SearchValues>; className?: string; compact?: boolean; withKeyword?: boolean }) {
  const router = useRouter();
  const empty: SearchValues = { type: "", country: "", funding: "", deadline: "", q: "" };
  const [v, setV] = useState<SearchValues>({ ...empty, ...initial });
  const [more, setMore] = useState(Boolean(initial?.country || (initial?.funding && initial.funding !== "fully-funded")));

  const go = (next: SearchValues) => {
    const params = new URLSearchParams();
    for (const [k, val] of Object.entries(next)) if (val) params.set(k, val);
    router.push(`/opportunities${params.size ? `?${params}` : ""}#results`);
  };
  const toggle = (patch: Partial<SearchValues>) => {
    const on = isOn(v, patch);
    const next = { ...v };
    for (const k of Object.keys(patch) as (keyof SearchValues)[]) next[k] = on ? "" : patch[k]!;
    setV(next);
    go(next);
  };
  const active = Boolean(v.type || v.country || v.funding || v.deadline || v.q);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); go(v); }}
      role="search"
      aria-label="Find opportunities"
      className={cn("rounded-3xl border border-line bg-[#fffdf9]/95 p-3 shadow-[0_24px_60px_-45px_rgba(29,43,69,0.6)] backdrop-blur sm:p-4", className)}
    >
      <div className="flex gap-2">
        {withKeyword ? (
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={v.q ?? ""}
              onChange={(e) => setV((x) => ({ ...x, q: e.target.value }))}
              placeholder="Search MEXT, OIST, robotics…"
              aria-label="Search opportunities"
              className="h-12 w-full rounded-2xl border border-line bg-paper pl-11 pr-4 text-[0.95rem] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
              maxLength={100}
            />
          </label>
        ) : (
          <p className="flex flex-1 items-center gap-2 px-2 text-sm text-ink-2"><Search className="size-4 text-accent" /> Pick what you&apos;re looking for:</p>
        )}
        <button type="submit" className="btn btn-accent h-12 shrink-0 !rounded-2xl !px-6">
          <Search className="size-4 sm:hidden" /><span className="max-sm:sr-only">Explore</span>
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {QUICK.map((q) => {
          const on = isOn(v, q.patch);
          return (
            <button
              key={q.label}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(q.patch)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                on ? "border-accent bg-accent text-white" : "border-line bg-paper text-ink hover:border-accent/50",
              )}
            >
              <span className={cn("jp text-[0.7rem]", on ? "text-white/80" : "text-accent")}>{q.jp}</span> {q.label}
            </button>
          );
        })}
        <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink-2 hover:text-ink">
          <SlidersHorizontal className="size-4" /> More filters <ChevronDown className={cn("size-3.5 transition-transform", more && "rotate-180")} />
        </button>
        {active && (
          <button type="button" onClick={() => { setV(empty); go(empty); }} className="ml-auto inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            <X className="size-3.5" /> Clear
          </button>
        )}
      </div>

      {more && (
        <div className="mt-3 grid gap-2 border-t border-dashed border-line pt-3 sm:grid-cols-2">
          {[
            { key: "country" as const, label: "Country", any: "Any country", options: COUNTRIES.map((c) => ({ id: c, label: c })) },
            { key: "funding" as const, label: "Funding", any: "Any funding", options: FUNDING_TYPES.map((f) => ({ id: f.id, label: f.label })) },
          ].map((f) => (
            <label key={f.key} className="relative block">
              <span className="sr-only">{f.label}</span>
              <select
                value={v[f.key]}
                onChange={(e) => { const next = { ...v, [f.key]: e.target.value }; setV(next); go(next); }}
                className="h-11 w-full appearance-none rounded-xl border border-line bg-paper pl-3.5 pr-9 text-sm text-ink focus:border-ink focus:outline-none"
              >
                <option value="">{f.any}</option>
                {f.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            </label>
          ))}
        </div>
      )}
    </form>
  );
}
