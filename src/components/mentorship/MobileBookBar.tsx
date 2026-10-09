"use client";

import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Phones only: a bar pinned to the bottom with the price and a "Book now"
 * button that jumps to the form. Hides while the form itself is on screen.
 */
export function MobileBookBar({ price, seatsLeft, targetId = "book" }: { price: string; seatsLeft: number; targetId?: string }) {
  const [formVisible, setFormVisible] = useState(false);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setFormVisible(Boolean(e?.isIntersecting)), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl transition-transform duration-300 lg:hidden",
        formVisible ? "translate-y-full" : "translate-y-0",
      )}
      aria-hidden={formVisible}
    >
      <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
        <div className="leading-tight">
          <p className="text-lg font-semibold text-ink">{price}</p>
          <p className="text-xs text-accent-deep">{seatsLeft <= 5 ? `Only ${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left` : `${seatsLeft} seats left`}</p>
        </div>
        <a href={`#${targetId}`} tabIndex={formVisible ? -1 : 0} className="btn btn-accent !px-6 !py-3">
          Book now <ArrowDown className="size-4" />
        </a>
      </div>
    </div>
  );
}
