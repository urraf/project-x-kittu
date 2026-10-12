import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import { OpportunitySearch } from "@/components/opportunities/OpportunitySearch";
import { EmptyState } from "@/components/ui/EmptyState";
import { DEADLINE_FILTERS, degreeLabel, fundingLabel, typeLabel } from "@/lib/opportunities/constants";
import { safe } from "@/lib/safe";
import { searchOpportunities, searchSchema, type SearchParams } from "@/lib/services/opportunities";
import { absoluteUrl } from "@/lib/site";
import { cn } from "@/lib/utils/cn";
import { Kittu } from "@/components/mascot/Kittu";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Opportunity finder",
  description: "Find internships, scholarships, fellowships and research programs in Japan and abroad. Filter by country, funding and deadline.",
  alternates: { canonical: "/opportunities" },
  openGraph: { title: "Opportunity finder", url: absoluteUrl("/opportunities") },
};

function hrefWith(params: SearchParams, patch: Partial<Record<keyof SearchParams, string | undefined>>) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, page: undefined, ...patch })) if (v !== undefined && v !== "") next.set(k, String(v));
  return `/opportunities${next.size ? `?${next}` : ""}#results`;
}

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const params = searchSchema.parse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));
  const result = await safe("opportunities.search", () => searchOpportunities(params), { items: [], total: 0, page: 1, pages: 1 });

  const chips = [
    params.q && { key: "q" as const, label: `“${params.q}”` },
    params.type && { key: "type" as const, label: typeLabel(params.type) },
    params.country && { key: "country" as const, label: params.country },
    params.funding && { key: "funding" as const, label: fundingLabel(params.funding) },
    params.deadline && { key: "deadline" as const, label: DEADLINE_FILTERS.find((d) => d.id === params.deadline)?.label ?? "" },
    params.level && { key: "level" as const, label: degreeLabel(params.level) },
  ].filter(Boolean) as { key: keyof SearchParams; label: string }[];

  return (
    <>
      <section className="seigaiha relative overflow-hidden border-b border-line bg-paper-2">
        <div aria-hidden className="absolute -right-12 -top-10 size-36 rounded-full bg-accent/90 md:-right-24 md:-top-28 md:size-[26rem]" />
        <Kittu pose="walk" alt="" sizes="9rem" className="pointer-events-none absolute right-[24%] top-[7rem] z-[1] hidden w-28 lg:block xl:right-[27%]" />
        <div className="container-x relative pb-10 pt-28 md:pb-14 md:pt-32">
          <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> <span className="jp text-accent">機会</span> Opportunity finder</p>
          <h1 className="display mt-5 max-w-3xl text-[2.8rem] leading-[0.98] sm:text-6xl lg:text-[4.4rem]">
            Find your next <em className="text-accent">opportunity.</em>
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">Internships, scholarships, fellowships and research programs, checked and kept up to date. Filter by what matters to you.</p>
          <OpportunitySearch className="mt-8" withKeyword initial={{ type: params.type ?? "", country: params.country ?? "", funding: params.funding ?? "", deadline: params.deadline ?? "", q: params.q ?? "" }} />
        </div>
      </section>

      <section id="results" className="scroll-mt-20 py-12 md:py-16">
        <div className="container-x">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="display text-3xl">
                {result.total} {result.total === 1 ? "opportunity" : "opportunities"}
                {params.closed ? " (including closed)" : ""}
              </h2>
              {chips.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {chips.map((c) => (
                    <Link key={c.key} href={hrefWith(params, { [c.key]: undefined })} className="chip bg-[#fffdf9]" aria-label={`Remove filter ${c.label}`}>
                      {c.label} <X className="size-3.5" />
                    </Link>
                  ))}
                  <Link href="/opportunities#results" className="text-sm text-muted underline underline-offset-4 hover:text-ink">Clear all</Link>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Sort:</span>
              <Link href={hrefWith(params, { sort: undefined })} className="chip" data-active={params.sort !== "newest"}>Closing soon</Link>
              <Link href={hrefWith(params, { sort: "newest" })} className="chip" data-active={params.sort === "newest"}>Newest</Link>
              <Link href={hrefWith(params, { closed: params.closed ? undefined : "1" })} className={cn("chip", params.closed && "!border-ink")}>{params.closed ? "Hide closed" : "Show closed"}</Link>
            </div>
          </div>

          <div className="mt-8">
            {result.items.length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {result.items.map((o) => <OpportunityCard key={o.id} o={o} />)}
              </div>
            ) : (
              <EmptyState
                title={chips.length ? "No matches for these filters" : "New opportunities are on the way"}
                description={chips.length ? "Try removing a filter or searching for something broader." : "Opportunities are being added. Check back soon, or book a session to plan your applications."}
              />
            )}
          </div>

          {result.pages > 1 && (
            <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-2">
              {result.page > 1 && <Link href={hrefWith(params, { page: String(result.page - 1) })} className="chip">Previous</Link>}
              <span className="px-3 text-sm text-muted">Page {result.page} of {result.pages}</span>
              {result.page < result.pages && <Link href={hrefWith(params, { page: String(result.page + 1) })} className="chip">Next</Link>}
            </nav>
          )}

          <div className="mt-16 flex flex-col items-start gap-4 rounded-3xl border border-line bg-indigo-soft/60 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div>
              <p className="display text-3xl">Found one? Get help applying.</p>
              <p className="mt-1 text-ink-2">Live sessions cover proposals, cold emails and interviews, step by step.</p>
            </div>
            <Link href="/sessions" className="btn btn-accent">See live sessions</Link>
          </div>
        </div>
      </section>
    </>
  );
}
