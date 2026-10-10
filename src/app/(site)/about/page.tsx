import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Timeline } from "@/components/journey/Timeline";
import { EmptyState } from "@/components/ui/EmptyState";
import { JsonLd } from "@/components/ui/JsonLd";
import { safe } from "@/lib/safe";
import { listMilestones } from "@/lib/services/milestones";
import { getSettings } from "@/lib/services/settings";
import { getVideosByIds } from "@/lib/services/videos";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await getSettings();
  const description = `The story of ${profile.name}: from NSUT Delhi to a fully funded research internship in Japan, a growing YouTube channel and a first job in Lucknow.`;
  return {
    title: "About",
    description,
    alternates: { canonical: "/about" },
    openGraph: { title: `About · ${profile.channelName}`, description, url: absoluteUrl("/about") },
  };
}

export default async function AboutPage() {
  const settings = await getSettings();
  const { profile } = settings;
  const milestones = await safe("journey.milestones", () => listMilestones(), []);
  const videoIds = milestones.map((m) => m.videoId).filter((v): v is string => Boolean(v));
  const videos = await safe("journey.videos", () => getVideosByIds(videoIds), []);
  const videoMap = Object.fromEntries(videos.map((v) => [v.youtubeId, v]));
  const portrait = profile.portraitUrl || profile.avatarUrl;
  const [firstPara, ...restParas] = profile.longBio.split(/\n{2,}/).filter(Boolean);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          url: absoluteUrl("/about"),
          mainEntity: { "@type": "Person", name: profile.name, alternateName: profile.channelName, description: profile.shortBio, image: profile.avatarUrl || undefined },
        }}
      />

      {/* Opening */}
      <section className="pb-20 pt-28 md:pb-28 md:pt-32">
        <div className="container-x">
          <p className="kicker flex items-center gap-3 text-muted" data-reveal>
            <span className="h-px w-8 bg-accent" /> <span className="jp text-accent">自己紹介</span> About
          </p>
          <h1 className="display mt-5 max-w-4xl text-[2.9rem] leading-[0.95] sm:text-6xl lg:text-[4.75rem]" data-reveal>
            Meet {profile.name.split(" ")[0]}, your <em className="text-accent">guide to Japan.</em>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2" data-reveal>
            The person behind {profile.channelName} and this platform. The road, as it actually happened, and why every tool here exists.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-12 md:mt-12 md:grid-cols-12 md:gap-10">
            <div className="md:col-span-5" data-reveal>
              <div className="relative mx-auto aspect-square max-w-[19rem] md:mx-0 lg:max-w-[21rem]">
                <div className="absolute right-0 top-0 aspect-square w-[78%] rounded-full bg-accent" />
                {portrait && (
                  <div className="absolute bottom-0 left-0 aspect-square w-[78%] overflow-hidden rounded-full ring-[10px] ring-paper">
                    <Image src={portrait} alt={profile.name} fill sizes="(min-width: 768px) 24rem, 80vw" priority className="object-cover" />
                  </div>
                )}
              </div>
              <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
                {profile.quickFacts.map((f) => (
                  <div key={f.label} className="bg-paper p-5 [&:last-child:nth-child(odd)]:col-span-2">
                    <dt className="kicker text-muted">{f.label}</dt>
                    <dd className="mt-2 text-[0.98rem] text-ink">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="md:col-span-7 md:pl-8" data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
              {firstPara && <p className="display text-[1.8rem] leading-[1.15] text-ink md:text-[2.15rem]">{firstPara}</p>}
              <div className="mt-8 space-y-6 font-[family-name:var(--font-prose)] text-[1.18rem] leading-[1.75] text-ink-2">
                {restParas.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {profile.interests.length > 0 && (
                <div className="mt-12">
                  <p className="kicker text-muted">Things I love</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {profile.interests.map((i) => (
                      <li key={i} className="chip">{i}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="display mt-12 text-4xl italic">— {profile.name}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="border-t border-line bg-paper-2 py-24 md:py-32">
        <div className="container-x">
          <div className="mb-20 grid gap-6 md:grid-cols-4" data-reveal>
            <p className="kicker flex items-center gap-3 text-muted md:justify-end md:pr-12">
              <span className="h-px w-8 bg-accent" /> Timeline
            </p>
            <h2 className="display text-5xl md:col-span-3 md:pl-20 md:text-6xl">
              Chapters <em className="text-accent">&amp; turning points</em>
            </h2>
          </div>
          {milestones.length > 0 ? (
            <Timeline milestones={milestones} videos={videoMap} />
          ) : (
            <EmptyState title="The timeline is being written" description="Chapters of the journey will appear here soon." />
          )}
        </div>
      </section>

      {/* Principles + next steps */}
      <section className="py-24 md:py-32">
        <div className="container-x grid gap-16 md:grid-cols-12">
          <div className="md:col-span-5" data-reveal>
            <p className="kicker flex items-center gap-3 text-muted">
              <span className="h-px w-8 bg-accent" /> What this taught me
            </p>
            <h2 className="display mt-5 text-5xl md:text-6xl">Three things I&apos;d tell my younger self.</h2>
          </div>
          <ol className="space-y-10 md:col-span-7">
            {profile.principles.map((p, i) => (
              <li key={p.title} className="grid grid-cols-[3rem_1fr] gap-4 border-t border-line pt-8" data-reveal style={{ "--reveal-delay": `${i * 80}ms` } as React.CSSProperties}>
                <span className="font-mono text-sm text-accent">0{i + 1}</span>
                <div>
                  <h3 className="display text-3xl">{p.title}</h3>
                  <p className="mt-2 text-[1.02rem] leading-relaxed text-ink-2">{p.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="container-x mt-20 flex flex-wrap gap-3" data-reveal>
          <Link href="/opportunities" className="btn btn-accent">Find opportunities <ArrowRight className="size-4" /></Link>
          <Link href="/sessions" className="btn btn-ink">Book a session</Link>
          <Link href="/videos" className="btn btn-ghost">Watch the videos</Link>
          <Link href="/collaborate" className="btn btn-ghost">Work with me</Link>
        </div>
      </section>
    </>
  );
}
