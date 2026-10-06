"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { InstagramIcon, YouTubeIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/journey", label: "Journey" },
  { href: "/videos", label: "Videos" },
  { href: "/blog", label: "Blog" },
  { href: "/collaborate", label: "Collaborate" },
];

/** Routes that open with a dark, cinematic hero — the header starts transparent there. */
const DARK_HERO = [/^\/$/, /^\/videos(\/.*)?$/];

export function Header({ youtube, instagram }: { youtube?: string; instagram?: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  // Menu is "open for a pathname", so navigating closes it without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);
  const overHero = DARK_HERO.some((re) => re.test(pathname)) && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenAt(null);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-cream">
        Skip to content
      </a>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500",
          overHero ? "border-b border-transparent bg-transparent" : "border-b border-line/70 bg-paper/85 backdrop-blur-xl",
        )}
      >
        <div className="container-x flex h-[4.5rem] items-center justify-between gap-6">
          <Logo tone={overHero ? "light" : "dark"} />

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "relative rounded-full px-4 py-2 text-[0.92rem] transition-colors",
                  overHero ? "text-cream/80 hover:text-cream" : "text-ink-2 hover:text-ink",
                  isActive(item.href) && (overHero ? "text-cream" : "text-ink"),
                )}
              >
                {item.label}
                {isActive(item.href) && <span className="absolute inset-x-4 -bottom-0.5 h-px bg-accent" />}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {instagram && (
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className={cn("hidden size-10 place-items-center rounded-full transition-colors sm:grid", overHero ? "text-cream/80 hover:text-cream" : "text-ink-2 hover:text-ink")}
              >
                <InstagramIcon className="size-[1.15rem]" />
              </a>
            )}
            {youtube && (
              <a href={`${youtube}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" className="btn btn-accent hidden !py-2.5 sm:inline-flex">
                <YouTubeIcon className="size-4" />
                Subscribe
              </a>
            )}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mobile-menu"
              className={cn("grid size-10 place-items-center rounded-full md:hidden", overHero ? "text-cream" : "text-ink")}
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={cn(
          "fixed inset-0 z-[60] flex flex-col bg-night text-cream transition-[opacity,visibility] duration-500 md:hidden",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <div className="container-x flex h-[4.5rem] items-center justify-between">
          <Logo tone="light" />
          <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="grid size-10 place-items-center rounded-full">
            <X className="size-5" />
          </button>
        </div>
        <nav aria-label="Mobile" className="container-x flex flex-1 flex-col justify-center gap-2 pb-16">
          {[{ href: "/", label: "Home" }, ...NAV].map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "display flex items-baseline gap-4 py-1 text-5xl transition-all duration-700",
                open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                pathname === item.href ? "text-accent" : "text-cream",
              )}
              style={{ transitionDelay: open ? `${80 + i * 50}ms` : "0ms" }}
            >
              <span className="kicker text-cream-muted">0{i + 1}</span>
              {item.label}
            </Link>
          ))}
          {youtube && (
            <a href={`${youtube}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" className="btn btn-accent mt-10 self-start">
              <YouTubeIcon className="size-4" /> Subscribe on YouTube
            </a>
          )}
        </nav>
      </div>
    </>
  );
}
