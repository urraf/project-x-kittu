import { Stars } from "@/components/mentorship/Stars";
import { formatDate } from "@/lib/utils/text";
import { cn } from "@/lib/utils/cn";
import type { ReviewDTO } from "@/lib/types";

const COLORS = ["bg-[#d9482b]", "bg-[#24365a]", "bg-[#3f5a46]", "bg-[#a8741a]", "bg-[#6b3f5a]", "bg-[#2f5f6b]"];
const colorFor = (name: string) => COLORS[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % COLORS.length];

export function ReviewCard({ review, tone = "light" }: { review: ReviewDTO; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <figure className={cn("flex h-full flex-col rounded-2xl border p-6", dark ? "border-cream/10 bg-night-2" : "border-line bg-[#fffdf9]")}>
      <Stars value={review.rating} />
      {review.text ? (
        <blockquote className={cn("mt-4 flex-1 font-[family-name:var(--font-prose)] text-[1.05rem] leading-relaxed", dark ? "text-cream/85" : "text-ink-2")}>“{review.text}”</blockquote>
      ) : (
        <div className="flex-1" />
      )}
      <figcaption className="mt-5 flex items-center gap-3">
        <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-medium text-white", colorFor(review.name))}>
          {review.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 text-sm">
          <span className={cn("block font-medium", dark ? "text-cream" : "text-ink")}>{review.name}</span>
          <span className={cn("block truncate text-xs", dark ? "text-cream-muted" : "text-muted")}>
            {review.sessionTitle ? `${review.sessionTitle} · ` : ""}
            {formatDate(review.createdAt, "short")}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
