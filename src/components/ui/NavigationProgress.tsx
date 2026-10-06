"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

/**
 * YouTube-style red progress bar shown while navigating between pages.
 * Starts on internal link clicks, completes when the route changes.
 * Drives the DOM directly (no React state) so it never causes re-renders.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const bar = useRef<HTMLDivElement>(null);
  const active = useRef(false);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback(() => {
    const el = bar.current;
    if (!el || !active.current) return;
    active.current = false;
    if (safety.current) clearTimeout(safety.current);
    el.style.transition = "transform 0.25s ease-out, opacity 0.4s ease 0.25s";
    el.style.transform = "scaleX(1)";
    el.style.opacity = "0";
  }, []);

  useEffect(() => {
    const el = bar.current;
    const start = () => {
      if (!el || active.current) return;
      active.current = true;
      el.style.transition = "none";
      el.style.opacity = "1";
      el.style.transform = "scaleX(0)";
      void el.offsetWidth; // restart the transition
      el.style.transition = "transform 8s cubic-bezier(0.1, 0.8, 0.2, 1)";
      el.style.transform = "scaleX(0.85)";
      if (safety.current) clearTimeout(safety.current);
      safety.current = setTimeout(finish, 12_000);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (url.pathname.startsWith("/api/") || /\.(xml|txt|webp|png|jpg)$/.test(url.pathname)) return;
      start();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [finish]);

  // Route changed: complete and fade out.
  useEffect(() => {
    finish();
  }, [pathname, search, finish]);


  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px]">
      <div ref={bar} className="h-full origin-left bg-accent opacity-0 shadow-[0_0_10px_rgba(217,72,43,0.7)]" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}
