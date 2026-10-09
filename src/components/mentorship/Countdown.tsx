"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils/cn";

// One shared 1-second clock for every countdown on the page.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
function subscribe(cb: () => void) {
  listeners.add(cb);
  timer ??= setInterval(() => listeners.forEach((l) => l()), 1000);
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
const nowSecond = () => Math.floor(Date.now() / 1000);

/** "02d 14h 08m 31s" until the session starts. Renders nothing on the server (no hydration mismatch). */
export function Countdown({ to, tone = "light", className }: { to: string; tone?: "light" | "dark"; className?: string }) {
  const now = useSyncExternalStore(subscribe, nowSecond, () => null);
  const target = Math.floor(new Date(to).getTime() / 1000);
  if (now === null) return <span className={cn("inline-block h-12", className)} aria-hidden />;
  const left = Math.max(0, target - now);
  const parts = [
    { v: Math.floor(left / 86400), u: "days" },
    { v: Math.floor((left % 86400) / 3600), u: "hrs" },
    { v: Math.floor((left % 3600) / 60), u: "min" },
    { v: left % 60, u: "sec" },
  ];
  const dark = tone === "dark";
  return (
    <span className={cn("inline-flex items-stretch gap-1.5", className)} role="timer" aria-label={`Starts in ${parts[0]!.v} days ${parts[1]!.v} hours ${parts[2]!.v} minutes`}>
      {parts.map((p) => (
        <span key={p.u} className={cn("flex min-w-[3.1rem] flex-col items-center rounded-xl px-2 py-1.5", dark ? "bg-cream/10" : "bg-[#fffdf9] ring-1 ring-line")}>
          <span className={cn("font-mono text-xl font-semibold tabular-nums leading-tight", dark ? "text-cream" : "text-ink")}>{String(p.v).padStart(2, "0")}</span>
          <span className={cn("text-[0.6rem] uppercase tracking-wider", dark ? "text-cream-muted" : "text-muted")}>{p.u}</span>
        </span>
      ))}
    </span>
  );
}
