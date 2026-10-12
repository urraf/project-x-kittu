"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AlertCircle, ArrowUpRight, BadgeCheck, Check, ChevronDown, Globe, MapPin } from "lucide-react";
import { Kittu } from "@/components/mascot/Kittu";
import { TAG_LABELS, regionLabel, type UniversityTag } from "@/lib/universities/taxonomy";
import { cn } from "@/lib/utils/cn";

export type MatchItem = {
  id: string;
  slug: string;
  name: string;
  type: string;
  city: string;
  region: string;
  tags: string[];
  score: number;
  label: string;
  band: "reach" | "match" | "safe";
  breakdown: { field: number; academic: number; experience: number; funding: number; language: number };
  reasons: string[];
  checks: string[];
  verifiedPrograms: { name: string; degree: string; language: string; url: string }[];
  website: string;
  image?: { url: string; alt: string };
};
export type MatchResponse = { profile: { cgpaPercent: number; level: string }; considered: number; results: MatchItem[] };

/** Bands as three Japanese "tiers": 安全 safe, 適正 a good fit, 挑戦 a challenge. */
const BANDS = {
  match: { jp: "適正", label: "Good fit", blurb: "Your profile matches what they usually look for.", ring: "var(--color-indigo)", tone: "bg-indigo-soft text-indigo", tint: "bg-indigo-soft/50" },
  safe: { jp: "安全", label: "Safer choice", blurb: "Your profile is comfortably above their usual bar.", ring: "var(--color-moss)", tone: "bg-matcha-soft text-moss", tint: "bg-matcha-soft/60" },
  reach: { jp: "挑戦", label: "Reach", blurb: "Ambitious for now: worth a try alongside safer picks.", ring: "var(--color-accent)", tone: "bg-accent-soft text-accent-deep", tint: "bg-accent-soft/50" },
} as const;
const ORDER = ["match", "safe", "reach"] as const;
const KANJI_NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五"];
const REGION_ART: Record<string, string> = { "hokkaido-tohoku": "lantern", kanto: "tokyo-tower", chubu: "mount-fuji", kansai: "torii", "chugoku-shikoku": "castle", "kyushu-okinawa": "cherry-blossom" };
const PARTS: { key: keyof MatchItem["breakdown"]; label: string; max: number }[] = [
  { key: "field", label: "Field fit", max: 30 },
  { key: "academic", label: "Academics", max: 25 },
  { key: "experience", label: "Experience", max: 20 },
  { key: "funding", label: "Funding", max: 15 },
  { key: "language", label: "Language", max: 10 },
];
const typeName = (t: string) => (t === "national" ? "National" : t === "public" ? "Public" : "Private");

/** Score as a hanko-style seal: a ring that fills with the band colour. */
function ScoreSeal({ score, band, className }: { score: number; band: MatchItem["band"]; className?: string }) {
  return (
    <span className={cn("grid size-16 place-items-center rounded-full bg-[#fffdf9] p-1 shadow-[0_10px_24px_-12px_rgba(29,43,69,0.6)]", className)} style={{ background: `conic-gradient(${BANDS[band].ring} ${score * 3.6}deg, var(--color-paper-3) 0)` }}>
      <span className="grid size-full place-items-center rounded-full bg-[#fffdf9] text-center leading-none">
        <span>
          <span className="display block text-[1.45rem] text-ink">{score}</span>
          <span className="jp block text-[0.55rem] text-muted">相性</span>
        </span>
      </span>
    </span>
  );
}

function ResultCard({ r, rank }: { r: MatchItem; rank: number }) {
  const [open, setOpen] = useState(false);
  const b = BANDS[r.band];
  const tags = r.tags.filter((t) => t !== "women" && t in TAG_LABELS).slice(0, 2);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-[#fffdf9] shadow-[0_20px_44px_-36px_rgba(29,43,69,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_50px_-34px_rgba(29,43,69,0.6)]">
      <div className="relative">
      <div className={cn("img-zoom relative aspect-[16/7] overflow-hidden", !r.image && b.tint)}>
        {r.image ? (
          <Image src={r.image.url} alt={r.image.alt} fill sizes="(min-width: 1024px) 28rem, 100vw" className="object-cover" />
        ) : (
          <>
            <span aria-hidden className="seigaiha absolute inset-0" />
            <Image src={`/images/3d/${REGION_ART[r.region] ?? "torii"}.webp`} alt="" width={96} height={96} className="absolute bottom-2 right-24 size-16 drop-shadow-md" />
          </>
        )}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink/55 to-transparent" />
        {/* Rank as a vermilion seal with a kanji numeral */}
        <span className="hanko absolute left-3 top-3 size-11 -rotate-3 bg-[#fffdf9] text-[0.8rem] font-semibold shadow-sm" title={`Rank ${rank}`}>{KANJI_NUM[rank - 1] ?? rank}</span>
        <span className={cn("absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm", b.tone)}>
          <span className="jp">{b.jp}</span> {b.label}
        </span>
        <p className="absolute bottom-2.5 left-3 right-24 flex items-center gap-1 truncate text-xs text-white/95"><MapPin className="size-3.5 shrink-0" /> {r.city}{r.region ? ` · ${regionLabel(r.region)}` : ""}</p>
      </div>
        <ScoreSeal score={r.score} band={r.band} className="absolute -bottom-7 right-4 z-10" />
      </div>

      <div className="flex flex-1 flex-col p-4 pt-3">
        <p className="pr-20 text-xs text-muted">{typeName(r.type)} · <span className="font-medium text-ink-2">{r.label}</span></p>
        <h4 className="mt-1 pr-16 text-[1.08rem] font-semibold leading-snug text-ink">
          <Link href={`/universities/${r.slug}`} className="hover:text-accent-deep">{r.name}</Link>
        </h4>
        {tags.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-1.5">{tags.map((t) => <span key={t} className="rounded-full bg-paper-2 px-2 py-0.5 text-[0.68rem] text-ink-2">{TAG_LABELS[t as UniversityTag]}</span>)}</p>
        )}

        <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
          {r.reasons.slice(0, 2).map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-moss" /> {x}</li>)}
        </ul>
        {r.verifiedPrograms.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {r.verifiedPrograms.slice(0, 2).map((p) => (
              <li key={p.name} className="flex items-center gap-1.5 text-ink"><BadgeCheck className="size-4 shrink-0 text-moss" /> {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="truncate underline-offset-2 hover:underline">{p.name}</a> : <span className="truncate">{p.name}</span>}</li>
            ))}
          </ul>
        )}

        {/* Score breakdown as five thin bars, always visible */}
        <div className="mt-3 grid grid-cols-5 gap-1.5" aria-label="Score breakdown">
          {PARTS.map((p) => (
            <div key={p.key} title={`${p.label}: ${r.breakdown[p.key]}/${p.max}`}>
              <span className="block h-1.5 overflow-hidden rounded-full bg-paper-3"><span className="block h-full rounded-full" style={{ width: `${(r.breakdown[p.key] / p.max) * 100}%`, background: b.ring }} /></span>
              <span className="mt-1 block truncate text-[0.62rem] text-muted">{p.label}</span>
            </div>
          ))}
        </div>

        {r.checks.length > 0 && (
          <div className="mt-3 rounded-xl border border-[#ead9b8] bg-[#fbf3e2]">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-[#7a5410]">
              <span className="inline-flex items-center gap-1.5"><AlertCircle className="size-3.5" /> {r.checks.length} thing{r.checks.length === 1 ? "" : "s"} to check before applying</span>
              <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
            </button>
            {open && <ul className="space-y-1.5 px-3 pb-3 text-[0.8rem] leading-relaxed text-ink-2">{r.checks.map((x) => <li key={x} className="flex gap-2"><span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-[#c08a1e]" /> {x}</li>)}</ul>}
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Link href={`/universities/${r.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-sm font-medium text-cream transition-colors hover:bg-accent">View university <ArrowUpRight className="size-3.5" /></Link>
          {r.website && <a href={r.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-2 hover:border-ink/40"><Globe className="size-3.5" /> Official site</a>}
        </div>
      </div>
    </article>
  );
}

export function MatchResults({ data }: { data: MatchResponse }) {
  const ranks = new Map(data.results.map((r, i) => [r.id, i + 1]));
  const counts = { match: 0, safe: 0, reach: 0 } as Record<MatchItem["band"], number>;
  for (const r of data.results) counts[r.band]++;
  const [filter, setFilter] = useState<"all" | MatchItem["band"]>("all");
  const groups = ORDER.filter((band) => counts[band] && (filter === "all" || filter === band));

  return (
    <div className="mt-10">
      {/* Summary banner: Kittu + the shortlist at a glance */}
      <div className="seigaiha relative overflow-hidden rounded-[2rem] border border-line bg-[#f8eed6]/80 p-5 sm:p-7">
        <span aria-hidden className="absolute -right-16 -top-20 size-64 rounded-full bg-accent/85" />
        <div className="relative grid items-center gap-6 md:grid-cols-[auto_1fr_auto]">
          <Kittu pose="cheer" alt="" sizes="8rem" className="mx-auto w-24 md:w-28" />
          <div>
            <p className="jp text-sm text-accent">あなたの大学リスト</p>
            <h3 className="display mt-1 text-3xl md:text-4xl">Your <em className="text-accent">shortlist</em></h3>
            <p className="mt-1 text-sm text-ink-2">
              Academic profile <strong className="text-ink">{data.profile.level}</strong> ({data.profile.cgpaPercent}%) · {data.results.length} universities picked from {data.considered}
            </p>
          </div>
          <div className="relative grid grid-cols-3 gap-2">
            {ORDER.map((band) => (
              <div key={band} className="rounded-2xl border border-line bg-[#fffdf9]/95 px-3 py-2 text-center shadow-sm">
                <span className="jp block text-xs" style={{ color: BANDS[band].ring }}>{BANDS[band].jp}</span>
                <span className="display block text-2xl leading-none text-ink">{counts[band]}</span>
                <span className="block text-[0.65rem] text-muted">{BANDS[band].label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div role="tablist" aria-label="Filter shortlist" className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {(["all", ...ORDER] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            disabled={f !== "all" && !counts[f]}
            onClick={() => setFilter(f)}
            className={cn("shrink-0 rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40", filter === f ? "border-ink bg-ink text-cream" : "border-line bg-[#fffdf9] text-ink hover:border-ink/40")}
          >
            {f === "all" ? `All ${data.results.length}` : <><span className="jp mr-1">{BANDS[f].jp}</span>{BANDS[f].label} {counts[f]}</>}
          </button>
        ))}
      </div>

      {data.results.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center text-ink-2">No universities matched. Try &ldquo;Anywhere in Japan&rdquo; or a broader field.</p>
      ) : (
        groups.map((band) => (
          <section key={band} className="mt-8" aria-label={BANDS[band].label}>
            <div className="mb-4 flex items-center gap-3">
              <span aria-hidden className="hanko size-10 -rotate-3 text-[0.75rem]"><span className="[writing-mode:vertical-rl]">{BANDS[band].jp}</span></span>
              <div>
                <h4 className="font-semibold text-ink">{BANDS[band].label} <span className="font-normal text-muted">· {counts[band]}</span></h4>
                <p className="text-xs text-muted">{BANDS[band].blurb}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {data.results.filter((r) => r.band === band).map((r) => <ResultCard key={r.id} r={r} rank={ranks.get(r.id)!} />)}
            </div>
          </section>
        ))
      )}

      <p className="mt-8 text-xs text-muted">
        How it works: field fit 30 · academics 25 · experience 20 · funding 15 · language 10, adjusted for your region and city. Tags come from official MEXT lists (Top Global University, Global 30). The score shows fit, not a chance of admission; always confirm requirements on the official admissions page.
      </p>
    </div>
  );
}
