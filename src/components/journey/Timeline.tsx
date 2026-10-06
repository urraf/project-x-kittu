import Image from "next/image";
import Link from "next/link";
import { Award, Briefcase, Clapperboard, GraduationCap, Heart, MapPin, Plane } from "lucide-react";
import { PlayGlyph } from "@/components/ui/icons";
import { YouTubeThumb } from "@/components/video/YouTubeThumb";
import { cleanTitle } from "@/lib/utils/text";
import type { MilestoneDTO, VideoDTO } from "@/lib/types";

const KIND = {
  education: { Icon: GraduationCap, label: "Education" },
  career: { Icon: Briefcase, label: "Career" },
  travel: { Icon: Plane, label: "Travel" },
  achievement: { Icon: Award, label: "Milestone" },
  channel: { Icon: Clapperboard, label: "Channel" },
  life: { Icon: Heart, label: "Life" },
} as const;

export function Timeline({ milestones, videos }: { milestones: MilestoneDTO[]; videos: Record<string, VideoDTO> }) {
  return (
    <ol className="relative">
      <span aria-hidden className="absolute bottom-0 left-[19px] top-2 w-px bg-ink/15 md:left-[calc(25%+19px)]" />
      {milestones.map((m, i) => {
        const kind = KIND[m.kind as keyof typeof KIND] ?? KIND.life;
        const video = m.videoId ? videos[m.videoId] : undefined;
        return (
          <li key={m.id} id={m.id} className="relative grid scroll-mt-28 gap-4 pb-20 pl-14 last:pb-0 md:grid-cols-4 md:gap-0 md:pl-0" data-reveal>
            <div className="md:pr-12 md:text-right">
              <div className="md:sticky md:top-28">
                <p className="display text-3xl text-ink md:text-4xl">{m.period}</p>
                <p className="kicker mt-2 text-accent-deep">{m.chapter || `Chapter ${String(i + 1).padStart(2, "0")}`}</p>
              </div>
            </div>
            <span
              aria-hidden
              className="absolute left-0 top-0 grid size-10 place-items-center rounded-full border border-ink/15 bg-paper text-accent md:left-[25%]"
            >
              <kind.Icon className="size-[1.05rem]" />
            </span>
            <div className="md:col-span-3 md:pl-20">
              <p className="kicker text-muted">{kind.label}</p>
              <h3 className="display mt-3 text-[2.4rem] leading-[1.02] md:text-5xl">{m.title}</h3>
              {m.location && (
                <p className="mt-4 flex items-center gap-1.5 text-sm text-muted">
                  <MapPin className="size-3.5" /> {m.location}
                </p>
              )}
              {m.description && (
                <div className="mt-5 max-w-2xl space-y-4 text-[1.06rem] leading-relaxed text-ink-2">
                  {m.description.split(/\n{2,}/).map((para, j) => (
                    <p key={j}>{para}</p>
                  ))}
                </div>
              )}
              {m.highlights.length > 0 && (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {m.highlights.map((h) => (
                    <li key={h} className="rounded-full border border-line bg-paper-2 px-3.5 py-1.5 text-[0.82rem] text-ink-2">
                      {h}
                    </li>
                  ))}
                </ul>
              )}
              {m.image?.url && (
                <div className="relative mt-8 aspect-[16/10] max-w-2xl overflow-hidden rounded-2xl bg-paper-3">
                  <Image src={m.image.url} alt={m.image.alt || m.title} fill sizes="(min-width: 768px) 42rem, 100vw" className="object-cover" />
                </div>
              )}
              {m.videoId && (
                <Link href={`/videos/${m.videoId}`} className="group mt-8 flex max-w-xl items-center gap-4 rounded-2xl border border-line bg-paper p-2.5 pr-5 transition-colors hover:border-ink/40">
                  <span className="img-zoom relative aspect-video w-36 shrink-0 overflow-hidden rounded-xl bg-night sm:w-44">
                    <YouTubeThumb id={m.videoId} alt="" sizes="176px" />
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="grid size-9 place-items-center rounded-full bg-accent text-white transition-transform group-hover:scale-110">
                        <PlayGlyph className="ml-0.5 size-4" />
                      </span>
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="kicker text-accent-deep">Watch this chapter</span>
                    <span className="mt-1.5 line-clamp-2 block text-[0.95rem] font-medium leading-snug text-ink">
                      {video ? cleanTitle(video.title) : "Open the video"}
                    </span>
                  </span>
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
