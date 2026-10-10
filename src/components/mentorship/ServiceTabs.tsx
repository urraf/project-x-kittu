"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

type Item = { id: string; kind: string; node: React.ReactNode };

/** Filter chips (All / Live sessions / Study material) over a two-column grid of service cards. */
export function ServiceTabs({ tabs, items, empty }: { tabs: { id: string; label: string }[]; items: Item[]; empty: React.ReactNode }) {
  const [tab, setTab] = useState("all");
  const counts = Object.fromEntries(tabs.map((t) => [t.id, t.id === "all" ? items.length : items.filter((i) => i.kind === t.id).length]));
  const shown = tab === "all" ? items : items.filter((i) => i.kind === tab);
  return (
    <div>
      <div role="tablist" aria-label="Filter" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {tabs.filter((t) => t.id === "all" || counts[t.id]).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "border-ink bg-ink text-cream" : "border-line bg-[#fffdf9] text-ink hover:border-ink/40",
            )}
          >
            {t.label} <span className={cn("ml-1 text-xs", tab === t.id ? "text-cream/70" : "text-muted")}>{counts[t.id]}</span>
          </button>
        ))}
      </div>
      {shown.length ? (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {shown.map((i) => <div key={i.id}>{i.node}</div>)}
        </div>
      ) : (
        <div className="mt-5">{empty}</div>
      )}
    </div>
  );
}
