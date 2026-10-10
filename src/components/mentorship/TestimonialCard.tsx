import { Stars } from "@/components/mentorship/Stars";
import { YouTubeIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";
import type { TestimonialDTO } from "@/lib/services/testimonials";

const COLORS = ["bg-[#d9482b]", "bg-[#24365a]", "bg-[#3f5a46]", "bg-[#a8741a]", "bg-[#6b3f5a]", "bg-[#2f5f6b]"];
const colorFor = (name: string) => COLORS[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % COLORS.length];

/** A testimonial from outside the booking flow, clearly labelled with where it was said. */
export function TestimonialCard({ t, className }: { t: TestimonialDTO; className?: string }) {
  return (
    <figure className={cn("flex h-full flex-col rounded-2xl border border-line bg-[#fffdf9] p-6", className)}>
      {t.rating ? <Stars value={t.rating} /> : <span aria-hidden className="font-[family-name:var(--font-display)] text-4xl leading-none text-accent">“</span>}
      <blockquote className="mt-3 flex-1 font-[family-name:var(--font-prose)] text-[1.02rem] leading-relaxed text-ink-2">{t.text}</blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-medium text-white", colorFor(t.name))}>{t.name.trim().charAt(0).toUpperCase()}</span>
        <span className="min-w-0 text-sm">
          <span className="block font-medium text-ink">{t.name}</span>
          {t.source === "youtube" && t.videoId ? (
            <a href={`https://www.youtube.com/watch?v=${t.videoId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate text-xs text-muted hover:text-ink">
              <YouTubeIcon className="size-3 shrink-0 text-accent" /> <span className="truncate">Comment on “{t.videoTitle}”</span>
            </a>
          ) : (
            t.via && <span className="block truncate text-xs text-muted">{t.via}</span>
          )}
        </span>
      </figcaption>
    </figure>
  );
}
