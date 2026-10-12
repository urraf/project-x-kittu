import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BadgeCheck, Globe, MapPin, Search } from "lucide-react";
import { typeName, typeTone } from "@/components/universities/UniversityCard";
import { TAG_LABELS, fieldLabel, regionLabel, type UniversityTag } from "@/lib/universities/taxonomy";
import { safe } from "@/lib/safe";
import { DEGREES, getPublicUniversity } from "@/lib/services/universities";
import { absoluteUrl } from "@/lib/site";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const degreeLabel = (d: string) => DEGREES.find((x) => x.id === d)?.label ?? d;
const langLabel = { english: "English", mixed: "English + Japanese", japanese: "Japanese" } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const u = await safe("university.meta", async () => getPublicUniversity((await params).slug), null);
  if (!u) return { title: "University not found", robots: { index: false } };
  return {
    title: u.name,
    description: u.summary || `${u.name} (${typeName(u.type)} university in ${u.city}): programs for international students, official links and scholarships.`,
    alternates: { canonical: `/universities/${u.slug}` },
    openGraph: { title: u.name, url: absoluteUrl(`/universities/${u.slug}`) },
  };
}

export default async function UniversityPage({ params }: Props) {
  const { slug } = await params;
  const u = await safe("university.detail", () => getPublicUniversity(slug), null);
  if (!u) notFound();

  return (
    <div className="container-x grid grid-cols-1 gap-12 pb-20 pt-28 md:pt-32 lg:grid-cols-12 lg:gap-14">
      <article className="min-w-0 lg:col-span-8">
        <Link href="/universities" className="group inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /> All universities
        </Link>
        {u.coverImage && (
          <figure className="mt-6">
            <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-line bg-paper-3">
              <Image src={u.coverImage.url} alt={u.coverImage.alt || u.name} fill priority sizes="(min-width: 1024px) 50rem, 100vw" className="object-cover" />
            </div>
            {u.coverImage.credit?.name && (
              <figcaption className="mt-2 text-right text-xs text-muted">
                Photo:{" "}
                {u.coverImage.credit.url ? <a href={u.coverImage.credit.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{u.coverImage.credit.name}</a> : u.coverImage.credit.name}
              </figcaption>
            )}
          </figure>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-3 py-1 text-xs font-medium", typeTone(u.type))}>{typeName(u.type)} university</span>
          {u.verified && <span className="inline-flex items-center gap-1 rounded-full bg-[#dde8de] px-3 py-1 text-xs font-medium text-moss"><BadgeCheck className="size-3.5" /> Programs verified</span>}
        </div>
        <h1 className="display mt-4 text-[2.4rem] leading-[1.03] md:text-[3.3rem]">{u.name}</h1>
        {u.nameJa && <p className="jp mt-2 text-xl text-muted">{u.nameJa}</p>}
        <p className="mt-3 flex items-center gap-1.5 text-ink-2"><MapPin className="size-4 text-accent" /> {[u.city, u.prefecture && u.prefecture !== u.city ? `${u.prefecture} Prefecture` : "", "Japan"].filter(Boolean).join(", ")}{u.region && <span className="text-muted"> · {regionLabel(u.region)}</span>}</p>
        {u.tags.filter((t) => t in TAG_LABELS).length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {u.tags.filter((t) => t in TAG_LABELS).map((t) => <li key={t} className="rounded-full bg-indigo-soft px-3 py-1 text-xs font-medium text-indigo">{TAG_LABELS[t as UniversityTag]}</li>)}
          </ul>
        )}
        {u.fields.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Main fields</p>
            <ul className="mt-2 flex flex-wrap gap-2">{u.fields.map((f) => <li key={f} className="rounded-full border border-line bg-[#fffdf9] px-3 py-1 text-sm text-ink-2">{fieldLabel(f)}</li>)}</ul>
          </div>
        )}
        {u.summary && <p className="mt-5 text-lg leading-relaxed text-ink-2">{u.summary}</p>}
        {u.strengths.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">{u.strengths.map((s) => <li key={s} className="chip">{s}</li>)}</ul>
        )}

        <section className="mt-10">
          <h2 className="display text-3xl">Programs for <em className="text-accent">international students</em></h2>
          {u.programs.length ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-[#fffdf9]">
              <ul className="divide-y divide-line">
                {u.programs.map((p) => (
                  <li key={p.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{p.name}</p>
                      <p className="mt-1 text-sm text-ink-2">{[degreeLabel(p.degree), p.field, p.intake && `Intake: ${p.intake}`].filter(Boolean).join(" · ")}</p>
                      {p.notes && <p className="mt-1.5 text-sm text-muted">{p.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", p.language === "english" ? "bg-[#dde8de] text-moss" : "bg-paper-2 text-ink-2")}>{langLabel[p.language]}</span>
                      {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-sm font-medium text-accent-deep hover:underline">Official page <ArrowUpRight className="size-3.5" /></a>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-line p-6">
              <p className="font-medium text-ink">Program details are being verified.</p>
              <p className="mt-1 text-sm text-ink-2">Until then, check English-taught programs directly on official sources:</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {u.website && <a href={u.website} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-ghost !py-2.5 text-ink"><Globe className="size-4" /> {u.name.replace(/\s*\(.*\)$/, "")} website</a>}
                <a href="https://www.studyinjapan.go.jp/en/" target="_blank" rel="noopener noreferrer" className="btn btn-ghost !py-2.5 text-ink"><Search className="size-4" /> Study in Japan program search</a>
              </div>
            </div>
          )}
        </section>

        {u.scholarships && (
          <section className="mt-10">
            <h2 className="display text-3xl">Scholarships &amp; <em className="text-accent">funding</em></h2>
            <div className="mt-4 space-y-3 font-[family-name:var(--font-prose)] text-[1.08rem] leading-relaxed text-ink-2">
              {u.scholarships.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
            </div>
          </section>
        )}
        <p className="mt-10 text-sm text-muted">
          {u.lastVerifiedAt ? `Program details last verified on ${new Date(u.lastVerifiedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.` : "Program details not yet verified."} Requirements change every year, so always confirm on the official site.
        </p>
      </article>

      <aside className="lg:col-span-4">
        <div className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-3xl border border-line bg-[#fffdf9] p-6 shadow-[0_24px_60px_-40px_rgba(29,43,69,0.45)]">
            <p className="kicker text-muted">Quick links</p>
            <div className="mt-4 flex flex-col gap-2">
              {u.website ? (
                <a href={u.website} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-accent w-full"><Globe className="size-4" /> Official website</a>
              ) : (
                <a href="https://www.studyinjapan.go.jp/en/" target="_blank" rel="noopener noreferrer" className="btn btn-accent w-full"><Search className="size-4" /> Study in Japan (official)</a>
              )}
              <Link href={`/opportunities?q=${encodeURIComponent(u.name.replace(/\s*\(.*\)$/, ""))}#results`} className="btn btn-ghost w-full text-ink">Related opportunities</Link>
            </div>
          </div>
          <div className="rounded-3xl border border-line bg-sakura p-6">
            <p className="display text-2xl">Not sure where to apply?</p>
            <p className="mt-1 text-sm text-ink-2">Shortlist universities, labs and scholarships with {`a live session`}.</p>
            <Link href="/sessions" className="btn btn-ink mt-4 !py-2.5">See sessions</Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
