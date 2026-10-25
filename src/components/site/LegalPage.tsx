import type { Metadata } from "next";
import Link from "next/link";
import { markdownToHtml } from "@/lib/content/html";
import { LEGAL_DOCS, type LegalDoc } from "@/lib/legal/defaults";
import { seoMeta } from "@/lib/seo";
import { getSettings } from "@/lib/services/settings";
import { cn } from "@/lib/utils/cn";

export const LEGAL_LINKS = (Object.keys(LEGAL_DOCS) as LegalDoc[]).map((k) => ({ href: LEGAL_DOCS[k].path, label: LEGAL_DOCS[k].title }));

export const CONTACT_FALLBACK = "connect@lifeofkittukun.com";

export function legalMetadata(doc: LegalDoc): Metadata {
  const d = LEGAL_DOCS[doc];
  return seoMeta({ title: d.title, description: d.description, path: d.path });
}

const longDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

/**
 * A policy page: the Markdown saved in Studio → Settings → Policies, the
 * business contact details, and links to the other policies.
 */
export async function LegalPage({ doc }: { doc: LegalDoc }) {
  const { social, legal } = await getSettings();
  const meta = LEGAL_DOCS[doc];
  const email = social.email || CONTACT_FALLBACK;
  const html = markdownToHtml(legal[doc].replaceAll("{email}", `[${email}](mailto:${email})`));
  return (
    <section className="container-x max-w-3xl pb-24 pt-28 md:pt-32">
      <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> <span className="jp text-accent">{meta.jp}</span> Policies</p>
      <h1 className="display mt-5 text-[2.6rem] leading-[1.02] sm:text-6xl">{meta.title}</h1>
      {legal.updatedOn && <p className="mt-4 text-sm text-muted">Last updated {longDate(legal.updatedOn)}</p>}
      <div className="prose-kk mt-10" dangerouslySetInnerHTML={{ __html: html }} />
      <address className="mt-12 rounded-2xl border border-line bg-[#fffdf9] p-5 text-sm not-italic leading-relaxed text-ink-2">
        <p className="font-medium text-ink">Contact us</p>
        <p className="mt-1">{social.businessName || "Life of KittuKun, run by Chitranshu Rajput"}</p>
        {social.address && <p className="whitespace-pre-line">{social.address}</p>}
        <p>
          Email: <a href={`mailto:${email}`} className="text-accent-deep hover:underline">{email}</a>
          {social.phone && <> · Phone: <a href={`tel:${social.phone.replace(/[\s-]/g, "")}`} className="text-accent-deep hover:underline">{social.phone}</a></>}
        </p>
      </address>
      <nav aria-label="Policies" className="mt-14 flex flex-wrap gap-2 border-t border-line pt-6">
        {LEGAL_LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={l.href === meta.path ? "page" : undefined} className={cn("chip", l.href === meta.path && "!border-ink !bg-ink !text-cream")}>{l.label}</Link>
        ))}
      </nav>
    </section>
  );
}
