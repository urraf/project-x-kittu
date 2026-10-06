import Link from "next/link";
import { MapPin } from "lucide-react";
import type { MilestoneDTO } from "@/lib/types";

export function JourneyRail({ milestones }: { milestones: MilestoneDTO[] }) {
  return (
    <ol className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-pl-4 gap-6 overflow-x-auto px-4 pb-4 sm:-mx-7 sm:scroll-pl-7 sm:px-7 lg:-mx-10 lg:scroll-pl-10 lg:px-10">
      {milestones.map((m, i) => (
        <li key={m.id} className="relative w-[80vw] shrink-0 snap-start pt-10 sm:w-[21rem]" data-reveal style={{ "--reveal-delay": `${Math.min(i, 5) * 70}ms` } as React.CSSProperties}>
          <span aria-hidden className="absolute left-0 right-[-1.5rem] top-[7px] h-px bg-ink/20" />
          <span aria-hidden className="absolute left-0 top-0 size-[15px] rounded-full border-2 border-accent bg-paper-2" />
          <p className="font-mono text-[0.78rem] text-muted">{m.period}</p>
          <p className="kicker mt-4 text-accent-deep">{m.chapter || `Chapter ${String(i + 1).padStart(2, "0")}`}</p>
          <h3 className="display mt-2 text-[2rem] leading-[1.02]">
            <Link href={`/journey#${m.id}`} className="link-underline">{m.title}</Link>
          </h3>
          {m.location && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
              <MapPin className="size-3.5" /> {m.location}
            </p>
          )}
          {m.description && <p className="mt-4 line-clamp-3 text-[0.95rem] leading-relaxed text-ink-2">{m.description}</p>}
        </li>
      ))}
    </ol>
  );
}
