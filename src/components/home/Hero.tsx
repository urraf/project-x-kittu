import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AccentTitle } from "@/components/ui/AccentTitle";
import { PlayGlyph } from "@/components/ui/icons";
import { YouTubeThumb } from "@/components/video/YouTubeThumb";
import { cleanTitle } from "@/lib/utils/text";
import type { VideoDTO } from "@/lib/types";
import type { SiteSettings } from "@/lib/validation/settings";

const PROGRAMS = ["MEXT", "METI", "OIST", "Max Planck", "CERN", "KAIST", "GKS", "EPFL", "ETH Zurich", "ISTA", "MAECI", "HENNGE", "Woven by Toyota", "NUS IRIS", "UTokyo"];

export function Hero({ profile, latest }: { profile: SiteSettings["profile"]; latest?: VideoDTO }) {
  const portrait = profile.portraitUrl || profile.avatarUrl;
  return (
    <section className="grain relative overflow-hidden bg-night text-cream">
      {latest && (
        <div aria-hidden className="absolute inset-0 opacity-[0.16]">
          <YouTubeThumb id={latest.youtubeId} alt="" sizes="100vw" priority className="object-cover blur-2xl scale-110" />
        </div>
      )}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,transparent_0%,var(--color-night)_75%)]" />

      <div className="container-x relative z-[2] grid min-h-[100svh] items-center gap-14 pb-28 pt-32 lg:grid-cols-12 lg:gap-8 lg:pb-32 lg:pt-28">
        <div className="lg:col-span-7">
          <p className="kicker flex items-center gap-3 text-cream-muted" data-reveal>
            <span className="h-px w-10 bg-accent" />
            {profile.heroEyebrow}
          </p>
          <h1 className="display mt-7 text-[3.3rem] leading-[0.95] sm:text-7xl lg:text-[6.4rem]" data-reveal style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>
            <AccentTitle text={profile.heroTitle} />
          </h1>
          <p className="mt-8 max-w-xl text-[1.08rem] leading-relaxed text-cream/75 md:text-lg" data-reveal style={{ "--reveal-delay": "160ms" } as React.CSSProperties}>
            {profile.heroSubtitle}
          </p>
          <div className="mt-10 flex flex-wrap gap-3" data-reveal style={{ "--reveal-delay": "240ms" } as React.CSSProperties}>
            <Link href="/videos" className="btn btn-accent">
              <PlayGlyph className="size-4" /> Watch the latest
            </Link>
            <Link href="/journey" className="btn btn-ghost text-cream">
              Read my journey <ArrowRight className="size-4" />
            </Link>
          </div>
          {profile.stats.length > 0 && (
            <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-cream/15 pt-7" data-reveal style={{ "--reveal-delay": "320ms" } as React.CSSProperties}>
              {profile.stats.map((s) => (
                <div key={s.label} className="flex flex-col">
                  <dt className="kicker order-2 mt-2 text-cream-muted">{s.label}</dt>
                  <dd className="display order-1 text-4xl md:text-5xl">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="relative mx-auto w-full max-w-[30rem] lg:col-span-5 lg:mr-0" data-reveal style={{ "--reveal-delay": "200ms" } as React.CSSProperties}>
          <div className="relative aspect-square">
            <div className="absolute inset-[4%] rounded-full bg-accent" />
            <div className="absolute inset-x-0 top-[63%] h-[1.4%] bg-night" />
            <div className="absolute inset-x-0 top-[71%] h-[1%] bg-night" />
            {portrait && (
              <div className="absolute bottom-[2%] left-[2%] aspect-square w-[64%] overflow-hidden rounded-full ring-[10px] ring-night">
                <Image src={portrait} alt={`${profile.name}, creator of ${profile.channelName}`} fill sizes="(min-width: 1024px) 20rem, 60vw" priority className="object-cover" />
              </div>
            )}
            <span className="font-jp absolute right-[17%] top-[15%] text-[clamp(2rem,4.6vw,3.6rem)] leading-none text-night/75 [writing-mode:vertical-rl]" aria-hidden>
              旅路
            </span>
          </div>
          {latest && (
            <Link
              href={`/videos/${latest.youtubeId}`}
              className="group absolute -bottom-8 right-0 flex w-[17.5rem] items-center gap-3 rounded-2xl border border-cream/10 bg-night-2/90 p-2.5 pr-4 shadow-2xl backdrop-blur-md transition-colors hover:border-accent/60 sm:-right-4"
            >
              <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg">
                <YouTubeThumb id={latest.youtubeId} alt="" sizes="112px" />
              </span>
              <span className="min-w-0">
                <span className="kicker flex items-center gap-1.5 !text-[0.6rem] text-accent">
                  <span className="size-1.5 animate-pulse rounded-full bg-accent" /> New upload
                </span>
                <span className="mt-1 line-clamp-2 text-[0.82rem] leading-snug text-cream">{cleanTitle(latest.title)}</span>
              </span>
            </Link>
          )}
        </div>
      </div>

      <div className="relative z-[2] border-t border-cream/10 py-5" aria-label="Programs covered on the channel">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
          {[...PROGRAMS, ...PROGRAMS].map((p, i) => (
            <span key={i} className="kicker flex items-center gap-10 text-cream-muted" aria-hidden={i >= PROGRAMS.length}>
              {p}
              <span className="size-1.5 rounded-full bg-accent/80" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
