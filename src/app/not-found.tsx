import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Maximize, Settings, SkipForward, Volume2 } from "lucide-react";
import { Logo, SunMark } from "@/components/site/Logo";
import { PlayGlyph } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

const NEXT_UP = [
  { href: "/journey", label: "The journey", note: "From Delhi to Japan" },
  { href: "/videos", label: "Videos", note: "Guides & vlogs" },
  { href: "/blog", label: "Blog", note: "Field notes & guides" },
  { href: "/collaborate", label: "Collaborate", note: "Work together" },
];

/** A "video unavailable" player: on-brand 404 for a YouTube creator. */
export default function NotFound() {
  return (
    <main className="grain relative min-h-[100svh] overflow-hidden bg-night text-cream">
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[30rem] rounded-full bg-accent/10 blur-3xl" />
      <div className="container-x relative z-[2] flex min-h-[100svh] flex-col py-6">
        <header className="flex items-center justify-between">
          <Logo tone="light" />
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-cream-muted hover:text-cream">
            <ArrowLeft className="size-4" /> Home
          </Link>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center py-12">
          {/* The "player" */}
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-cream/10 bg-[#0b0a09] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)]">
            <div className="relative grid aspect-video place-items-center overflow-hidden">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(217,72,43,0.18),transparent_65%)]" />
              <div className="relative text-center">
                <SunMark className="mx-auto size-12 sm:size-16" />
                <p className="display mt-3 text-[4.5rem] leading-none sm:text-[7.5rem]">
                  4<span className="text-accent">0</span>4
                </p>
                <p className="kicker mt-3 text-cream-muted">Video unavailable</p>
              </div>
            </div>
            {/* fake controls */}
            <div className="px-4 pb-3 pt-1" aria-hidden>
              <div className="relative h-1 rounded-full bg-cream/15">
                <div className="absolute inset-y-0 left-0 w-[40.4%] rounded-full bg-accent" />
                <span className="absolute left-[40.4%] top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
              </div>
              <div className="mt-2.5 flex items-center justify-between text-cream/80">
                <div className="flex items-center gap-4">
                  <PlayGlyph className="size-4" />
                  <SkipForward className="size-4" />
                  <Volume2 className="size-4" />
                  <span className="font-mono text-[0.7rem] text-cream-muted">4:04 / 4:04</span>
                </div>
                <div className="flex items-center gap-4">
                  <Settings className="size-4" />
                  <Maximize className="size-4" />
                </div>
              </div>
            </div>
          </div>

          <h1 className="display mt-12 text-center text-5xl leading-[1.02] sm:text-7xl">
            This page took <em className="text-accent">a detour.</em>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-center text-cream/70">
            The link may be old or mistyped, or the post may have moved. Let&apos;s get you back on route.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn btn-accent">Back to home</Link>
            <Link href="/videos" className="btn btn-ghost text-cream">Watch the latest</Link>
          </div>

          <nav aria-label="Up next" className="mt-14 w-full max-w-3xl">
            <p className="kicker text-cream-muted">Up next</p>
            <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {NEXT_UP.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="group block rounded-xl border border-cream/10 p-4 transition-colors hover:border-accent/60 hover:bg-cream/5">
                    <span className="block font-medium text-cream group-hover:text-accent">{n.label}</span>
                    <span className="mt-1 block text-xs text-cream-muted">{n.note}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </main>
  );
}
