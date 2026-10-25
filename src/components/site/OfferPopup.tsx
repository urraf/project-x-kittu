"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { Kittu } from "@/components/mascot/Kittu";
import type { PopupContent } from "@/lib/services/popup";
import { cn } from "@/lib/utils/cn";

const SEEN_KEY = "kk_popup_seen";
/** No popup where it would interrupt: accounts, checkout pages, feedback and policy pages. */
const QUIET = [/^\/account/, /^\/feedback/, /^\/sessions\/[^/]+/, /^\/store\/[^/]+/, /^\/(privacy|terms|session-terms|product-terms|refund-policy|shipping-policy)$/];

function startsIn(iso: string) {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  return days <= 0 ? "Starts today" : days === 1 ? "Starts tomorrow" : `Starts in ${days} days`;
}

/**
 * Welcome popup, shown once per visit a few seconds after arriving. Promotes
 * the next live session (or a guide) by default; editable in Studio → Settings → Popup.
 */
export function OfferPopup() {
  const pathname = usePathname();
  const [data, setData] = useState<PopupContent | null>(null);
  const [visible, setVisible] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (QUIET.some((re) => re.test(pathname))) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
    } catch {
      return; // storage blocked: skip rather than show on every page
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    fetch("/api/popup")
      .then((r) => r.json())
      .then((j: { data?: PopupContent | null }) => {
        const d = j?.data;
        if (cancelled || !d || pathname === d.href.split(/[?#]/)[0]) return;
        timer = setTimeout(() => {
          try {
            sessionStorage.setItem(SEEN_KEY, "1");
          } catch {}
          setData(d);
          requestAnimationFrame(() => setVisible(true));
        }, d.delaySec * 1000);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pathname]);

  useEffect(() => {
    if (!visible) return;
    dialog.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  function close() {
    setVisible(false);
    setTimeout(() => setData(null), 250);
  }

  if (!data) return null;
  return (
    <div
      className={cn("fixed inset-0 z-[80] flex items-end justify-center bg-ink/45 backdrop-blur-[2px] transition-opacity duration-300 sm:items-center sm:p-6", visible ? "opacity-100" : "opacity-0")}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-title"
        className={cn(
          "relative w-full overflow-hidden rounded-t-[28px] outline-none border border-line bg-[#fffdf9] shadow-[0_30px_80px_-30px_rgba(29,43,69,0.6)] transition-all duration-300 ease-[var(--ease-out-expo)] sm:max-w-md sm:rounded-[28px]",
          visible ? "translate-y-0 sm:scale-100" : "translate-y-8 sm:translate-y-3 sm:scale-95",
        )}
      >
        {/* Artwork band: paper waves, rising sun and a cheering Kittu */}
        <div className="seigaiha relative h-36 overflow-hidden border-b border-line bg-paper-2">
          <div aria-hidden className="absolute -right-10 -top-12 size-44 rounded-full bg-accent/90" />
          <Kittu pose="cheer" alt="" sizes="9rem" className="absolute -bottom-3 right-6 w-32 drop-shadow-[0_10px_14px_rgba(29,43,69,0.25)]" />
          <span className="absolute left-5 top-5 grid size-12 place-items-center rounded-[10px] border-2 border-accent bg-[#fffdf9]/90 text-center font-[family-name:var(--font-jp)] text-[0.95rem] leading-[1.05] text-accent" aria-hidden>
            特<br />典
          </span>
          {data.badge && (
            <span className="absolute bottom-4 left-5 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white shadow-sm">{data.badge}</span>
          )}
        </div>
        <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-[#fffdf9]/90 text-ink shadow-sm hover:bg-white">
          <X className="size-4" />
        </button>

        <div className="p-6 pb-7">
          {data.startsAt && <p className="kicker text-accent-deep">{startsIn(data.startsAt)}</p>}
          <h2 id="offer-title" className="display mt-1.5 text-[1.9rem] leading-[1.08] text-ink">{data.title}</h2>
          {data.text && <p className="mt-2.5 line-clamp-3 text-[0.95rem] leading-relaxed text-ink-2">{data.text}</p>}
          {data.facts.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {data.facts.map((f) => <li key={f} className="rounded-full border border-line bg-paper-2/70 px-3 py-1 text-xs font-medium text-ink-2">{f}</li>)}
            </ul>
          )}
          <Link href={data.href} onClick={close} className="btn btn-accent mt-6 w-full !py-3.5 text-base">
            {data.ctaLabel} <ArrowRight className="size-4" />
          </Link>
          <button type="button" onClick={close} className="mt-3 w-full text-center text-sm text-muted hover:text-ink">Maybe later</button>
        </div>
      </div>
    </div>
  );
}
