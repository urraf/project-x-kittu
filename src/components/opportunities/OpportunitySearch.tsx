"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { FUNDING_TYPES } from "@/lib/opportunities/constants";
import { cn } from "@/lib/utils/cn";
import type { OpportunityFacets } from "@/lib/services/opportunities";

export type SearchValues = { category: string; country: string; funding: string; deadline: string; q?: string };

/** One-tap filters: the things students actually look for. */
const QUICK: { label: string; jp: string; patch: Partial<SearchValues> }[] = [
  { label: "Internships", jp: "研修", patch: { category: "internships" } },
  { label: "Scholarships", jp: "奨学金", patch: { category: "scholarships" } },
  { label: "Fellowships", jp: "研究", patch: { category: "fellowships" } },
  { label: "Fully funded", jp: "全額", patch: { funding: "fully-funded" } },
  { label: "Closing soon", jp: "締切", patch: { deadline: "30" } },
];

const isOn = (v: SearchValues, patch: Partial<SearchValues>) => Object.entries(patch).every(([k, val]) => v[k as keyof SearchValues] === val);

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full appearance-none rounded-xl border border-line bg-paper pl-3.5 pr-9 text-sm text-ink focus:border-ink focus:outline-none">
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </label>
  );
}

/**
 * Opportunity finder: a search box, one-tap filter chips, and dropdowns for
 * category (with subcategories and live counts), country and funding.
 * Navigates to /opportunities.
 */
export function OpportunitySearch({
  initial,
  className,
  withKeyword = true,
  facets,
  filtersOpen = false,
}: {
  initial?: Partial<SearchValues>;
  className?: string;
  withKeyword?: boolean;
  /** Category tree and countries with counts (without them, the dropdowns are hidden). */
  facets?: OpportunityFacets;
  /** Show the dropdowns straight away (the finder page) instead of behind "More filters". */
  filtersOpen?: boolean;
}) {
  const router = useRouter();
  const empty: SearchValues = { category: "", country: "", funding: "", deadline: "", q: "" };
  const [v, setV] = useState<SearchValues>({ ...empty, ...initial });
  const [more, setMore] = useState(filtersOpen || Boolean(initial?.country || initial?.category || (initial?.funding && initial.funding !== "fully-funded")));

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
  const pick = (k: keyof SearchValues) => (val: string) => {
    const next = { ...v, [k]: val };
    setV(next);
    go(next);
  };
  const active = Boolean(v.category || v.country || v.funding || v.deadline || v.q);
  // Hide a quick chip if the admin deleted or renamed that category.
  const quick = QUICK.filter((q) => !q.patch.category || !facets || facets.categories.some((c) => c.slug === q.patch.category));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(v);
      }}
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
        {quick.map((q) => {
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
        {facets && !filtersOpen && (
          <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink-2 hover:text-ink">
            <SlidersHorizontal className="size-4" /> More filters <ChevronDown className={cn("size-3.5 transition-transform", more && "rotate-180")} />
          </button>
        )}
        {active && (
          <button
            type="button"
            onClick={() => {
              setV(empty);
              go(empty);
            }}
            className="ml-auto inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
          >
            <X className="size-3.5" /> Clear
          </button>
        )}
      </div>

      {facets && more && (
        <div className="mt-3 grid gap-2 border-t border-dashed border-line pt-3 sm:grid-cols-3">
          <Select label="Category" value={v.category} onChange={pick("category")}>
            <option value="">All categories</option>
            {facets.categories.map((c) => [
              <option key={c.id} value={c.slug}>{`${c.name} (${c.count})`}</option>,
              ...c.children.map((s) => <option key={s.id} value={s.slug}>{`    ${s.name} (${s.count})`}</option>),
            ])}
          </Select>
          <Select label="Country" value={v.country} onChange={pick("country")}>
            <option value="">All countries</option>
            {facets.countries.map((c) => <option key={c.name} value={c.name}>{`${c.name} (${c.count})`}</option>)}
            {v.country && !facets.countries.some((c) => c.name === v.country) && <option value={v.country}>{v.country} (0)</option>}
          </Select>
          <Select label="Funding" value={v.funding} onChange={pick("funding")}>
            <option value="">Any funding</option>
            {FUNDING_TYPES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </Select>
        </div>
      )}
    </form>
  );
}
