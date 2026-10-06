"use client";

import { useEffect, useRef } from "react";

/** Thin progress bar showing how far through the article the reader is. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    let disposed = false;
    const update = () => {
      frame = 0;
      // Guard: the page may have navigated away between scheduling and running.
      const el = document.getElementById(targetId);
      const node = bar.current;
      if (disposed || !el || !node) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
      node.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      disposed = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [targetId]);

  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-[55] h-[3px]">
      <div ref={bar} className="h-full origin-left scale-x-0 bg-accent" />
    </div>
  );
}
