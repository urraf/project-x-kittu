"use client";

import { useEffect } from "react";

const SELECTOR = "[data-reveal]:not([data-visible='true'])";

/**
 * Reveals elements marked with [data-reveal] as they enter the viewport.
 *
 * Mounted once for the whole site. A MutationObserver picks up content that
 * arrives after a client-side navigation (pages stream in after the URL
 * changes), so new pages never stay invisible. CSS has a failsafe too.
 */
export function RevealObserver() {
  useEffect(() => {
    const reveal = (el: Element) => ((el as HTMLElement).dataset.visible = "true");

    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(SELECTOR).forEach(reveal);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal(entry.target);
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );

    const observeWithin = (root: ParentNode) => root.querySelectorAll(SELECTOR).forEach((el) => io.observe(el));
    observeWithin(document);

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(SELECTOR)) io.observe(node);
          observeWithin(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
