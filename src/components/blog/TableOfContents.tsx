"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

type Item = { id: string; text: string; level: 2 | 3 };

/** Sticky table of contents with scroll-spy highlighting. */
export function TableOfContents({ items }: { items: Item[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const headings = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => Boolean(el));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    headings.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [items]);

  if (items.length < 2) return null;
  return (
    <nav aria-label="On this page">
      <p className="kicker text-muted">On this page</p>
      <ol className="mt-4 space-y-1 border-l border-line">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "-ml-px block border-l py-1.5 text-[0.84rem] leading-snug transition-colors",
                item.level === 3 ? "pl-7" : "pl-4",
                active === item.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
