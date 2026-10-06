"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function TagInput({ value, onChange, max = 15, suggestions = [] }: { value: string[]; onChange: (v: string[]) => void; max?: number; suggestions?: string[] }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const tags = raw.split(",").map((t) => t.trim().toLowerCase().replace(/^#/, "")).filter((t) => t && t.length <= 40);
    const next = [...new Set([...value, ...tags])].slice(0, max);
    onChange(next);
    setDraft("");
  };
  const unused = suggestions.filter((s) => !value.includes(s)).slice(0, 6);
  return (
    <div>
      <div className="field flex min-h-11 flex-wrap items-center gap-1.5 !p-1.5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-paper-2 py-1 pl-2.5 pr-1 text-[0.8rem] text-ink">
            #{t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="grid size-5 place-items-center rounded-full hover:bg-paper-3">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (draft.trim()) add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={value.length ? "" : "Type a tag and press Enter"}
          className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-sm outline-none"
          disabled={value.length >= max}
        />
      </div>
      {unused.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {unused.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-[0.75rem] text-muted hover:border-ink/40 hover:text-ink">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
