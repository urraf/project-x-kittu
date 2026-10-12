import type { Metadata } from "next";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { Suspense } from "react";
import { UniMatch } from "@/components/universities/UniMatch";
import { UniversityFilters } from "@/components/universities/UniversityFilters";
import { Kittu } from "@/components/mascot/Kittu";
import { UniversityCard } from "@/components/universities/UniversityCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { safe } from "@/lib/safe";
import { searchUniversities, universitySearchSchema, universityStats, type UniversitySearch } from "@/lib/services/universities";
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
        <div className="container-x relative grid grid-cols-1 items-center gap-10 pb-10 pt-28 md:pb-14 md:pt-32 lg:grid-cols-12">
          <div className="lg:col-span-7">
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

          {/* Kittu with the directory at a glance */}
          <div className="relative mx-auto hidden w-full max-w-md lg:col-span-5 lg:block" aria-hidden>
            <span className="absolute left-1/2 top-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fffdf9]/70" />
            <Kittu pose="think" priority sizes="18rem" alt="" className="relative mx-auto w-64" />
            <span className="absolute left-0 top-6 rounded-2xl border border-line bg-[#fffdf9] px-4 py-2.5 shadow-[0_18px_40px_-28px_rgba(29,43,69,0.6)]">
              <span className="display block text-3xl leading-none text-ink">{stats.total || 207}</span>
              <span className="text-xs text-muted">universities in Japan</span>
            </span>
            <span className="absolute -right-2 top-24 rounded-2xl border border-line bg-[#fffdf9] px-4 py-2.5 shadow-[0_18px_40px_-28px_rgba(29,43,69,0.6)]">
              <span className="display block text-3xl leading-none text-ink">{stats.byType.national ?? 0}</span>
              <span className="text-xs text-muted">national universities</span>
            </span>
            <span className="absolute bottom-6 left-2 inline-flex items-center gap-2 rounded-full border border-line bg-[#fffdf9] py-2 pl-2 pr-4 text-sm text-ink shadow-[0_18px_40px_-28px_rgba(29,43,69,0.6)]">
              <span className="hanko size-8 -rotate-3 text-[0.6rem]"><span className="[writing-mode:vertical-rl]">相性</span></span>
              Your shortlist in a minute
            </span>
          </div>
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
          <Suspense fallback={<div className="h-16 rounded-2xl border border-line bg-paper-2/60" />}>
            <UniversityFilters total={stats.total} counts={stats.byType} />
          </Suspense>
          <p className="mt-5 text-sm text-muted">{result.total} {result.total === 1 ? "university" : "universities"}{params.q ? ` matching “${params.q}”` : ""}</p>
          <div className="mt-4">
            {result.items.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
