/**
 * Branded loading state: the KittuKun sun, with a play button cut into it,
 * rising over the horizon above a YouTube-style progress bar. Pure CSS.
 */
export function BrandLoader({ label = "Loading the next chapter", tone = "dark", compact = false }: { label?: string; tone?: "dark" | "light"; compact?: boolean }) {
  const dark = tone === "dark";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-7 px-4 ${compact ? "py-24" : "min-h-[100svh]"} ${dark ? "bg-night text-cream" : "text-ink"}`}
    >
      <div className="relative h-24 w-44">
        {/* sky window: the sun rises inside it and is cut off at the horizon */}
        <div className="absolute inset-x-0 top-0 h-[4.6rem] overflow-hidden">
          <div className="kk-sun absolute left-1/2 top-2 grid size-[4.5rem] -translate-x-1/2 place-items-center rounded-full bg-accent">
            <svg viewBox="0 0 24 24" className={`ml-1 size-7 ${dark ? "fill-night" : "fill-paper"}`} aria-hidden>
              <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.2-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5Z" />
            </svg>
          </div>
        </div>
        {/* horizon lines, echoing the logo */}
        <span className={`absolute inset-x-0 top-[4.6rem] h-[2px] ${dark ? "bg-cream/70" : "bg-ink/70"}`} />
        <span className={`absolute inset-x-6 top-[5.25rem] h-px ${dark ? "bg-cream/35" : "bg-ink/30"}`} />
        <span className={`absolute inset-x-12 top-[5.75rem] h-px ${dark ? "bg-cream/20" : "bg-ink/15"}`} />
      </div>

      <div className="w-56">
        <div className={`relative h-1 rounded-full ${dark ? "bg-cream/15" : "bg-ink/10"}`}>
          <div className="kk-progress absolute inset-y-0 left-0 rounded-full bg-accent">
            <span className="absolute -right-1.5 top-1/2 size-3 -translate-y-1/2 rounded-full bg-accent shadow" />
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className={`kicker ${dark ? "text-cream-muted" : "text-muted"}`}>Life of KittuKun</p>
        <p className="display mt-2 text-2xl italic">
          {label}
          <span className="kk-dots" aria-hidden />
        </p>
      </div>
    </div>
  );
}
