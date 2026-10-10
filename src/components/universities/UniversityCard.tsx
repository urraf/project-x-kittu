import Link from "next/link";
import { ArrowUpRight, BadgeCheck, MapPin } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { UniversityDTO } from "@/lib/services/universities";

export const typeTone = (t: string) => (t === "national" ? "bg-indigo-soft text-indigo" : t === "public" ? "bg-matcha-soft text-moss" : "bg-sakura text-accent-deep");
export const typeName = (t: string) => (t === "national" ? "National" : t === "public" ? "Public" : "Private");

export function UniversityCard({ u }: { u: UniversityDTO }) {
  return (
    <Link href={`/universities/${u.slug}`} className="group flex h-full flex-col rounded-2xl border border-line bg-[#fffdf9] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-[0_20px_45px_-35px_rgba(29,43,69,0.55)]">
      <div className="flex items-start justify-between gap-3">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", typeTone(u.type))}>{typeName(u.type)}</span>
        {u.verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#dde8de] px-2.5 py-1 text-xs font-medium text-moss"><BadgeCheck className="size-3.5" /> Verified</span>
        ) : (
          <span className="rounded-full bg-paper-2 px-2.5 py-1 text-xs text-muted">Programs to verify</span>
        )}
      </div>
      <h3 className="mt-4 text-[1.08rem] font-semibold leading-snug text-ink group-hover:text-accent-deep">{u.name}</h3>
      {u.nameJa && <p className="jp mt-0.5 text-sm text-muted">{u.nameJa}</p>}
      <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-2"><MapPin className="size-4 text-accent" /> {u.city}</p>
      <div className="mt-auto flex items-center justify-between pt-4 text-sm">
        <span className="text-muted">{u.englishPrograms ? `${u.englishPrograms} English-taught program${u.englishPrograms === 1 ? "" : "s"}` : "Details"}</span>
        <ArrowUpRight className="size-4 text-ink transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
