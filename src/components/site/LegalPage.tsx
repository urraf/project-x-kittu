import Link from "next/link";
import { getSettings } from "@/lib/services/settings";
import { cn } from "@/lib/utils/cn";

export const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of use" },
  { href: "/refund-policy", label: "Refunds & cancellations" },
  { href: "/shipping-policy", label: "Delivery policy" },
];

/** Shared layout for the policy pages: title, last-updated date, readable prose, business contact details and links to the other policies. */
export async function LegalPage({ jp, title, updated, path, children }: { jp: string; title: string; updated: string; path: string; children: React.ReactNode }) {
  const { social } = await getSettings();
  const email = social.email || "lifeofkittukunweb@gmail.com";
  return (
    <section className="container-x max-w-3xl pb-24 pt-28 md:pt-32">
      <p className="kicker flex items-center gap-3 text-muted"><span className="h-px w-8 bg-accent" /> <span className="jp text-accent">{jp}</span> Policies</p>
      <h1 className="display mt-5 text-[2.6rem] leading-[1.02] sm:text-6xl">{title}</h1>
      <p className="mt-4 text-sm text-muted">Last updated {updated}</p>
      <div className="prose-kk mt-10">{children}</div>
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
          <Link key={l.href} href={l.href} aria-current={l.href === path ? "page" : undefined} className={cn("chip", l.href === path && "!border-ink !bg-ink !text-cream")}>{l.label}</Link>
        ))}
      </nav>
    </section>
  );
}
