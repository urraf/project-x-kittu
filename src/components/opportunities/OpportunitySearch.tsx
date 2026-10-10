"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, RotateCcw, Search } from "lucide-react";
import { COUNTRIES, DEADLINE_FILTERS, FUNDING_TYPES, OPPORTUNITY_TYPES } from "@/lib/opportunities/constants";
import { cn } from "@/lib/utils/cn";

export type SearchValues = { type: string; country: string; funding: string; deadline: string; q?: string };

function Select({ id, label, value, onChange, children }: { id: string; label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="block min-w-0">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
      <span className="relative block">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full appearance-none truncate rounded-xl border border-line bg-[#fffdf9] pl-3.5 pr-9 text-[0.95rem] text-ink transition-colors hover:border-ink/30 focus:border-ink focus:outline-none"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      </span>
    </label>
  );
}

/**
 * The opportunity finder bar (type · country · funding · deadline), in the spirit
 * of Opportunity Circle. Navigates to /opportunities with the filters in the URL.
 */
export function OpportunitySearch({ initial, className, compact = false, withKeyword = false }: { initial?: Partial<SearchValues>; className?: string; compact?: boolean; withKeyword?: boolean }) {
  const router = useRouter();
  const empty: SearchValues = { type: "", country: "", funding: "", deadline: "", q: "" };
  const [v, setV] = useState<SearchValues>({ ...empty, ...initial });
  const set = (k: keyof SearchValues) => (val: string) => setV((x) => ({ ...x, [k]: val }));

  function explore(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    for (const [k, val] of Object.entries(v)) if (val) params.set(k, val);
    router.push(`/opportunities${params.size ? `?${params}` : ""}#results`);
  }

  return (
    <form
      onSubmit={explore}
      role="search"
      aria-label="Find opportunities"
      className={cn("rounded-3xl border border-line bg-paper-2/80 p-4 shadow-[0_24px_60px_-45px_rgba(29,43,69,0.6)] backdrop-blur md:p-5", className)}
    >
      {withKeyword && (
        <label className="relative mb-3 block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={v.q ?? ""}
            onChange={(e) => set("q")(e.target.value)}
            placeholder="Search by name, organisation or field (e.g. MEXT, OIST, robotics)"
            aria-label="Keyword"
            className="h-12 w-full rounded-xl border border-line bg-[#fffdf9] pl-11 pr-4 text-[0.95rem] text-ink placeholder:text-muted hover:border-ink/30 focus:border-ink focus:outline-none"
            maxLength={100}
          />
        </label>
      )}
      <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", compact ? "lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto]" : "lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto]")}>
        <Select id="op-type" label="Opportunities" value={v.type} onChange={set("type")}>
          <option value="">All opportunities</option>
          {OPPORTUNITY_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </Select>
        <Select id="op-country" label="Region / country" value={v.country} onChange={set("country")}>
          <option value="">Any country</option>
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select id="op-funding" label="Funding type" value={v.funding} onChange={set("funding")}>
          <option value="">Any funding type</option>
          {FUNDING_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </Select>
        <Select id="op-deadline" label="Deadline" value={v.deadline} onChange={set("deadline")}>
          <option value="">Any deadline</option>
          {DEADLINE_FILTERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </Select>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
          <button type="submit" className="btn btn-accent h-12 flex-1 !rounded-xl !px-6 lg:flex-none">
            <Search className="size-4" /> Explore
          </button>
          <button type="button" onClick={() => setV(empty)} aria-label="Reset filters" title="Reset" className="grid size-12 shrink-0 place-items-center rounded-xl border border-line bg-[#fffdf9] text-muted transition-colors hover:text-ink">
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>
    </form>
  );
}
