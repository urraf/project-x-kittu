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

export function Footer({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="grain relative overflow-hidden bg-night text-cream print:hidden">
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full bg-accent/10 blur-3xl" />
      <div className="container-x relative z-[2] pb-10 pt-20 md:pt-28">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-6">
            <p className="kicker text-cream-muted">Keep going</p>
            <h2 className="display mt-5 text-5xl md:text-7xl">
              The next chapter <em className="text-accent">starts</em> with one application.
            </h2>
            <div className="mt-9 flex flex-wrap gap-3">
              {settings.social.youtube && (
                <a href={`${settings.social.youtube}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" className="btn btn-accent">
                  <YouTubeIcon className="size-4" /> Subscribe on YouTube
                </a>
              )}
              <Link href="/collaborate" className="btn btn-ghost text-cream">
                Work with me <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 md:col-span-6 md:grid-cols-3 md:pl-10">
            <div>
              <p className="kicker text-cream-muted">Explore</p>
              <ul className="mt-4 space-y-2.5 text-[0.95rem]">
                <li><Link className="link-underline" href="/journey">Journey</Link></li>
                <li><Link className="link-underline" href="/videos">Videos</Link></li>
                <li><Link className="link-underline" href="/blog">Blog</Link></li>
                <li><Link className="link-underline" href="/sessions">Sessions</Link></li>
                <li><Link className="link-underline" href="/collaborate">Collaborate</Link></li>
              </ul>
            </div>
            <div>
              <p className="kicker text-cream-muted">Routes</p>
              <ul className="mt-4 space-y-2.5 text-[0.95rem]">
                <li><Link className="link-underline" href="/videos?series=japan">Japan</Link></li>
                <li><Link className="link-underline" href="/videos?series=korea">Korea</Link></li>
                <li><Link className="link-underline" href="/videos?series=europe">Europe</Link></li>
                <li><Link className="link-underline" href="/videos?series=career">Career</Link></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="kicker text-cream-muted">Follow</p>
              <SocialLinks social={settings.social} className="mt-4 flex-wrap text-cream" />
              {settings.social.email && (
                <a href={`mailto:${settings.social.email}`} className="link-underline mt-4 inline-block text-sm text-cream-muted">
                  {settings.social.email}
                </a>
              )}
            </div>
          </nav>
        </div>

        <div className="mt-20 flex flex-col gap-6 border-t border-cream/10 pt-8 text-sm text-cream-muted md:flex-row md:items-center md:justify-between">
          <Logo tone="light" />
          <p>
            © {year} {settings.profile.name}. Made between applications.
          </p>
          <div className="flex gap-5">
            <a href="/feed.xml" className="link-underline">RSS</a>
            <a href="/sitemap.xml" className="link-underline">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
