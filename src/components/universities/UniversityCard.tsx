import Link from "next/link";
import { ArrowUpRight, BadgeCheck, MapPin } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { UniversityDTO } from "@/lib/services/universities";
import { TAG_LABELS, regionLabel, type UniversityTag } from "@/lib/universities/taxonomy";

const SHOWN_TAGS: UniversityTag[] = ["sgu-a", "sgu-b", "g30", "english-ug", "grad-only", "women"];

export const typeTone = (t: string) => (t === "national" ? "bg-indigo-soft text-indigo" : t === "public" ? "bg-matcha-soft text-moss" : "bg-sakura text-accent-deep");
export const typeName = (t: string) => (t === "national" ? "National" : t === "public" ? "Public" : "Private");

export function UniversityCard({ u }: { u: UniversityDTO }) {
  const tags = SHOWN_TAGS.filter((t) => u.tags.includes(t)).slice(0, 2);
  return (
    <Link href={`/universities/${u.slug}`} className="group flex h-full flex-col rounded-xl border border-line bg-[#fffdf9] p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-[0_16px_36px_-30px_rgba(29,43,69,0.55)]">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("rounded-full px-2 py-0.5 text-[0.68rem] font-medium", typeTone(u.type))}>{typeName(u.type)}</span>
        {u.verified && <span className="inline-flex items-center gap-1 text-[0.68rem] font-medium text-moss"><BadgeCheck className="size-3.5" /> Verified</span>}
      </div>
      <h3 className="mt-2 line-clamp-2 text-[0.95rem] font-semibold leading-snug text-ink group-hover:text-accent-deep">{u.name}</h3>
      <p className="mt-1 flex items-center gap-1 truncate text-xs text-ink-2"><MapPin className="size-3.5 shrink-0 text-accent" /> <span className="truncate">{u.city}{u.region ? <span className="text-muted"> · {regionLabel(u.region)}</span> : null}</span></p>
      <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
        <span className="flex min-w-0 flex-wrap gap-1">
          {tags.map((t) => <span key={t} className="truncate rounded-full bg-paper-2 px-2 py-0.5 text-[0.62rem] text-ink-2">{TAG_LABELS[t]}</span>)}
          {u.englishPrograms > 0 && <span className="rounded-full bg-[#dde8de] px-2 py-0.5 text-[0.62rem] text-moss">{u.englishPrograms} English program{u.englishPrograms === 1 ? "" : "s"}</span>}
        </span>
        <ArrowUpRight className="size-4 shrink-0 text-ink transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
