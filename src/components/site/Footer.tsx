import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { InstagramIcon, LinkedInIcon, XIcon, YouTubeIcon } from "@/components/ui/icons";
import type { SiteSettings } from "@/lib/validation/settings";

export function SocialLinks({ social, className = "" }: { social: SiteSettings["social"]; className?: string }) {
  const items = [
    { href: social.youtube, label: "YouTube", Icon: YouTubeIcon },
    { href: social.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: social.linkedin, label: "LinkedIn", Icon: LinkedInIcon },
    { href: social.x, label: "X", Icon: XIcon },
  ].filter((i) => i.href);
  return (
    <ul className={`flex items-center gap-2 ${className}`}>
      {items.map(({ href, label, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="grid size-11 place-items-center rounded-full border border-current/20 transition-colors hover:border-accent hover:bg-accent hover:text-white"
          >
            <Icon className="size-[1.1rem]" />
          </a>
        </li>
      ))}
    </ul>
  );
}

const COLUMNS = [
  {
    title: "Tools",
    links: [
      { href: "/opportunities", label: "Opportunity finder" },
      { href: "/universities", label: "Universities in Japan" },
      { href: "/sessions", label: "Live sessions" },
      { href: "/store", label: "Study store" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/videos", label: "Videos" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/collaborate", label: "Collaborate" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/account/login", label: "Log in" },
      { href: "/account/login?mode=signup", label: "Create account" },
      { href: "/account", label: "My dashboard" },
    ],
  },
];

export function Footer({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden border-t border-line bg-paper-2 text-ink print:hidden">
      <div aria-hidden className="seigaiha pointer-events-none absolute inset-x-0 top-0 h-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="container-x relative pb-10 pt-16 md:pt-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="kicker flex items-center gap-3 text-muted">
              <span className="h-px w-8 bg-accent" /> <span className="jp text-accent">日本への道</span> Your road to Japan
            </p>
            <h2 className="display mt-4 text-4xl md:text-5xl">
              The next chapter <em className="text-accent">starts</em> with one application.
            </h2>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/opportunities" className="btn btn-accent">
                Find opportunities <ArrowUpRight className="size-4" />
              </Link>
              {settings.social.youtube && (
                <a href={`${settings.social.youtube}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-ink">
                  <YouTubeIcon className="size-4" /> Subscribe
                </a>
              )}
            </div>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4 md:col-span-7 md:pl-6">
            {COLUMNS.map((c) => (
              <div key={c.title}>
                <p className="kicker text-muted">{c.title}</p>
                <ul className="mt-4 space-y-2.5 text-[0.95rem] text-ink-2">
                  {c.links.map((l) => (
                    <li key={l.href}><Link className="link-underline hover:text-ink" href={l.href}>{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="col-span-2 sm:col-span-1">
              <p className="kicker text-muted">Follow</p>
              <SocialLinks social={settings.social} className="mt-4 flex-wrap text-ink" />
              {settings.social.email && (
                <a href={`mailto:${settings.social.email}`} className="link-underline mt-4 inline-block break-all text-sm text-muted">
                  {settings.social.email}
                </a>
              )}
              {settings.social.phone && (
                <a href={`tel:${settings.social.phone.replace(/[\s-]/g, "")}`} className="link-underline mt-2 block text-sm text-muted">{settings.social.phone}</a>
              )}
              {settings.social.address && <p className="mt-2 whitespace-pre-line text-sm text-muted">{settings.social.address}</p>}
            </div>
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-5 border-t border-line pt-7 text-sm text-muted md:flex-row md:items-center md:justify-between">
          <Logo tone="dark" />
          <p>
            © {year} {settings.social.businessName || settings.profile.channelName}. Made with care for students heading to Japan.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="link-underline">Privacy</Link>
            <Link href="/terms" className="link-underline">Terms</Link>
            <Link href="/refund-policy" className="link-underline">Refunds</Link>
            <a href="/feed.xml" className="link-underline">RSS</a>
            <a href="/sitemap.xml" className="link-underline">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
