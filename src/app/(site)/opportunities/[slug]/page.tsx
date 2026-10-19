import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Building2, CalendarClock, CalendarPlus, Check, Clock, GraduationCap, MapPin, Wallet } from "lucide-react";
import { DeadlineChip, OpportunityCard, fundingTone } from "@/components/opportunities/OpportunityCard";
import { ShareButton } from "@/components/ui/ShareButton";
import { degreeLabel, fundingLabel, typeLabel } from "@/lib/opportunities/constants";
import { safe } from "@/lib/safe";
import { getPublicOpportunity, relatedOpportunities } from "@/lib/services/opportunities";
import { absoluteUrl } from "@/lib/site";
import { cn } from "@/lib/utils/cn";
import { JsonLd } from "@/components/ui/JsonLd";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
const lines = (t: string) => t.split(/\n+/).map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);

function calendarLink(title: string, deadlineIso: string, url: string) {
  // All-day event on the deadline date (India time).
  const day = new Date(new Date(deadlineIso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10).replace(/-/g, "");
  const next = new Date(new Date(deadlineIso).getTime() + 5.5 * 3600_000 + 86400_000).toISOString().slice(0, 10).replace(/-/g, "");
  const p = new URLSearchParams({ action: "TEMPLATE", text: `Deadline: ${title}`, dates: `${day}/${next}`, details: `Apply: ${url}` });
  return `https://calendar.google.com/calendar/render?${p}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const o = await safe("opportunity.meta", async () => getPublicOpportunity((await params).slug), null);
  if (!o) return { title: "Opportunity not found", robots: { index: false } };
  const kind = typeLabel(o.type).toLowerCase();
  return {
    title: o.title,
    description: o.summary || `${fundingLabel(o.funding)} ${kind} in ${o.country}: eligibility, benefits, deadline and how to apply, explained for Indian students.`,
    keywords: [o.title, `${o.title} eligibility`, `${o.title} deadline`, `${kind} in ${o.country}`, `${fundingLabel(o.funding).toLowerCase()} ${kind}`, `${kind} for Indian students`, ...(o.country === "Japan" ? ["internships in Japan", "scholarships in Japan"] : [])],
    alternates: { canonical: `/opportunities/${o.slug}` },
    openGraph: { title: o.title, description: o.summary, url: absoluteUrl(`/opportunities/${o.slug}`), ...(o.coverImage ? { images: [{ url: absoluteUrl(o.coverImage.url), alt: o.coverImage.alt || o.title }] } : {}) },
    robots: o.closed ? { index: false } : undefined,
  };
}

export default async function OpportunityPage({ params }: Props) {
  const { slug } = await params;
  const o = await safe("opportunity.detail", () => getPublicOpportunity(slug), null);
  if (!o) notFound();
  const related = await safe("opportunity.related", () => relatedOpportunities(o), []);
  const url = absoluteUrl(`/opportunities/${o.slug}`);
  const facts = [
    { Icon: CalendarClock, label: "Deadline", value: o.deadline ? fmt(o.deadline) : o.rolling ? "Rolling applications" : "See official page" },
    { Icon: MapPin, label: "Where", value: [o.location, o.country].filter(Boolean).join(", ") },
    { Icon: Wallet, label: "Funding", value: fundingLabel(o.funding) },
    o.period && { Icon: Clock, label: "When / duration", value: o.period },
    o.degreeLevels.length > 0 && { Icon: GraduationCap, label: "For", value: o.degreeLevels.map(degreeLabel).join(", ") },
    o.organization && { Icon: Building2, label: "Offered by", value: o.organization },
  ].filter(Boolean) as { Icon: typeof MapPin; label: string; value: string }[];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Opportunities", item: absoluteUrl("/opportunities") },
            { "@type": "ListItem", position: 2, name: o.title, item: absoluteUrl(`/opportunities/${o.slug}`) },
          ],
        }}
      />
      <div className="container-x grid grid-cols-1 gap-12 pb-20 pt-28 md:pt-32 lg:grid-cols-12 lg:gap-14">
        <article className="min-w-0 lg:col-span-8">
          <Link href="/opportunities" className="group inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /> All opportunities
          </Link>
          {o.coverImage && (
            <figure className="mt-6">
              <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-line bg-paper-3">
                <Image src={o.coverImage.url} alt={o.coverImage.alt || o.title} fill priority sizes="(min-width: 1024px) 50rem, 100vw" className="object-cover" />
              </div>
              {o.coverImage.credit?.name && (
                <figcaption className="mt-2 text-right text-xs text-muted">
                  {o.coverImage.alt && <>{o.coverImage.alt} · </>}Photo:{" "}
                  {o.coverImage.credit.url ? <a href={o.coverImage.credit.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{o.coverImage.credit.name}</a> : o.coverImage.credit.name}
                </figcaption>
              )}
            </figure>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-soft px-3 py-1 text-xs font-medium text-indigo">{typeLabel(o.type)}</span>
            <span className={cn("rounded-full px-3 py-1 text-xs font-medium", fundingTone(o.funding))}>{fundingLabel(o.funding)}</span>
            <DeadlineChip o={o} />
          </div>
          {o.organization && <p className="mt-5 text-sm font-medium uppercase tracking-wider text-muted">{o.organization}</p>}
          <h1 className="display mt-2 text-[2.4rem] leading-[1.03] md:text-[3.3rem]">{o.title}</h1>
          {o.summary && <p className="mt-4 text-lg leading-relaxed text-ink-2 md:text-xl">{o.summary}</p>}
          {o.fields.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {o.fields.map((f) => <li key={f}><Link href={`/opportunities?q=${encodeURIComponent(f)}#results`} className="chip">{f}</Link></li>)}
            </ul>
          )}

          {o.description && (
            <section className="mt-10">
              <h2 className="display text-3xl">About the <em className="text-accent">program</em></h2>
              <div className="mt-4 space-y-4 font-[family-name:var(--font-prose)] text-[1.1rem] leading-relaxed text-ink-2">
                {o.description.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
              </div>
            </section>
          )}
          {o.eligibility && (
            <section className="mt-10">
              <h2 className="display text-3xl">Who can <em className="text-accent">apply</em></h2>
              <ul className="mt-4 space-y-2.5">
                {lines(o.eligibility).map((l) => <li key={l} className="flex gap-3 text-[1rem] text-ink-2"><Check className="mt-1 size-4 shrink-0 text-accent" /> {l}</li>)}
              </ul>
            </section>
          )}
          {o.benefits && (
            <section className="mt-10">
              <h2 className="display text-3xl">What you <em className="text-accent">get</em></h2>
              <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {lines(o.benefits).map((l) => (
                  <li key={l} className="flex gap-3 rounded-2xl border border-line bg-[#fffdf9] p-4 text-[0.97rem] text-ink-2">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-white"><Check className="size-3.5" /></span>
                    {l}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="mt-10 text-sm text-muted">
            Always confirm details on the official page before applying. Last updated {new Date(o.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.
            {o.sourceUrl && <> Source: <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4">{new URL(o.sourceUrl).hostname}</a></>}
          </p>
        </article>

        <aside className="lg:col-span-4">
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-3xl border border-line bg-[#fffdf9] p-6 shadow-[0_24px_60px_-40px_rgba(29,43,69,0.45)]">
              <dl className="space-y-4">
                {facts.map(({ Icon, label, value }) => (
                  <div key={label} className="flex gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-paper-2 text-accent"><Icon className="size-4" /></span>
                    <div className="min-w-0">
                      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
                      <dd className="text-[0.95rem] font-medium text-ink">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
              {o.closed ? (
                <p className="mt-6 rounded-xl bg-paper-2 px-4 py-3 text-sm text-ink-2">Applications for this round have closed. It often opens again next year.</p>
              ) : (
                o.applyUrl && (
                  <a href={o.applyUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-accent mt-6 w-full !py-3.5 text-base">
                    Apply on the official site <ArrowUpRight className="size-4" />
                  </a>
                )
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {o.deadline && !o.closed && (
                  <a href={calendarLink(o.title, o.deadline, o.applyUrl || url)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost flex-1 !py-2.5 text-ink">
                    <CalendarPlus className="size-4" /> Add deadline
                  </a>
                )}
                <ShareButton url={url} title={o.title} className="flex-1 !py-2.5 text-ink" />
              </div>
            </div>
            <div className="rounded-3xl border border-line bg-sakura p-6">
              <p className="display text-2xl">Need help with your application?</p>
              <p className="mt-1 text-sm text-ink-2">Join a live session on proposals, CVs and interviews.</p>
              <Link href="/sessions" className="btn btn-ink mt-4 !py-2.5">See sessions</Link>
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t border-line bg-paper-2 py-16">
          <div className="container-x">
            <h2 className="display text-4xl">Similar <em className="text-accent">opportunities</em></h2>
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => <OpportunityCard key={r.id} o={r} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
