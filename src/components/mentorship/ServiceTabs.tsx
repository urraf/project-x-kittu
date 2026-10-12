"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

type Group = { id: string; label: string; jp: string; gridClassName: string; items: { id: string; node: React.ReactNode }[] };

/**
 * Filter chips over the storefront. "All" shows each kind as its own titled
 * group (live sessions, then study material); a tab shows just that kind.
 */
export function ServiceTabs({ groups, empty }: { groups: Group[]; empty: React.ReactNode }) {
  const [tab, setTab] = useState("all");
  const visible = groups.filter((g) => g.items.length);
  const total = visible.reduce((n, g) => n + g.items.length, 0);
  const shown = tab === "all" ? visible : visible.filter((g) => g.id === tab);
  const tabs = [{ id: "all", label: "All", count: total }, ...visible.map((g) => ({ id: g.id, label: g.label, count: g.items.length }))];

  return (
    <div>
      <div role="tablist" aria-label="Filter" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {tabs.map((t) => (
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
            {t.label} <span className={cn("ml-1 text-xs", tab === t.id ? "text-cream/70" : "text-muted")}>{t.count}</span>
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="mt-5">{empty}</div>
      ) : (
        shown.map((g) => (
          <section key={g.id} className="mt-7" aria-label={g.label}>
            {tab === "all" && (
              <h3 className="mb-4 flex items-center gap-2.5 font-medium text-ink">
                <span aria-hidden className="hanko size-8 -rotate-3 text-[0.62rem]"><span className="[writing-mode:vertical-rl]">{g.jp}</span></span>
                {g.label}
                <span className="text-sm font-normal text-muted">{g.items.length}</span>
              </h3>
            )}
            <div className={g.gridClassName}>
              {g.items.map((i) => <div key={i.id}>{i.node}</div>)}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
