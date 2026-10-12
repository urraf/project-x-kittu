import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Globe2, Search, Sparkles } from "lucide-react";
import { UniMatch } from "@/components/universities/UniMatch";
import { UniversityCard } from "@/components/universities/UniversityCard";
import { REGIONS } from "@/lib/universities/taxonomy";
import { EmptyState } from "@/components/ui/EmptyState";
import { safe } from "@/lib/safe";
import { DEGREES, UNIVERSITY_TYPES, searchUniversities, universitySearchSchema, universityStats, type UniversitySearch } from "@/lib/services/universities";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Universities in Japan",
  description: "Japanese universities that accept international students, with English-taught programs, official links and scholarship routes.",
  alternates: { canonical: "/universities" },
  openGraph: { title: "Universities in Japan", url: absoluteUrl("/universities") },
};

function hrefWith(params: UniversitySearch, patch: Partial<Record<keyof UniversitySearch, string | undefined>>) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, page: undefined, ...patch })) if (v !== undefined && v !== "") next.set(k, String(v));
  return `/universities${next.size ? `?${next}` : ""}#results`;
}

export default async function UniversitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const params = universitySearchSchema.parse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));
  const [result, stats] = await Promise.all([
    safe("universities.search", () => searchUniversities(params), { items: [], total: 0, page: 1, pages: 1 }),
    safe("universities.stats", () => universityStats(), { total: 0, verified: 0, byType: {} as Record<string, number> }),
  ]);

  return (
    <>
      <section className="seigaiha relative overflow-hidden border-b border-line bg-paper-2">
        <div aria-hidden className="absolute -right-12 -top-10 size-40 rounded-full bg-indigo-soft md:-right-20 md:-top-24 md:size-[26rem]" />
        <div className="container-x relative pb-10 pt-28 md:pb-14 md:pt-32">
          <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> <span className="jp text-accent">大学</span> Universities in Japan</p>
          <h1 className="display mt-5 max-w-3xl text-[2.8rem] leading-[0.98] sm:text-6xl lg:text-[4.4rem]">
            Find your <em className="text-accent">university.</em>
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">
            {stats.total ? `${stats.total} universities that welcome international students` : "Universities that welcome international students"}, with English-taught programs, official links and scholarship routes.
          </p>
          <form action="/universities#results" className="mt-8 flex max-w-2xl gap-2" role="search">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input name="q" defaultValue={params.q ?? ""} placeholder="Search a university, city or subject" aria-label="Search universities" className="h-12 w-full rounded-xl border border-line bg-[#fffdf9] pl-11 pr-4 text-[0.95rem] text-ink placeholder:text-muted focus:border-ink focus:outline-none" maxLength={100} />
            </label>
            {params.type && <input type="hidden" name="type" value={params.type} />}
            <button type="submit" className="btn btn-ghost h-12 !rounded-xl !px-6 text-ink">Search</button>
          </form>
          <a href="#match" className="btn btn-accent mt-4 !px-6 !py-3"><Sparkles className="size-4" /> Get my university shortlist</a>
        </div>
      </section>

      {/* ------------------------------ JapanUniMatch ------------------------------ */}
      <section id="match" className="scroll-mt-20 border-b border-line bg-indigo-soft/40 py-14 md:py-20">
        <div className="container-x">
          <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> <span className="jp text-accent">相性</span> JapanUniMatch</p>
          <h2 className="display mt-4 max-w-3xl text-4xl md:text-5xl">Which universities <em className="text-accent">fit you?</em></h2>
          <p className="mt-3 max-w-2xl text-ink-2">Tell us about your studies and goals. We rank {stats.total || "200+"} universities by field, academic profile, experience, funding and language, and explain every match.</p>
          <div className="mt-6"><UniMatch /></div>
        </div>
      </section>

      <section id="results" className="scroll-mt-20 py-12 md:py-16">
        <div className="container-x">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={hrefWith(params, { type: undefined })} className="chip" data-active={!params.type}>All <span className="font-mono text-[0.68rem] opacity-60">{stats.total}</span></Link>
              {UNIVERSITY_TYPES.map((t) => (
                <Link key={t.id} href={hrefWith(params, { type: t.id })} className="chip" data-active={params.type === t.id}>
                  {t.label} <span className="font-mono text-[0.68rem] opacity-60">{stats.byType[t.id] ?? 0}</span>
                </Link>
              ))}
              <Link href={hrefWith(params, { verified: params.verified ? undefined : "1" })} className="chip" data-active={Boolean(params.verified)}>
                <BadgeCheck className="size-3.5" /> Verified programs only <span className="font-mono text-[0.68rem] opacity-60">{stats.verified}</span>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Link href={hrefWith(params, { english: params.english ? undefined : "1" })} className="chip" data-active={Boolean(params.english)}><Globe2 className="size-3.5" /> English-friendly</Link>
              <span className="text-muted">Degree:</span>
              <Link href={hrefWith(params, { degree: undefined })} className="chip" data-active={!params.degree}>Any</Link>
              {DEGREES.slice(0, 4).map((d) => <Link key={d.id} href={hrefWith(params, { degree: d.id })} className="chip" data-active={params.degree === d.id}>{d.label}</Link>)}
            </div>
          </div>
          <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 text-sm sm:mx-0 sm:flex-wrap sm:px-0">
            <span className="shrink-0 self-center text-muted">Region:</span>
            <Link href={hrefWith(params, { region: undefined })} className="chip shrink-0" data-active={!params.region}>All of Japan</Link>
            {REGIONS.map((r) => <Link key={r.id} href={hrefWith(params, { region: r.id })} className="chip shrink-0" data-active={params.region === r.id}>{r.label}</Link>)}
          </div>
          <p className="mt-6 text-sm text-muted">{result.total} {result.total === 1 ? "university" : "universities"}{params.q ? ` matching “${params.q}”` : ""}</p>
          <div className="mt-4">
            {result.items.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {result.items.map((u) => <UniversityCard key={u.id} u={u} />)}
              </div>
            ) : (
              <EmptyState title={params.q || params.type || params.degree || params.verified || params.region || params.english ? "No universities match" : "The directory is being prepared"} description={params.q || params.type || params.degree || params.verified || params.region || params.english ? "Try a broader search." : "University details are being added. Check back soon."} />
            )}
          </div>
          {result.pages > 1 && (
            <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-2">
              {result.page > 1 && <Link href={hrefWith(params, { page: String(result.page - 1) })} className="chip">Previous</Link>}
              <span className="px-3 text-sm text-muted">Page {result.page} of {result.pages}</span>
              {result.page < result.pages && <Link href={hrefWith(params, { page: String(result.page + 1) })} className="chip">Next</Link>}
            </nav>
          )}
          <p className="mx-auto mt-14 max-w-2xl text-center text-sm text-muted">
            Programs and requirements change every year. Universities marked <strong className="text-ink">Verified</strong> have program details checked against official pages; always confirm on the university&apos;s site before applying.
          </p>
        </div>
      </section>
    </>
  );
}
