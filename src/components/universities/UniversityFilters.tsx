"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Globe2, X } from "lucide-react";
import { REGIONS } from "@/lib/universities/taxonomy";
import { cn } from "@/lib/utils/cn";

const TYPES = [
  { id: "national", label: "National" },
  { id: "public", label: "Public" },
  { id: "private", label: "Private" },
];

/** One tidy row of filters: type, region and English-friendly. Changes apply instantly. */
export function UniversityFilters({ total, counts }: { total: number; counts: Record<string, number> }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    next.delete("page");
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}${next.size ? `?${next}` : ""}#results`, { scroll: false });
  };
  const type = sp.get("type") ?? "";
  const region = sp.get("region") ?? "";
  const english = sp.get("english") === "1";
  const q = sp.get("q") ?? "";
  const active = Boolean(type || region || english || q);

  const select = "h-11 appearance-none rounded-xl border bg-[#fffdf9] pl-3.5 pr-9 text-sm focus:border-ink focus:outline-none";
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-paper-2/60 p-2.5">
      <label className="relative">
        <span className="sr-only">University type</span>
        <select value={type} onChange={(e) => set("type", e.target.value || null)} className={cn(select, type ? "border-ink text-ink" : "border-line text-ink-2")}>
          <option value="">All types ({total})</option>
          {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label} ({counts[t.id] ?? 0})</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      </label>
      <label className="relative">
        <span className="sr-only">Region</span>
        <select value={region} onChange={(e) => set("region", e.target.value || null)} className={cn(select, region ? "border-ink text-ink" : "border-line text-ink-2")}>
          <option value="">All of Japan</option>
          {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      </label>
      <button
        type="button"
        aria-pressed={english}
        onClick={() => set("english", english ? null : "1")}
        className={cn("inline-flex h-11 items-center gap-1.5 rounded-xl border px-3.5 text-sm transition-colors", english ? "border-accent bg-accent text-white" : "border-line bg-[#fffdf9] text-ink-2 hover:border-accent/50")}
      >
        <Globe2 className="size-4" /> English-friendly
      </button>
      {active && (
        <button type="button" onClick={() => router.push(`${pathname}#results`, { scroll: false })} className="ml-auto inline-flex h-11 items-center gap-1 px-2 text-sm text-muted hover:text-ink">
          <X className="size-4" /> Clear
        </button>
      )}
    </div>
  );
}
