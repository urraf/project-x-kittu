import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { UniversityDTO } from "@/lib/services/universities";
import { TAG_LABELS, regionLabel, type UniversityTag } from "@/lib/universities/taxonomy";

const SHOWN_TAGS: UniversityTag[] = ["sgu-a", "sgu-b", "g30", "english-ug", "grad-only", "women"];

export const typeTone = (t: string) => (t === "national" ? "bg-indigo-soft text-indigo" : t === "public" ? "bg-matcha-soft text-moss" : "bg-sakura text-accent-deep");
export const typeName = (t: string) => (t === "national" ? "National" : t === "public" ? "Public" : "Private");
const TYPE_JP: Record<string, string> = { national: "国立", public: "公立", private: "私立" };

/** Region motif for universities without a photo: a 3D landmark on a patterned washi tint. */
const REGION_ART: Record<string, { img: string; tint: string; pattern: string }> = {
  "hokkaido-tohoku": { img: "lantern", tint: "bg-indigo-soft", pattern: "asanoha" },
  kanto: { img: "tokyo-tower", tint: "bg-accent-soft", pattern: "seigaiha" },
  chubu: { img: "mount-fuji", tint: "bg-[#e9eef5]", pattern: "seigaiha" },
  kansai: { img: "torii", tint: "bg-sakura", pattern: "shippo" },
  "chugoku-shikoku": { img: "castle", tint: "bg-matcha-soft", pattern: "asanoha" },
  "kyushu-okinawa": { img: "cherry-blossom", tint: "bg-[#f8eed6]", pattern: "shippo" },
};

export function UniversityCard({ u }: { u: UniversityDTO }) {
  const tags = SHOWN_TAGS.filter((t) => u.tags.includes(t)).slice(0, 2);
  const art = REGION_ART[u.region] ?? REGION_ART.kanto!;
  return (
    <Link href={`/universities/${u.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-[#fffdf9] transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-[0_16px_36px_-30px_rgba(29,43,69,0.55)]">
      <div className={cn("img-zoom relative aspect-[16/7] overflow-hidden", !u.coverImage && art.tint)}>
        {u.coverImage ? (
          <Image src={u.coverImage.url} alt={u.coverImage.alt || u.name} fill sizes="(min-width: 1280px) 18rem, (min-width: 640px) 45vw, 100vw" className="object-cover" />
        ) : (
          <>
            <span aria-hidden className={cn("absolute inset-0", art.pattern)} />
            <span aria-hidden className="jp absolute -bottom-2 left-3 text-[2.6rem] leading-none text-ink/10">{TYPE_JP[u.type]}</span>
            <Image src={`/images/3d/${art.img}.webp`} alt="" width={96} height={96} className="absolute bottom-1 right-4 size-14 drop-shadow-[0_8px_10px_rgba(29,43,69,0.2)] transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:scale-105" />
          </>
        )}
        <span className={cn("absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[0.68rem] font-medium shadow-sm", typeTone(u.type))}>{typeName(u.type)}</span>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 text-[0.95rem] font-semibold leading-snug text-ink group-hover:text-accent-deep">{u.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-ink-2"><MapPin className="size-3.5 shrink-0 text-accent" /> <span className="truncate">{u.city}{u.region ? <span className="text-muted"> · {regionLabel(u.region)}</span> : null}</span></p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
          <span className="flex min-w-0 flex-wrap gap-1">
            {tags.map((t) => <span key={t} className="truncate rounded-full bg-paper-2 px-2 py-0.5 text-[0.62rem] text-ink-2">{TAG_LABELS[t]}</span>)}
            {u.englishPrograms > 0 && <span className="rounded-full bg-[#dde8de] px-2 py-0.5 text-[0.62rem] text-moss">{u.englishPrograms} English program{u.englishPrograms === 1 ? "" : "s"}</span>}
          </span>
          <ArrowUpRight className="size-4 shrink-0 text-ink transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
