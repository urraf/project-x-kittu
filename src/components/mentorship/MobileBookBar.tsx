"use client";

import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Phones and tablets: a bar pinned to the bottom with the price and a "Book
 * now" (or "Buy now") button that scrolls to the checkout. It hides while the
 * checkout itself is on screen, and while it shows it tells the page
 * (body[data-bookbar]) so the Kittu chat button moves above it.
 */
export function MobileBookBar({
  price,
  seatsLeft,
  targetId = "book",
  cta = "Book now",
  note,
}: {
  price: string;
  seatsLeft?: number;
  targetId?: string;
  cta?: string;
  /** Small line under the price; defaults to the seats left. */
  note?: string;
}) {
  const [formVisible, setFormVisible] = useState(false);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setFormVisible(Boolean(e?.isIntersecting)), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);
  useEffect(() => {
    if (formVisible) delete document.body.dataset.bookbar;
    else document.body.dataset.bookbar = "on";
    return () => {
      delete document.body.dataset.bookbar;
    };
  }, [formVisible]);

  const line = note ?? (seatsLeft === undefined ? "" : seatsLeft <= 5 ? `Only ${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left` : `${seatsLeft} seats left`);
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_-20px_rgba(29,43,69,0.35)] backdrop-blur-xl transition-transform duration-300 lg:hidden",
        formVisible ? "translate-y-full" : "translate-y-0",
      )}
      aria-hidden={formVisible}
    >
      <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
        <div className="min-w-0 leading-tight">
          <p className="text-lg font-semibold text-ink">{price}</p>
          {line && <p className="truncate text-xs text-accent-deep">{line}</p>}
        </div>
        <a
          href={`#${targetId}`}
          tabIndex={formVisible ? -1 : 0}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="btn btn-accent shrink-0 !px-7 !py-3.5 text-base"
        >
          {cta} <ArrowDown className="size-4" />
        </a>
      </div>
    </div>
  );
}
