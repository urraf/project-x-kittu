import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const ROUTES = [
  {
    id: "japan",
    name: "Japan",
    glyph: "日本",
    text: "MEXT, METI, OIST, university scholarships and corporate internships, plus what life there actually feels like.",
    className: "bg-night text-cream",
    sun: "bg-accent",
  },
  {
    id: "korea",
    name: "Korea",
    glyph: "한국",
    text: "GKS, KAIST, GIST and the scholarships that look beyond a perfect CGPA.",
    className: "bg-indigo text-cream",
    sun: "bg-[#c9473a]",
  },
  {
    id: "europe",
    name: "Europe",
    glyph: "Europa",
    text: "Max Planck, CERN, EPFL, ETH Zurich, ISTA and fully funded government programmes.",
    className: "bg-moss text-cream",
    sun: "bg-[#d9a441]",
  },
  {
    id: "career",
    name: "Career",
    glyph: "キャリア",
    text: "Placements, first jobs and building a profile that keeps opening doors.",
    className: "bg-paper-3 text-ink",
    sun: "bg-accent",
  },
];

export function Routes({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ROUTES.map((r, i) => (
        <Link
          key={r.id}
          href={`/videos?series=${r.id}`}
          className={cn("group relative flex min-h-[19rem] flex-col overflow-hidden sm:min-h-[24rem] rounded-2xl p-7 transition-transform duration-700 ease-[var(--ease-out-expo)] hover:-translate-y-1.5", r.className)}
          data-reveal
          style={{ "--reveal-delay": `${i * 80}ms` } as React.CSSProperties}
        >
          <span aria-hidden className={cn("absolute -right-16 -top-20 size-40 rounded-full opacity-95 transition-transform duration-1000 ease-[var(--ease-out-expo)] group-hover:translate-y-3 group-hover:scale-105", r.sun)} />
          <span className="kicker relative opacity-70">
            Route 0{i + 1}
            {counts[r.id] ? ` · ${counts[r.id]} videos` : ""}
          </span>
          <span aria-hidden className={cn("relative mt-auto flex h-24 items-end pb-6 leading-none opacity-90", r.glyph === "Europa" ? "display text-[3.6rem] italic" : "font-jp text-5xl")}>
            {r.glyph}
          </span>
          <div className="relative">
            <h3 className="display flex items-center justify-between text-4xl">
              {r.name}
              <ArrowUpRight className="size-6 transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1" />
            </h3>
            <p className="mt-3 text-[0.92rem] leading-relaxed opacity-75">{r.text}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
